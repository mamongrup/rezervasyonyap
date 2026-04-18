-- MODÜL: kapsamlı destek — ticket, SLA, makrolar, bilgi bankası, chat ile köprü
CREATE TABLE support_departments (
  id SMALLSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name_key TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

INSERT INTO support_departments (code, name_key, sort_order) VALUES
  ('reservation', 'support.dept.reservation', 10),
  ('payment', 'support.dept.payment', 20),
  ('technical', 'support.dept.technical', 30),
  ('supplier', 'support.dept.supplier', 40),
  ('agency', 'support.dept.agency', 50),
  ('general', 'support.dept.general', 90);

CREATE TABLE support_sla_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id SMALLINT REFERENCES support_departments (id) ON DELETE CASCADE,
  priority TEXT NOT NULL,
  first_response_minutes INT NOT NULL,
  resolve_minutes INT NOT NULL
);

CREATE TABLE support_macros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  department_id SMALLINT REFERENCES support_departments (id) ON DELETE SET NULL
);

CREATE TABLE support_kb_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  department_id SMALLINT REFERENCES support_departments (id) ON DELETE SET NULL,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE support_kb_article_translations (
  article_id UUID NOT NULL REFERENCES support_kb_articles (id) ON DELETE CASCADE,
  locale_id SMALLINT NOT NULL REFERENCES locales (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  PRIMARY KEY (article_id, locale_id)
);

CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_code TEXT NOT NULL UNIQUE DEFAULT ('TKT-' || REPLACE(gen_random_uuid()::text, '-', '')),
  department_id SMALLINT NOT NULL REFERENCES support_departments (id),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
    'open', 'pending_customer', 'pending_agent', 'resolved', 'closed'
  )),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  subject TEXT NOT NULL,
  user_id UUID REFERENCES users (id) ON DELETE SET NULL,
  guest_email TEXT,
  guest_name TEXT,
  assigned_to UUID REFERENCES users (id) ON DELETE SET NULL,
  chat_session_id UUID REFERENCES chat_sessions (id) ON DELETE SET NULL,
  related_reservation_id UUID REFERENCES reservations (id) ON DELETE SET NULL,
  related_listing_id UUID REFERENCES listings (id) ON DELETE SET NULL,
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  satisfaction_score SMALLINT CHECK (satisfaction_score IS NULL OR (satisfaction_score >= 1 AND satisfaction_score <= 5)),
  meta_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (user_id IS NOT NULL OR guest_email IS NOT NULL)
);

CREATE INDEX idx_support_tickets_status ON support_tickets (status, created_at DESC);
CREATE INDEX idx_support_tickets_assignee ON support_tickets (assigned_to);
CREATE INDEX idx_support_tickets_guest_email ON support_tickets (guest_email);
CREATE INDEX idx_support_tickets_user ON support_tickets (user_id);

CREATE TABLE support_ticket_watchers (
  ticket_id UUID NOT NULL REFERENCES support_tickets (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  PRIMARY KEY (ticket_id, user_id)
);

CREATE TABLE support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets (id) ON DELETE CASCADE,
  author_type TEXT NOT NULL CHECK (author_type IN ('customer', 'agent', 'system', 'ai')),
  author_user_id UUID REFERENCES users (id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT FALSE,
  meta_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_messages_ticket ON support_ticket_messages (ticket_id, created_at);

CREATE TABLE support_ticket_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES support_ticket_messages (id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES support_tickets (id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL,
  original_filename TEXT,
  mime_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE support_ticket_events (
  id BIGSERIAL PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES support_tickets (id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor_user_id UUID REFERENCES users (id) ON DELETE SET NULL,
  payload_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_events_ticket ON support_ticket_events (ticket_id, created_at DESC);
