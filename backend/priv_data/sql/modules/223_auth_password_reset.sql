-- MODÜL: şifre sıfırlama token'ları
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token      TEXT PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  used_at    TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prt_user ON password_reset_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_prt_expires ON password_reset_tokens (expires_at);
