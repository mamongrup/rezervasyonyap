-- MODÜL: NetGSM SMS, e-posta şablonları, tetikleyiciler
CREATE TABLE IF NOT EXISTS sms_providers (
  id SMALLSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  config_secret_ref TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE
);

INSERT INTO sms_providers (code, config_secret_ref, is_active) VALUES
  ('netgsm', 'vault:netgsm', FALSE)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  subject_key TEXT NOT NULL,
  body_key TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notification_triggers (
  id SMALLSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT
);

INSERT INTO notification_triggers (code, description) VALUES
  ('register', 'Üye kaydı'),
  ('reservation_confirmed', 'Rezervasyon sonrası'),
  ('cart_abandoned', 'Sepette ürün'),
  ('chat_followup', 'Sohbet sonrası takip'),
  ('ai_trip_followup', 'AI seyahat önerisi 3 gün sonra')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS notification_jobs (
  id BIGSERIAL PRIMARY KEY,
  trigger_id SMALLINT REFERENCES notification_triggers (id),
  user_id UUID REFERENCES users (id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'email', 'whatsapp')),
  payload_json JSONB NOT NULL DEFAULT '{}',
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_notification_jobs_due ON notification_jobs (scheduled_at, status);
