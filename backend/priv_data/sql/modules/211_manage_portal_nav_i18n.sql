-- Sol panel: kullanıcı tipi (portal) seçici etiketleri (manage namespace).

INSERT INTO translation_entries (namespace_id, key)
SELECT n.id, v.key
FROM translation_namespaces n
CROSS JOIN (VALUES
  ('nav.portal_admin'),
  ('nav.portal_agency'),
  ('nav.portal_supplier'),
  ('nav.portal_staff'),
  ('nav.portal_select_label'),
  ('nav.portal_select_aria'),
  ('nav.admin_home')
) AS v(key)
WHERE n.code = 'manage'
ON CONFLICT (namespace_id, key) DO NOTHING;

INSERT INTO translation_values (entry_id, locale_id, value)
SELECT e.id, l.id, s.value
FROM translation_entries e
JOIN translation_namespaces n ON n.id = e.namespace_id AND n.code = 'manage'
JOIN (
  SELECT * FROM (VALUES
    ('nav.portal_admin', 'tr', 'Yönetici'),
    ('nav.portal_admin', 'en', 'Administrator'),
    ('nav.portal_agency', 'tr', 'Acente'),
    ('nav.portal_agency', 'en', 'Agency'),
    ('nav.portal_supplier', 'tr', 'Tedarikçi'),
    ('nav.portal_supplier', 'en', 'Supplier'),
    ('nav.portal_staff', 'tr', 'Personel'),
    ('nav.portal_staff', 'en', 'Staff'),
    ('nav.portal_select_label', 'tr', 'Görünüm'),
    ('nav.portal_select_label', 'en', 'View as'),
    ('nav.portal_select_aria', 'tr', 'Panelde hangi kullanıcı tipi menüsünü göstereceğinizi seçin'),
    ('nav.portal_select_aria', 'en', 'Choose which user-type menu to show in the panel'),
    ('nav.admin_home', 'tr', 'Yönetici paneli'),
    ('nav.admin_home', 'en', 'Admin dashboard')
  ) AS t(key, loc, value)
) AS s ON s.key = e.key
JOIN locales l ON lower(l.code) = lower(s.loc)
ON CONFLICT (entry_id, locale_id) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
