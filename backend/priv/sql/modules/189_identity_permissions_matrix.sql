-- MODÜL: ince taneli izinler (rol × izin matrisi; G3.5 genişletme)
-- Önkoşul: 020_identity_membership, 187_identity_audit_rbac

CREATE TABLE IF NOT EXISTS permissions (
  id SMALLSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id SMALLINT NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
  permission_id SMALLINT NOT NULL REFERENCES permissions (id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions (permission_id);

INSERT INTO permissions (code, description) VALUES
  ('admin.users.read', 'Yönetici: kullanıcı listesi'),
  ('admin.roles.read', 'Yönetici: kullanıcı rol atamalarını görüntüleme'),
  ('admin.users.write_roles', 'Yönetici: kullanıcı rolü ver / kaldır'),
  ('admin.audit.read', 'Yönetici: denetim günlüğü'),
  ('admin.permissions.read', 'Yönetici: izin ve rol–izin matrisini okuma'),
  ('admin.permissions.write', 'Yönetici: rol–izin ataması değiştirme'),
  ('admin.agency_category_grants.read', 'Yönetici: acente kategori yetkilerini listeleme'),
  ('admin.agency_category_grants.write', 'Yönetici: acente kategori yetkisi oluşturma / güncelleme'),
  ('admin.agency_profiles.read', 'Yönetici: acente profillerini listeleme'),
  ('admin.agency_profiles.write', 'Yönetici: acente profili belge durumu / iskonto güncelleme'),
  ('staff.profile.read', 'Personel: profil / kurum özeti'),
  ('staff.reservations.read', 'Personel: rezervasyon listesi'),
  ('agency.portal', 'Acente: oturumla portal uçları'),
  ('supplier.portal', 'Tedarikçi: oturumla portal uçları')
ON CONFLICT (code) DO NOTHING;

-- admin: tüm admin.* izinleri
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'admin'
  AND p.code LIKE 'admin.%'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'staff'
  AND p.code IN ('staff.profile.read', 'staff.reservations.read')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'agency'
  AND p.code = 'agency.portal'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'supplier'
  AND p.code = 'supplier.portal'
ON CONFLICT DO NOTHING;
