-- Internal operational mail only. Customer notifications remain unchanged.
-- No historical backfill: only events committed after this migration are queued.
BEGIN;
CREATE TABLE IF NOT EXISTS admin_email_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  recipient TEXT NOT NULL DEFAULT 'ino@rezervasyonyap.com.tr',
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  reply_to TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'failed')),
  attempts INT NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  first_attempt_at TIMESTAMPTZ,
  request_json JSONB,
  provider_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS admin_email_outbox_due ON admin_email_outbox(next_attempt_at) WHERE status = 'pending';

CREATE OR REPLACE FUNCTION queue_admin_email(p_key TEXT, p_type TEXT, p_subject TEXT, p_body TEXT, p_reply_to TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE sql AS $$
  INSERT INTO admin_email_outbox(event_key,event_type,subject,body,reply_to)
  VALUES(p_key,p_type,p_subject,p_body,p_reply_to) ON CONFLICT(event_key) DO NOTHING;
$$;

CREATE OR REPLACE FUNCTION admin_reservation_email() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE ev TEXT; title TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    ev := 'reservation_created'; title := 'Yeni rezervasyon';
  ELSIF OLD.status IS DISTINCT FROM NEW.status OR OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    ev := 'reservation_updated'; title := 'Rezervasyon / ödeme durumu değişti';
  ELSE RETURN NEW;
  END IF;
  PERFORM queue_admin_email(
    CASE WHEN TG_OP = 'INSERT' THEN ev || ':' || NEW.id ELSE ev || ':' || gen_random_uuid() END,
    ev, title || ' — ' || NEW.public_code,
    concat_ws(E'\n', 'Rezervasyon: ' || NEW.public_code, 'Kayıt: ' || NEW.id,
      'Misafir: ' || NEW.guest_name, 'E-posta: ' || NEW.guest_email, 'Telefon: ' || NEW.guest_phone,
      'Başlangıç: ' || NEW.starts_on, 'Bitiş: ' || NEW.ends_on,
      'Durum: ' || NEW.status, 'Ödeme durumu: ' || NEW.payment_status,
      'İlan: ' || NEW.listing_id), NEW.guest_email);
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_admin_reservation_email ON reservations;
CREATE TRIGGER trg_admin_reservation_email AFTER INSERT OR UPDATE OF status,payment_status ON reservations
FOR EACH ROW EXECUTE FUNCTION admin_reservation_email();

CREATE OR REPLACE FUNCTION admin_registration_email() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_guest THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NOT OLD.is_guest THEN RETURN NEW; END IF;
  END IF;
  PERFORM queue_admin_email('registration:' || NEW.id, 'registration', 'Yeni üye kaydı',
    concat_ws(E'\n', 'Ad: ' || NEW.display_name, 'E-posta: ' || NEW.email,
      'Telefon: ' || NEW.phone, 'Dil: ' || NEW.preferred_locale, 'Kullanıcı kaydı: ' || NEW.id), NEW.email);
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_admin_registration_email ON users;
CREATE TRIGGER trg_admin_registration_email AFTER INSERT OR UPDATE OF is_guest ON users
FOR EACH ROW EXECUTE FUNCTION admin_registration_email();

CREATE OR REPLACE FUNCTION admin_contact_email() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.role <> 'user' OR NOT EXISTS (
    SELECT 1 FROM chat_sessions s JOIN support_channels c ON c.id=s.channel_id
    WHERE s.id=NEW.session_id AND c.code='contact'
  ) THEN RETURN NEW; END IF;
  PERFORM queue_admin_email('contact:' || NEW.id, 'contact', 'İletişim formundan yeni mesaj',
    NEW.body || E'\n\nDestek oturumu: ' || NEW.session_id, NEW.meta_json->>'email');
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_admin_contact_email ON chat_messages;
CREATE TRIGGER trg_admin_contact_email AFTER INSERT ON chat_messages FOR EACH ROW EXECUTE FUNCTION admin_contact_email();

CREATE OR REPLACE FUNCTION admin_support_email() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  PERFORM queue_admin_email('ticket:' || NEW.id, 'support_ticket', 'Yeni destek talebi — ' || NEW.public_code,
    concat_ws(E'\n', 'Konu: ' || NEW.subject, 'Ad: ' || NEW.guest_name, 'E-posta: ' || NEW.guest_email,
      'Öncelik: ' || NEW.priority, 'Talep: ' || NEW.public_code), NEW.guest_email);
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_admin_support_email ON support_tickets;
CREATE TRIGGER trg_admin_support_email AFTER INSERT ON support_tickets FOR EACH ROW EXECUTE FUNCTION admin_support_email();

CREATE OR REPLACE FUNCTION admin_support_reply_email() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE ticket support_tickets%ROWTYPE;
BEGIN
  IF NEW.author_type <> 'customer' OR NEW.is_internal THEN RETURN NEW; END IF;
  SELECT * INTO ticket FROM support_tickets WHERE id=NEW.ticket_id;
  PERFORM queue_admin_email('ticket_message:' || NEW.id, 'support_reply', 'Destek talebine yeni mesaj — ' || ticket.public_code,
    'Talep: ' || ticket.public_code || E'\n\n' || NEW.body, ticket.guest_email);
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_admin_support_reply_email ON support_ticket_messages;
CREATE TRIGGER trg_admin_support_reply_email AFTER INSERT ON support_ticket_messages FOR EACH ROW EXECUTE FUNCTION admin_support_reply_email();

CREATE OR REPLACE FUNCTION admin_escalation_email() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  PERFORM queue_admin_email('escalation:' || NEW.id, 'escalation', 'Rezervasyon için yönetim müdahalesi gerekiyor',
    concat_ws(E'\n', 'Rezervasyon kaydı: ' || NEW.reservation_id, 'Neden: ' || NEW.reason, 'Durum: ' || NEW.status));
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_admin_escalation_email ON reservation_escalations;
CREATE TRIGGER trg_admin_escalation_email AFTER INSERT ON reservation_escalations FOR EACH ROW EXECUTE FUNCTION admin_escalation_email();
COMMIT;
