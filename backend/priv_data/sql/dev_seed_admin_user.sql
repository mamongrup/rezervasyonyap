-- Tek seferlik: yerel geliştirme için sabit yönetici hesabı.
-- Şifre: TravelAdmin2026!  (Gleam identity_http hash_password ile uyumlu: salt||utf8 şifre → SHA256)
-- Önkoşul: organizations platform satırı (182), roles (020).

-- Parola hash — bu dosyayla sabitlenir (salt: ilk 32 hex = 16 bayt)
-- Üretim: PowerShell ile salt+password SHA256; bu satırı değiştirmeyin veya yeniden hash üretin.

INSERT INTO users (email, password_hash, display_name)
VALUES (
  'admin@travel.local',
  'e27af34a68d17f015ff1a1c5ace46ca8:7206c9550d47a70841cd0c5e4cb4906ae8750f9b8743ecd0918a4ee9c0fbcf22',
  'Yönetici (seed)'
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  display_name = EXCLUDED.display_name,
  updated_at = now();

INSERT INTO user_roles (user_id, role_id, organization_id)
SELECT u.id, r.id, 'a0000000-0000-4000-8000-000000000001'::uuid
FROM users u
CROSS JOIN roles r
WHERE u.email = 'admin@travel.local'
  AND r.code = 'admin'
ON CONFLICT DO NOTHING;
