-- MODÜL: platform kiracısı + kullanıcı oturumları (liste 3 — üyelik temeli)

INSERT INTO organizations (id, slug, name, org_type)
VALUES (
    'a0000000-0000-4000-8000-000000000001',
    'platform',
    'Platform',
    'platform'
  )
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS user_sessions (
  token TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions (user_id);

CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions (expires_at);
