-- `nav.hero_menu` — ManageSubnav’da kullanılır; 197’de yoktu (anahtar düz metin kalıyordu).
-- Önkoşul: 197_manage_panel_i18n.sql

INSERT INTO translation_entries (namespace_id, key)
SELECT n.id, v.key
FROM translation_namespaces n
CROSS JOIN (VALUES
  ('nav.hero_menu')
) AS v(key)
WHERE n.code = 'manage'
ON CONFLICT (namespace_id, key) DO NOTHING;

INSERT INTO translation_values (entry_id, locale_id, value)
SELECT e.id, l.id, s.value
FROM (VALUES
  ('nav.hero_menu', 'tr', 'Hero menü'),
  ('nav.hero_menu', 'en', 'Hero menu')
) AS s(entry_key, loc, value)
JOIN translation_entries e ON e.key = s.entry_key
JOIN translation_namespaces n ON n.id = e.namespace_id AND n.code = 'manage'
JOIN locales l ON lower(l.code) = lower(s.loc)
ON CONFLICT (entry_id, locale_id) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
