-- MODÜL: Fransızca (fr) — locale + vitrin yol segmentleri.

INSERT INTO locales (code, name, is_rtl, is_active) VALUES
  ('fr', 'Français', FALSE, TRUE)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  is_rtl = EXCLUDED.is_rtl,
  is_active = TRUE;

INSERT INTO localized_routes (locale_id, logical_key, path_segment)
SELECT l.id, v.lk, v.ps
FROM locales l
CROSS JOIN (VALUES
  ('blog', 'blog'),
  ('contact', 'contact'),
  ('legal', 'legal')
) AS v(lk, ps)
WHERE lower(l.code) = 'fr'
ON CONFLICT (locale_id, logical_key) DO UPDATE SET path_segment = EXCLUDED.path_segment;
