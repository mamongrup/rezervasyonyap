-- Entegrasyon duyarlı listeler (ör. WhatsApp sipariş niyetleri)
INSERT INTO permissions (code, description) VALUES
  ('admin.integrations.read', 'Yönetici: WhatsApp sipariş niyetleri vb. entegrasyon listeleri')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code = 'admin.integrations.read'
WHERE r.code = 'admin'
ON CONFLICT DO NOTHING;
