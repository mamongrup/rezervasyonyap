-- Otomatik ilan kabulü + takvim/fiyat AI yönetişimi.

CREATE TABLE IF NOT EXISTS ai_listing_intakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES organizations(id),
  category_code TEXT NOT NULL, source_type TEXT NOT NULL DEFAULT 'manual_ai', source_ref TEXT,
  payload_json JSONB NOT NULL, status TEXT NOT NULL DEFAULT 'received' CHECK(status IN('received','validated','draft_created','needs_review','failed')),
  listing_id UUID REFERENCES listings(id), validation_json JSONB NOT NULL DEFAULT '{}', error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_listing_pricing_policies (
  listing_id UUID PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,
  floor_price NUMERIC, ceiling_price NUMERIC, max_daily_change_percent NUMERIC NOT NULL DEFAULT 20,
  auto_apply_within_percent NUMERIC NOT NULL DEFAULT 5, minimum_margin_percent NUMERIC NOT NULL DEFAULT 10,
  currency_code CHAR(3) NOT NULL DEFAULT 'TRY', updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK(floor_price IS NULL OR ceiling_price IS NULL OR floor_price<=ceiling_price)
);

CREATE TABLE IF NOT EXISTS ai_calendar_price_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL, target_key TEXT NOT NULL, previous_json JSONB NOT NULL DEFAULT '{}', current_json JSONB NOT NULL DEFAULT '{}',
  source TEXT NOT NULL DEFAULT 'user', risk_level TEXT NOT NULL DEFAULT 'low', anomaly_json JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_calendar_price_audit_listing ON ai_calendar_price_audit(listing_id,created_at DESC);

CREATE OR REPLACE FUNCTION ai_price_policy_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE p ai_listing_pricing_policies%ROWTYPE;
BEGIN
  IF current_setting('app.ai_apply',true)='1' AND NEW.price_override IS NOT NULL THEN
    SELECT * INTO p FROM ai_listing_pricing_policies WHERE listing_id=NEW.listing_id;
    IF (p.floor_price IS NOT NULL AND NEW.price_override<p.floor_price) OR (p.ceiling_price IS NOT NULL AND NEW.price_override>p.ceiling_price) THEN
      RAISE EXCEPTION 'ai_price_outside_policy';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_ai_price_policy_guard ON listing_availability_calendar;
CREATE TRIGGER trg_ai_price_policy_guard BEFORE INSERT OR UPDATE OF price_override ON listing_availability_calendar FOR EACH ROW EXECUTE FUNCTION ai_price_policy_guard();

INSERT INTO ai_feature_profiles(code,provider_id,system_prompt,temperature) VALUES
('listing_intake_validator',1,'Sen seyahat pazaryeri kıdemli ilan kabul uzmanısın. Girdiyi kategori, kimlik, konum, iletişim, açıklama, görsel, fiyat, takvim, lisans ve politika açısından doğrula. Bilgi uydurma. Yalnızca JSON: {"status":"ready|needs_data|blocked","category_code":"","normalized":{"title":"","slug":"","currency_code":"TRY","description":""},"missing":[],"risks":[],"questions":[]}.',0.15),
('availability_guard_agent',1,'Sen rezervasyon takvimi bütünlük uzmanısın. Rezervasyon, iCal, yarım gün giriş-çıkış, bakım blokları ve manuel değişiklikleri karşılaştır. Kesin rezervasyon verisini asla geçersiz kılma. Yalnızca JSON: {"status":"safe|conflict|needs_review","conflicts":[],"safe_changes":[],"blocked_changes":[],"reason":""}.',0.10),
('revenue_pricing_agent',1,'Sen seyahat gelir yönetimi uzmanısın. Yalnızca verilen fiyat, doluluk, maliyet, komisyon, sezon ve politika sınırlarını kullan. Fiyat uydurma. Taban/tavan ve günlük değişim sınırını aşma. Yalnızca JSON: {"status":"no_change|recommendation|needs_review","recommendations":[{"from":"YYYY-MM-DD","to":"YYYY-MM-DD","price":0,"reason":"","confidence":0}],"risks":[],"requires_approval":true}.',0.15)
ON CONFLICT(code) DO UPDATE SET system_prompt=EXCLUDED.system_prompt,temperature=EXCLUDED.temperature;

INSERT INTO ai_agents(code,feature_profile_code,display_name,description,mode,status,risk_level,schedule_json,scope_json,parent_code,org_role) VALUES
('listing_intake_worker','listing_intake_validator','Otomatik İlan Kabul Uzmanı','Yeni ilan verisini doğrular ve güvenli taslak oluşturma akışına sokar.','draft_only','active','medium','{"cadence":"on_event"}','{"unit":"listing_operations"}','listing_ops_director','worker'),
('availability_guard_worker','availability_guard_agent','Takvim Bütünlük Uzmanı','Rezervasyon, iCal ve manuel takvim değişikliklerinde çakışmayı önler.','auto_low_risk','active','high','{"cadence":"on_event"}','{"unit":"listing_operations","never_override_booking":true}','listing_ops_director','worker'),
('revenue_pricing_worker','revenue_pricing_agent','Gelir ve Fiyat Uzmanı','Doluluk ve politika sınırları içinde fiyat önerisi üretir.','draft_only','active','high','{"cadence":"daily"}','{"unit":"revenue_operations","approval_required":true}','revenue_ops_director','worker')
ON CONFLICT(code) DO UPDATE SET feature_profile_code=EXCLUDED.feature_profile_code,display_name=EXCLUDED.display_name,description=EXCLUDED.description,mode=EXCLUDED.mode,status=EXCLUDED.status,risk_level=EXCLUDED.risk_level,schedule_json=EXCLUDED.schedule_json,scope_json=EXCLUDED.scope_json,parent_code=EXCLUDED.parent_code,org_role=EXCLUDED.org_role,updated_at=now();

INSERT INTO ai_workflow_definitions(code,display_name,description,entity_types,stages_json) VALUES
('listing_calendar_pricing','Takvim ve Fiyat Kontrolü','Takvim bütünlüğü ve fiyat fırsat/risk analizi.',ARRAY['listing_calendar'], '[{"code":"availability_guard","agent":"availability_guard_worker","approval":false},{"code":"pricing_analysis","agent":"revenue_pricing_worker","approval":false},{"code":"pricing_approval","agent":"supervisor","approval":true}]')
ON CONFLICT(code) DO UPDATE SET display_name=EXCLUDED.display_name,description=EXCLUDED.description,entity_types=EXCLUDED.entity_types,stages_json=EXCLUDED.stages_json,updated_at=now();

CREATE OR REPLACE FUNCTION ai_submit_listing_intake(p_org UUID,p_category TEXT,p_payload JSONB,p_source TEXT DEFAULT 'manual_ai',p_ref TEXT DEFAULT NULL) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE v_intake UUID; v_listing UUID; v_cat SMALLINT; v_title TEXT; v_slug TEXT; v_currency CHAR(3); v_tr SMALLINT;
BEGIN
  SELECT id INTO v_cat FROM product_categories WHERE lower(code)=lower(p_category) AND is_active LIMIT 1;
  v_title:=nullif(trim(p_payload->>'title'),'');
  IF v_cat IS NULL OR v_title IS NULL THEN
    INSERT INTO ai_listing_intakes(organization_id,category_code,source_type,source_ref,payload_json,status,validation_json)
    VALUES(p_org,p_category,p_source,p_ref,p_payload,'needs_review',jsonb_build_object('missing',ARRAY[CASE WHEN v_cat IS NULL THEN 'valid_category' ELSE NULL END,CASE WHEN v_title IS NULL THEN 'title' ELSE NULL END])) RETURNING id INTO v_intake;
    RETURN v_intake;
  END IF;
  v_slug:=lower(regexp_replace(coalesce(nullif(p_payload->>'slug',''),v_title),'[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ]+','-','g'))||'-'||substr(gen_random_uuid()::text,1,8);
  v_currency:=upper(coalesce(nullif(p_payload->>'currency_code',''),'TRY'))::char(3);
  SELECT id INTO v_tr FROM locales WHERE lower(code)='tr' LIMIT 1;
  INSERT INTO ai_listing_intakes(organization_id,category_code,source_type,source_ref,payload_json,status,validation_json) VALUES(p_org,p_category,p_source,p_ref,p_payload,'validated','{"status":"minimum_valid"}') RETURNING id INTO v_intake;
  INSERT INTO listings(organization_id,category_id,slug,status,currency_code,listing_source,extensions_json,location_name,featured_image_url)
  VALUES(p_org,v_cat,v_slug,'draft',v_currency,'manual',coalesce(p_payload->'extensions','{}'),nullif(p_payload->>'location_name',''),nullif(p_payload->>'featured_image_url','')) RETURNING id INTO v_listing;
  INSERT INTO listing_translations(listing_id,locale_id,title,description) VALUES(v_listing,v_tr,v_title,nullif(p_payload->>'description',''));
  UPDATE ai_listing_intakes SET status='draft_created',listing_id=v_listing,updated_at=now() WHERE id=v_intake;
  RETURN v_intake;
END; $$;

CREATE OR REPLACE FUNCTION ai_enqueue_calendar_pricing(p_listing UUID,p_payload JSONB) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE v_id UUID;
BEGIN
  SELECT id INTO v_id FROM ai_work_items WHERE workflow_code='listing_calendar_pricing' AND entity_id=p_listing::text AND status IN('queued','running','awaiting_approval') LIMIT 1;
  IF v_id IS NOT NULL THEN UPDATE ai_work_items SET input_json=input_json||p_payload,priority=greatest(priority,75),updated_at=now() WHERE id=v_id; RETURN v_id; END IF;
  INSERT INTO ai_work_items(workflow_code,entity_type,entity_id,priority,current_stage,input_json) VALUES('listing_calendar_pricing','listing_calendar',p_listing::text,75,'availability_guard',p_payload) RETURNING id INTO v_id;
  INSERT INTO ai_work_item_steps(work_item_id,stage_code,stage_order,agent_code,status,requires_approval) VALUES
  (v_id,'availability_guard',10,'availability_guard_worker','queued',false),(v_id,'pricing_analysis',20,'revenue_pricing_worker','waiting',false),(v_id,'pricing_approval',30,'supervisor','waiting',true);
  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION ai_calendar_price_change() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE lid UUID; oldj JSONB:=CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) ELSE '{}' END; newj JSONB:=to_jsonb(NEW); risk TEXT:='low'; anomaly JSONB:='{}'; pol ai_listing_pricing_policies%ROWTYPE;
BEGIN
  lid:=NEW.listing_id;
  IF TG_TABLE_NAME='listing_availability_calendar' AND NEW.is_available AND EXISTS(SELECT 1 FROM reservations r WHERE r.listing_id=lid AND r.status NOT IN('cancelled','completed') AND NEW.day>=r.starts_on AND NEW.day<r.ends_on) THEN
    RAISE EXCEPTION 'availability_conflicts_with_reservation';
  END IF;
  SELECT * INTO pol FROM ai_listing_pricing_policies WHERE listing_id=lid;
  IF NEW.price_override IS NOT NULL AND ((pol.floor_price IS NOT NULL AND NEW.price_override<pol.floor_price) OR (pol.ceiling_price IS NOT NULL AND NEW.price_override>pol.ceiling_price)) THEN risk:='high'; anomaly:=jsonb_build_object('type','price_outside_policy','price',NEW.price_override,'floor',pol.floor_price,'ceiling',pol.ceiling_price); END IF;
  INSERT INTO ai_calendar_price_audit(listing_id,change_type,target_key,previous_json,current_json,source,risk_level,anomaly_json) VALUES(lid,TG_TABLE_NAME,coalesce(newj->>'day',newj->>'id'),oldj,newj,CASE WHEN current_setting('app.ai_apply',true)='1' THEN 'ai' ELSE 'user' END,risk,anomaly);
  IF current_setting('app.ai_apply',true) IS DISTINCT FROM '1' THEN
    PERFORM ai_enqueue_calendar_pricing(lid,jsonb_build_object('change_type',TG_TABLE_NAME,'previous',oldj,'current',newj,'policy',to_jsonb(pol),'anomaly',anomaly));
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_ai_listing_calendar_change ON listing_availability_calendar;
CREATE TRIGGER trg_ai_listing_calendar_change AFTER INSERT OR UPDATE OF is_available,am_available,pm_available,price_override,day_status ON listing_availability_calendar FOR EACH ROW EXECUTE FUNCTION ai_calendar_price_change();

CREATE OR REPLACE FUNCTION ai_price_rule_change() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE oldj JSONB:=CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) ELSE '{}' END; newj JSONB:=to_jsonb(NEW);
BEGIN
  INSERT INTO ai_calendar_price_audit(listing_id,change_type,target_key,previous_json,current_json,source,risk_level)
  VALUES(NEW.listing_id,'listing_price_rules',NEW.id::text,oldj,newj,CASE WHEN current_setting('app.ai_apply',true)='1' THEN 'ai' ELSE 'user' END,'medium');
  IF current_setting('app.ai_apply',true) IS DISTINCT FROM '1' THEN
    PERFORM ai_enqueue_calendar_pricing(NEW.listing_id,jsonb_build_object('change_type','listing_price_rules','previous',oldj,'current',newj));
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_ai_listing_price_rule_change ON listing_price_rules;
CREATE TRIGGER trg_ai_listing_price_rule_change AFTER INSERT OR UPDATE OF rule_json,valid_from,valid_to ON listing_price_rules FOR EACH ROW EXECUTE FUNCTION ai_price_rule_change();

CREATE OR REPLACE FUNCTION ai_apply_pricing_recommendations(p_work_item UUID) RETURNS INT LANGUAGE plpgsql AS $$
DECLARE a RECORD; d JSONB; x JSONB; lid UUID; p ai_listing_pricing_policies%ROWTYPE; price NUMERIC; vf DATE; vt DATE; n INT:=0;
BEGIN
  SELECT entity_id::uuid INTO lid FROM ai_work_items WHERE id=p_work_item AND workflow_code='listing_calendar_pricing';
  IF lid IS NULL THEN RETURN 0; END IF;
  SELECT * INTO p FROM ai_listing_pricing_policies WHERE listing_id=lid;
  PERFORM set_config('app.ai_apply','1',true);
  FOR a IN SELECT * FROM ai_content_artifacts WHERE work_item_id=p_work_item AND stage_code='pricing_analysis' AND status IN('draft','approved') LOOP
    d:=ai_artifact_payload(a.data_json);
    IF jsonb_typeof(d->'recommendations')='array' THEN
      FOR x IN SELECT * FROM jsonb_array_elements(d->'recommendations') LOOP
        price:=nullif(x->>'price','')::numeric; vf:=nullif(x->>'from','')::date; vt:=nullif(x->>'to','')::date;
        IF price>0 AND vf IS NOT NULL AND vt IS NOT NULL AND vt>=vf AND vt<=vf+365
          AND (p.floor_price IS NULL OR price>=p.floor_price) AND (p.ceiling_price IS NULL OR price<=p.ceiling_price) THEN
          INSERT INTO listing_price_rules(listing_id,rule_json,valid_from,valid_to)
          VALUES(lid,jsonb_build_object('nightly',price,'source','ai_revenue_agent','confidence',x->'confidence','reason',x->>'reason'),vf,vt);
          n:=n+1;
        END IF;
      END LOOP;
    END IF;
    UPDATE ai_content_artifacts SET status=CASE WHEN n>0 THEN 'applied' ELSE 'invalid' END,applied_at=CASE WHEN n>0 THEN now() ELSE applied_at END,error=CASE WHEN n=0 THEN 'no_policy_safe_recommendation' ELSE NULL END,updated_at=now() WHERE id=a.id;
  END LOOP;
  RETURN n;
END; $$;

CREATE OR REPLACE FUNCTION ai_apply_pricing_on_approval() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.stage_code='pricing_approval' AND NEW.status='approved' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM ai_apply_pricing_recommendations(NEW.work_item_id);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_ai_apply_pricing_on_approval ON ai_work_item_steps;
CREATE TRIGGER trg_ai_apply_pricing_on_approval AFTER UPDATE OF status ON ai_work_item_steps FOR EACH ROW EXECUTE FUNCTION ai_apply_pricing_on_approval();
