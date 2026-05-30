BEGIN;

-- Eksik izinleri ekle
INSERT INTO permissions (code) VALUES
  ('admin.integrations.read'),
  ('admin.integrations.write'),
  ('admin.social.read'),
  ('admin.social.write')
ON CONFLICT (code) DO NOTHING;

-- Admin rolüne (id=5) tüm eksik izinleri ata
INSERT INTO role_permissions (role_id, permission_id)
SELECT 5, p.id FROM permissions p
WHERE p.code IN (
  'admin.audit.read',
  'admin.permissions.read',
  'admin.permissions.write',
  'admin.roles.read',
  'admin.users.read',
  'admin.users.write_roles',
  'admin.integrations.read',
  'admin.integrations.write',
  'admin.social.read',
  'admin.social.write'
)
ON CONFLICT DO NOTHING;

COMMIT;
