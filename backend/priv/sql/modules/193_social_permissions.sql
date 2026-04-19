-- Sosyal paylaşım API izinleri (Madde 5); admin + 189 önkoşulu
INSERT INTO permissions (code, description) VALUES
  ('admin.social.read', 'Yönetici: sosyal şablon ve paylaşım kuyruğu okuma'),
  ('admin.social.write', 'Yönetici: şablon/kuyruk oluşturma
ON CONFLICT DO NOTHING; tüm ilanlarda paylaşım bayrakları')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN ('admin.social.read', 'admin.social.write')
WHERE r.code = 'admin'
ON CONFLICT DO NOTHING;
