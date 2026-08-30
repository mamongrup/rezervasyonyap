-- Internal notifications only; no historical backfill or visitor text changes.
BEGIN;
CREATE TABLE IF NOT EXISTS admin_email_digest_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  bucket_end TIMESTAMPTZ NOT NULL DEFAULT (date_bin(interval '5 minutes', clock_timestamp(), timestamptz '2020-01-01 00:00:00+00') + interval '5 minutes'),
  processed_at TIMESTAMPTZ,
  outbox_id UUID REFERENCES admin_email_outbox(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS admin_email_digest_due ON admin_email_digest_events(bucket_end) WHERE processed_at IS NULL;

-- Snapshot event IDs, then enqueue and mark them in the same transaction.
-- Late commits get their own later batch; they can never be lost to bucket dedup.
CREATE OR REPLACE FUNCTION flush_admin_email_digests() RETURNS INT LANGUAGE plpgsql AS $$
DECLARE batch RECORD; mail_id UUID; total INT := 0; details TEXT;
BEGIN
  IF NOT pg_try_advisory_xact_lock(437,1) THEN RETURN 0; END IF;
  FOR batch IN
    SELECT event_type,title,array_agg(id ORDER BY created_at,id) AS ids,count(*) AS n
    FROM admin_email_digest_events WHERE processed_at IS NULL AND bucket_end<=now()
    GROUP BY event_type,title
  LOOP
    SELECT string_agg(left(body,1000), E'\n\n' ORDER BY created_at,id) INTO details
    FROM (SELECT body,created_at,id FROM admin_email_digest_events WHERE id=ANY(batch.ids) ORDER BY created_at,id LIMIT 100) sample;
    INSERT INTO admin_email_outbox(event_key,event_type,subject,body)
    VALUES ('digest:' || gen_random_uuid(),batch.event_type,
      batch.title || ' — ' || batch.n || ' olay',
      'Toplam olay: ' || batch.n || E'\n\n' || details ||
      CASE WHEN batch.n>100 THEN E'\n\nİlk 100 olay gösterildi. Tüm olaylar admin_email_digest_events tablosunda kayıtlıdır.' ELSE '' END)
    RETURNING id INTO mail_id;
    UPDATE admin_email_digest_events SET processed_at=now(),outbox_id=mail_id WHERE id=ANY(batch.ids);
    total := total+1;
  END LOOP;
  RETURN total;
END; $$;

-- Explicit per-table field allowlists. Never serialize entire rows into mail.
-- args: event type, Turkish title, JSON field->label map, allowed statuses, mode.
CREATE OR REPLACE FUNCTION admin_important_event_email() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE data JSONB; previous JSONB; field RECORD; message TEXT; event_title TEXT;
BEGIN
  IF TG_OP='DELETE' THEN data:=to_jsonb(OLD); ELSE data:=to_jsonb(NEW); END IF;
  IF TG_OP='UPDATE' THEN
    previous:=to_jsonb(OLD);
    IF previous->>'status' IS NOT DISTINCT FROM data->>'status' THEN RETURN NEW; END IF;
  END IF;
  IF TG_ARGV[3]<>'*' AND NOT coalesce(data->>'status'=ANY(string_to_array(TG_ARGV[3],',')),false) THEN RETURN NEW; END IF;
  event_title:=TG_ARGV[1] || CASE TG_OP WHEN 'INSERT' THEN ' — yeni kayıt' WHEN 'DELETE' THEN ' — silindi' ELSE ' — durum değişti' END;
  message:='Kayıt: ' || coalesce(data->>'id','') || E'\n';
  IF TG_OP='UPDATE' THEN message:=message || 'Önceki durum: ' || coalesce(previous->>'status','') || E'\n'; END IF;
  FOR field IN SELECT key,value FROM jsonb_each_text(TG_ARGV[2]::jsonb) ORDER BY key LOOP
    IF nullif(data->>field.key,'') IS NOT NULL THEN
      message:=message || field.value || ': ' || left(data->>field.key,2000) || E'\n';
    END IF;
  END LOOP;
  IF TG_ARGV[4]='digest' THEN
    INSERT INTO admin_email_digest_events(event_type,title,body) VALUES(TG_ARGV[0],event_title,message);
  ELSE
    PERFORM queue_admin_email(TG_ARGV[0] || ':' || gen_random_uuid(),TG_ARGV[0],event_title,message);
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END; $$;

DROP TRIGGER IF EXISTS trg_admin_listing_events ON listings;
CREATE TRIGGER trg_admin_listing_events AFTER INSERT OR DELETE OR UPDATE OF status ON listings FOR EACH ROW
EXECUTE FUNCTION admin_important_event_email('listing','İlan bildirimi','{"slug":"İlan","status":"Durum","organization_id":"Kurum","category_id":"Kategori"}','*','digest');

DROP TRIGGER IF EXISTS trg_admin_supplier_application ON supplier_applications;
CREATE TRIGGER trg_admin_supplier_application AFTER INSERT OR UPDATE OF status ON supplier_applications FOR EACH ROW
EXECUTE FUNCTION admin_important_event_email('supplier_application','Tedarikçi başvurusu','{"user_id":"Üye","business_name":"İşletme","category_code":"Kategori","status":"Durum"}','submitted,under_review,approved,rejected','immediate');

DROP TRIGGER IF EXISTS trg_admin_payment ON payments;
CREATE TRIGGER trg_admin_payment AFTER INSERT OR UPDATE OF status ON payments FOR EACH ROW
EXECUTE FUNCTION admin_important_event_email('payment','Ödeme / iade bildirimi','{"reservation_id":"Rezervasyon","amount":"Tutar","currency_code":"Para birimi","status":"Durum"}','authorized,captured,failed,refunded','immediate');

DROP TRIGGER IF EXISTS trg_admin_transfer ON supplier_transfers;
CREATE TRIGGER trg_admin_transfer AFTER INSERT OR UPDATE OF status ON supplier_transfers FOR EACH ROW
EXECUTE FUNCTION admin_important_event_email('supplier_transfer','Para transferi / iade işlemi','{"reservation_id":"Rezervasyon","transfer_type":"İşlem türü","amount":"Tutar","currency_code":"Para birimi","status":"Durum"}','*','immediate');

DROP TRIGGER IF EXISTS trg_admin_review ON reviews;
CREATE TRIGGER trg_admin_review AFTER INSERT OR UPDATE OF status ON reviews FOR EACH ROW
EXECUTE FUNCTION admin_important_event_email('review','Müşteri yorumu','{"entity_id":"İlgili kayıt","rating":"Puan","title":"Başlık","body":"Yorum","status":"Durum"}','*','immediate');

DROP TRIGGER IF EXISTS trg_admin_listing_report ON listing_reports;
CREATE TRIGGER trg_admin_listing_report AFTER INSERT OR UPDATE OF status ON listing_reports FOR EACH ROW
EXECUTE FUNCTION admin_important_event_email('listing_report','İlan şikâyeti','{"listing_id":"İlan","reason_code":"Neden","message":"Mesaj","status":"Durum"}','*','immediate');

DROP TRIGGER IF EXISTS trg_admin_organization ON organizations;
CREATE TRIGGER trg_admin_organization AFTER INSERT ON organizations FOR EACH ROW
EXECUTE FUNCTION admin_important_event_email('organization','Yeni kurum / acente / tedarikçi','{"name":"Kurum adı","org_type":"Kurum türü","slug":"Kod"}','*','immediate');

DROP TRIGGER IF EXISTS trg_admin_agency_invoice ON agency_invoices;
CREATE TRIGGER trg_admin_agency_invoice AFTER INSERT OR UPDATE OF status ON agency_invoices FOR EACH ROW
EXECUTE FUNCTION admin_important_event_email('agency_invoice','Acente faturası','{"invoice_number":"Fatura no","agency_organization_id":"Acente","gross_total":"Tutar","currency_code":"Para birimi","status":"Durum"}','issued,cancelled','immediate');
DROP TRIGGER IF EXISTS trg_admin_supplier_invoice ON supplier_invoices;
CREATE TRIGGER trg_admin_supplier_invoice AFTER INSERT OR UPDATE OF status ON supplier_invoices FOR EACH ROW
EXECUTE FUNCTION admin_important_event_email('supplier_invoice','Tedarikçi faturası','{"invoice_number":"Fatura no","supplier_organization_id":"Tedarikçi","gross_total":"Tutar","currency_code":"Para birimi","status":"Durum"}','issued,cancelled','immediate');

DROP TRIGGER IF EXISTS trg_admin_provider_sync ON provider_sync_jobs;
CREATE TRIGGER trg_admin_provider_sync AFTER INSERT OR UPDATE OF status ON provider_sync_jobs FOR EACH ROW
EXECUTE FUNCTION admin_important_event_email('provider_sync','Sağlayıcı aktarım sonucu','{"provider":"Sağlayıcı","status":"Durum","progress":"İşlenen","total":"Toplam"}','done,error','digest');
DROP TRIGGER IF EXISTS trg_admin_integration_failure ON integration_sync_logs;
CREATE TRIGGER trg_admin_integration_failure AFTER INSERT OR UPDATE OF status ON integration_sync_logs FOR EACH ROW
EXECUTE FUNCTION admin_important_event_email('integration_failure','Entegrasyon hatası','{"integration_account_id":"Entegrasyon","operation":"İşlem","status":"Durum"}','failed,error','digest');
DROP TRIGGER IF EXISTS trg_admin_social_failure ON social_share_jobs;
CREATE TRIGGER trg_admin_social_failure AFTER INSERT OR UPDATE OF status ON social_share_jobs FOR EACH ROW
EXECUTE FUNCTION admin_important_event_email('social_failure','Sosyal paylaşım hatası','{"entity_id":"İlgili kayıt","entity_type":"Kayıt türü","status":"Durum"}','failed','digest');
DROP TRIGGER IF EXISTS trg_admin_ai_failure ON ai_jobs;
CREATE TRIGGER trg_admin_ai_failure AFTER INSERT OR UPDATE OF status ON ai_jobs FOR EACH ROW
EXECUTE FUNCTION admin_important_event_email('ai_failure','Yapay zekâ işlem hatası','{"profile_code":"İşlem profili","status":"Durum"}','failed','digest');
DROP TRIGGER IF EXISTS trg_admin_notification_failure ON notification_jobs;
CREATE TRIGGER trg_admin_notification_failure AFTER INSERT OR UPDATE OF status ON notification_jobs FOR EACH ROW
EXECUTE FUNCTION admin_important_event_email('notification_failure','Müşteri bildirimi gönderilemedi','{"channel":"Kanal","reservation_id":"Rezervasyon","status":"Durum"}','failed','digest');

CREATE OR REPLACE FUNCTION admin_privileged_role_email() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE before_role TEXT; after_role TEXT; data JSONB;
BEGIN
  IF TG_OP<>'INSERT' THEN SELECT code INTO before_role FROM roles WHERE id=OLD.role_id; END IF;
  IF TG_OP<>'DELETE' THEN SELECT code INTO after_role FROM roles WHERE id=NEW.role_id; END IF;
  IF TG_OP='UPDATE' AND NEW IS NOT DISTINCT FROM OLD THEN RETURN NEW; END IF;
  IF coalesce(before_role IN ('admin','staff'),false) OR coalesce(after_role IN ('admin','staff'),false) THEN
    IF TG_OP='DELETE' THEN data:=to_jsonb(OLD); ELSE data:=to_jsonb(NEW); END IF;
    PERFORM queue_admin_email('privileged_role:' || gen_random_uuid(),'privileged_role','Yönetim / personel yetkisi değişti',
      concat_ws(E'\n','Üye: ' || (data->>'user_id'),'Kurum: ' || (data->>'organization_id'),
        'Önceki rol: ' || coalesce(before_role,'yok'),'Yeni rol: ' || coalesce(after_role,'yok')));
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END; $$;
DROP TRIGGER IF EXISTS trg_admin_privileged_role ON user_roles;
CREATE TRIGGER trg_admin_privileged_role AFTER INSERT OR UPDATE OR DELETE ON user_roles FOR EACH ROW EXECUTE FUNCTION admin_privileged_role_email();
COMMIT;
