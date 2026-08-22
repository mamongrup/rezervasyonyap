-- MODÜL: canlı destek, WhatsApp tıkla, chatbot, AI müşteri temsilcisi
CREATE TABLE IF NOT EXISTS support_channels (
  id SMALLSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  config_json JSONB NOT NULL DEFAULT '{}'
);

INSERT INTO support_channels (code, config_json) VALUES
  ('whatsapp', '{}'),
  ('phone', '{}'),
  ('live_chat', '{}')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users (id) ON DELETE SET NULL,
  channel_id SMALLINT NOT NULL REFERENCES support_channels (id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  ai_mode TEXT NOT NULL DEFAULT 'off' CHECK (ai_mode IN ('off', 'sales', 'cross_sell', 'concierge'))
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES chat_sessions (id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'agent', 'system')),
  body TEXT NOT NULL,
  meta_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_followup_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions (id) ON DELETE CASCADE,
  step SMALLINT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  payload_json JSONB NOT NULL DEFAULT '{}'
);
