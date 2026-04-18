-- İlan çevirileri ekranı — SEO alanları (manage namespace).

INSERT INTO translation_entries (namespace_id, key)
SELECT n.id, v.key
FROM translation_namespaces n
CROSS JOIN (VALUES
  ('catalog.seo_section'),
  ('catalog.seo_search_title'),
  ('catalog.seo_search_description'),
  ('catalog.seo_keywords'),
  ('catalog.seo_canonical'),
  ('catalog.seo_og_image'),
  ('catalog.seo_robots')
) AS v(key)
WHERE n.code = 'manage'
ON CONFLICT (namespace_id, key) DO NOTHING;

INSERT INTO translation_values (entry_id, locale_id, value)
SELECT e.id, l.id, s.value
FROM translation_entries e
JOIN translation_namespaces n ON n.id = e.namespace_id AND n.code = 'manage'
JOIN (
  SELECT * FROM (VALUES
    ('catalog.seo_section', 'tr', 'SEO — arama ve paylaşım'),
    ('catalog.seo_section', 'en', 'SEO — search & sharing'),
    ('catalog.seo_search_title', 'tr', 'Arama sonucu başlığı (meta title)'),
    ('catalog.seo_search_title', 'en', 'Search result title (meta title)'),
    ('catalog.seo_search_description', 'tr', 'Arama sonucu özeti (meta description)'),
    ('catalog.seo_search_description', 'en', 'Search snippet (meta description)'),
    ('catalog.seo_keywords', 'tr', 'Anahtar kelimeler (virgülle)'),
    ('catalog.seo_keywords', 'en', 'Keywords (comma-separated)'),
    ('catalog.seo_canonical', 'tr', 'Canonical yol (isteğe bağlı, / ile başlar)'),
    ('catalog.seo_canonical', 'en', 'Canonical path (optional, leading /)'),
    ('catalog.seo_og_image', 'tr', 'OG görseli (depolama anahtarı)'),
    ('catalog.seo_og_image', 'en', 'OG image (storage key)'),
    ('catalog.seo_robots', 'tr', 'Robots (örn. index,follow veya noindex)'),
    ('catalog.seo_robots', 'en', 'Robots (e.g. index,follow or noindex)')
  ) AS t(key, loc, value)
) AS s ON s.key = e.key
JOIN locales l ON lower(l.code) = lower(s.loc)
ON CONFLICT (entry_id, locale_id) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
