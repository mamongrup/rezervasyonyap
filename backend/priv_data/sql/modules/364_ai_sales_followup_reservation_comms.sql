-- AI satış temsilcisi: lead hafızası, izinli seçenek takibi ve rezervasyon bildirim kuyruğu.

CREATE TABLE IF NOT EXISTS chat_sales_leads (
  session_id UUID PRIMARY KEY REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id), customer_name TEXT, email TEXT, phone TEXT,
  email_consent BOOLEAN NOT NULL DEFAULT FALSE, whatsapp_consent BOOLEAN NOT NULL DEFAULT FALSE,
  consent_at TIMESTAMPTZ, needs_json JSONB NOT NULL DEFAULT '{}', lead_score SMALLINT NOT NULL DEFAULT 0,
  recommended_listing_ids UUID[] NOT NULL DEFAULT '{}', summary TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN('open','qualified','followup_queued','converted','closed')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_sales_consent_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK(channel IN('email','whatsapp')), granted BOOLEAN NOT NULL,
  recipient TEXT, source TEXT NOT NULL DEFAULT 'explicit_customer_action', created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO ai_feature_profiles(code,provider_id,system_prompt,temperature) VALUES
('customer_understanding_agent',1,'Sen kıdemli seyahat satış analistisin. Görüşmeden destinasyon, tarih aralığı, kişi sayısı, çocuk, bütçe, kategori, konaklama/ürün tercihleri, zorunlu özellikler, itirazlar ve satın alma niyetini çıkar. Bilgi yoksa uydurma. Yalnızca JSON: {"summary":"","lead_score":0,"needs":{"destination":"","start_date":"","end_date":"","adults":0,"children":0,"budget_min":null,"budget_max":null,"category":"","must_haves":[]},"missing_questions":[],"handoff_required":false}.',0.15),
('product_match_agent',1,'Sen seyahat ürün eşleştirme uzmanısın. Yalnızca girdide verilen gerçek ve yayınlanmış katalog adaylarından müşterinin ihtiyacına en uygun en fazla 5 ürünü seç. Fiyat ve müsaitlik uydurma. Yalnızca JSON: {"recommendations":[{"listing_id":"UUID","reason":"","fit_score":0}],"message":"","warnings":[]}.',0.15),
('reservation_comms_agent',1,'Sen rezervasyon iletişim uzmanısın. Verilen gerçek rezervasyon durumundan kısa, güven veren ve eylem odaklı e-posta/WhatsApp metni oluştur. Kart veya kimlik bilgisi isteme; durum ve tutar uydurma. Yalnızca JSON: {"email_subject":"","email_body":"","whatsapp_body":"","requires_human":false}.',0.15)
ON CONFLICT(code) DO UPDATE SET system_prompt=EXCLUDED.system_prompt,temperature=EXCLUDED.temperature;

INSERT INTO ai_agents(code,feature_profile_code,display_name,description,mode,status,risk_level,schedule_json,scope_json,parent_code,org_role) VALUES
('customer_understanding_worker','customer_understanding_agent','Müşteri İhtiyaç Analisti','Görüşmeyi lead profiline ve ihtiyaç özetine dönüştürür.','auto_low_risk','active','medium','{"cadence":"realtime"}','{"unit":"customer_operations"}','customer_ops_director','worker'),
('product_match_worker','product_match_agent','Ürün Eşleştirme Uzmanı','Gerçek katalogdan müşteriye en uygun seçenekleri sıralar.','auto_low_risk','active','medium','{"cadence":"on_event"}','{"unit":"customer_operations"}','customer_ops_director','worker'),
('reservation_comms_worker','reservation_comms_agent','Rezervasyon İletişim Uzmanı','Rezervasyon durumlarını e-posta ve WhatsApp için hazırlar.','auto_low_risk','active','medium','{"cadence":"on_event"}','{"unit":"customer_operations"}','customer_ops_director','worker')
ON CONFLICT(code) DO UPDATE SET feature_profile_code=EXCLUDED.feature_profile_code,display_name=EXCLUDED.display_name,description=EXCLUDED.description,mode=EXCLUDED.mode,status=EXCLUDED.status,risk_level=EXCLUDED.risk_level,schedule_json=EXCLUDED.schedule_json,scope_json=EXCLUDED.scope_json,parent_code=EXCLUDED.parent_code,org_role=EXCLUDED.org_role,updated_at=now();

CREATE OR REPLACE FUNCTION ai_refresh_chat_sales_lead(p_session UUID) RETURNS INT LANGUAGE plpgsql AS $$
DECLARE uid UUID; tr TEXT; recs UUID[]; n INT;
BEGIN
  SELECT user_id INTO uid FROM chat_sessions WHERE id=p_session;
  SELECT string_agg(body,' ' ORDER BY id) INTO tr FROM chat_messages WHERE session_id=p_session AND role='user';
  SELECT array_agg(id),count(*) INTO recs,n FROM (
    SELECT l.id FROM listings l LEFT JOIN listing_translations lt ON lt.listing_id=l.id LEFT JOIN locales loc ON loc.id=lt.locale_id AND loc.code='tr'
    WHERE l.status='published'
    ORDER BY CASE WHEN coalesce(tr,'') ILIKE '%'||coalesce(l.location_name,'__nomatch__')||'%' THEN 0 WHEN coalesce(tr,'') ILIKE '%'||coalesce(lt.title,'__nomatch__')||'%' THEN 1 ELSE 2 END,
      l.review_avg DESC NULLS LAST,l.updated_at DESC LIMIT 5
  ) q;
  INSERT INTO chat_sales_leads(session_id,user_id,customer_name,email,phone,recommended_listing_ids,summary,lead_score,status)
  SELECT p_session,uid,u.display_name,u.email,u.phone,coalesce(recs,'{}'),left(coalesce(tr,''),1500),CASE WHEN length(coalesce(tr,''))>120 THEN 70 ELSE 40 END,'qualified'
  FROM (SELECT 1) x LEFT JOIN users u ON u.id=uid
  ON CONFLICT(session_id) DO UPDATE SET user_id=EXCLUDED.user_id,customer_name=coalesce(chat_sales_leads.customer_name,EXCLUDED.customer_name),email=coalesce(chat_sales_leads.email,EXCLUDED.email),phone=coalesce(chat_sales_leads.phone,EXCLUDED.phone),recommended_listing_ids=EXCLUDED.recommended_listing_ids,summary=EXCLUDED.summary,lead_score=EXCLUDED.lead_score,status='qualified',updated_at=now();
  RETURN coalesce(n,0);
END; $$;

CREATE OR REPLACE FUNCTION ai_queue_chat_sales_followup(p_session UUID) RETURNS INT LANGUAGE plpgsql AS $$
DECLARE l chat_sales_leads%ROWTYPE; payload JSONB; n INT:=0;
BEGIN
  PERFORM ai_refresh_chat_sales_lead(p_session); SELECT * INTO l FROM chat_sales_leads WHERE session_id=p_session;
  payload:=jsonb_build_object('event','chat_product_recommendations','session_id',p_session,'summary',l.summary,'listing_ids',to_jsonb(l.recommended_listing_ids));
  IF l.email_consent AND nullif(trim(l.email),'') IS NOT NULL THEN INSERT INTO notification_jobs(channel,payload_json,scheduled_at,status,recipient) VALUES('email',payload,now(),'pending',l.email); n:=n+1; END IF;
  IF l.whatsapp_consent AND nullif(trim(l.phone),'') IS NOT NULL THEN INSERT INTO notification_jobs(channel,payload_json,scheduled_at,status,recipient) VALUES('whatsapp',payload,now(),'pending',l.phone); n:=n+1; END IF;
  IF n>0 THEN UPDATE chat_sales_leads SET status='followup_queued',updated_at=now() WHERE session_id=p_session; END IF;
  RETURN n;
END; $$;

CREATE OR REPLACE FUNCTION ai_chat_close_sales_followup() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN IF OLD.closed_at IS NULL AND NEW.closed_at IS NOT NULL THEN PERFORM ai_refresh_chat_sales_lead(NEW.id); PERFORM ai_queue_chat_sales_followup(NEW.id); END IF; RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_ai_chat_close_sales_followup ON chat_sessions;
CREATE TRIGGER trg_ai_chat_close_sales_followup AFTER UPDATE OF closed_at ON chat_sessions FOR EACH ROW EXECUTE FUNCTION ai_chat_close_sales_followup();

CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_jobs_reservation_event_channel
ON notification_jobs(reservation_id,channel,(payload_json->>'event')) WHERE reservation_id IS NOT NULL AND payload_json ? 'event';

CREATE OR REPLACE FUNCTION ai_reservation_customer_notifications() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE ev TEXT; payload JSONB;
BEGIN
  ev:=CASE WHEN TG_OP='INSERT' THEN 'reservation_created' WHEN OLD.status IS DISTINCT FROM NEW.status THEN 'reservation_status_'||NEW.status WHEN OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN 'reservation_payment_'||NEW.payment_status ELSE NULL END;
  IF ev IS NULL THEN RETURN NEW; END IF;
  payload:=jsonb_build_object('event',ev,'reservation_id',NEW.id,'public_code',NEW.public_code,'status',NEW.status,'payment_status',NEW.payment_status,'starts_on',NEW.starts_on,'ends_on',NEW.ends_on,'listing_id',NEW.listing_id,'locale','tr');
  IF nullif(trim(NEW.guest_email),'') IS NOT NULL THEN INSERT INTO notification_jobs(channel,payload_json,scheduled_at,status,reservation_id,recipient) VALUES('email',payload,now(),'pending',NEW.id,NEW.guest_email) ON CONFLICT DO NOTHING; END IF;
  IF nullif(trim(coalesce(NEW.guest_phone,'')),'') IS NOT NULL THEN INSERT INTO notification_jobs(channel,payload_json,scheduled_at,status,reservation_id,recipient) VALUES('whatsapp',payload,now(),'pending',NEW.id,NEW.guest_phone) ON CONFLICT DO NOTHING; END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_ai_reservation_customer_notifications ON reservations;
CREATE TRIGGER trg_ai_reservation_customer_notifications AFTER INSERT OR UPDATE OF status,payment_status ON reservations FOR EACH ROW EXECUTE FUNCTION ai_reservation_customer_notifications();
