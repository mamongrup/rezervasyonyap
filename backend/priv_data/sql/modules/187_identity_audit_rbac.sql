-- MODÜL: kimlik / RBAC denetim günlüğü (G3.4–G3.5 ilk dilim)
-- Kullanıcı rol atamaları ve kritik kimlik işlemleri için basit audit tablosu.

CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users (id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations (id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  details_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log (user_id, created_at DESC);

