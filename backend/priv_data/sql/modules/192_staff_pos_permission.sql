-- Personel POS: kurum ilanlarıyla sepet / held checkout (Madde 4)
INSERT INTO permissions (code, description) VALUES
  ('staff.pos.write', 'Personel: POS sepeti oluşturma, satır ekleme, misafir checkout')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code = 'staff.pos.write'
WHERE r.code = 'staff'
ON CONFLICT DO NOTHING;
