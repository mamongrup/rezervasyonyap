-- TC kimlik doğrulama — NVİ herkese açık SOAP kapalı; kullanıcı başvurusu + admin onayı

CREATE TABLE IF NOT EXISTS user_tc_verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  tc_kimlik_no TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  birth_year INT NOT NULL CHECK (birth_year >= 1900 AND birth_year <= 2100),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users (id) ON DELETE SET NULL,
  admin_note TEXT
);

CREATE INDEX IF NOT EXISTS idx_tc_verif_requests_user ON user_tc_verification_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_tc_verif_requests_status ON user_tc_verification_requests (status);

-- Aynı kullanıcıda yalnızca bir bekleyen başvuru
CREATE UNIQUE INDEX IF NOT EXISTS uq_tc_verif_one_pending_per_user
  ON user_tc_verification_requests (user_id)
  WHERE status = 'pending';

INSERT INTO permissions (code, description) VALUES
  ('admin.tc_verification.review', 'Yönetici: TC kimlik başvurusunu onayla / reddet')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code = 'admin.tc_verification.review'
WHERE r.code = 'admin'
ON CONFLICT DO NOTHING;
