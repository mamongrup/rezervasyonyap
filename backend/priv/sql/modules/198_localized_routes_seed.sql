-- MODÜL: vitrin ilk URL segmenti — TR okunaklı alias (Next middleware + API ile uyumlu).

INSERT INTO localized_routes (locale_id, logical_key, path_segment)
SELECT l.id, v.lk, v.ps
FROM locales l
CROSS JOIN (VALUES
  ('blog', 'gunluk'),
  ('contact', 'iletisim'),
  ('legal', 'yasal'),
  ('otel', 'otel'),
  ('yat', 'yat'),
  ('stay-listings', 'konaklama'),
  ('tatil-evi', 'tatil-evi'),
  ('experience-listings', 'deneyim'),
  ('car-listings', 'arac')
) AS v(lk, ps)
WHERE lower(l.code) = 'tr'
ON CONFLICT (locale_id, logical_key) DO UPDATE SET path_segment = EXCLUDED.path_segment;

INSERT INTO localized_routes (locale_id, logical_key, path_segment)
SELECT l.id, v.lk, v.ps
FROM locales l
CROSS JOIN (VALUES
  ('blog', 'blog'),
  ('contact', 'contact'),
  ('legal', 'legal'),
  ('otel', 'hotel'),
  ('yat', 'yacht-charter'),
  ('stay-listings', 'stays'),
  ('tatil-evi', 'holiday-home'),
  ('experience-listings', 'experiences'),
  ('car-listings', 'cars-for-rent')
) AS v(lk, ps)
WHERE lower(l.code) = 'en'
ON CONFLICT (locale_id, logical_key) DO UPDATE SET path_segment = EXCLUDED.path_segment;
