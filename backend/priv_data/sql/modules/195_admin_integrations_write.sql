-- Google Merchant ürün kayıtları (yazma)
INSERT INTO permissions (code, description) VALUES
  ('admin.integrations.write', 'Yönetici: Google Merchant ürün kaydı oluşturma / güncelleme')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code = 'admin.integrations.write'
WHERE r.code = 'admin'
ON CONFLICT DO NOTHING;
