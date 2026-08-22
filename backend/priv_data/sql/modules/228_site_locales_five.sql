-- MODÜL: vitrin dilleri — TR, EN, DE, RU, ZH kayıtlı ve aktif.
-- Kurulum sonrası: GET /api/v1/i18n/locales ile doğrulayın.

INSERT INTO locales (code, name, is_rtl, is_active) VALUES
  ('tr', 'Türkçe', FALSE, TRUE),
  ('en', 'English', FALSE, TRUE),
  ('de', 'Deutsch', FALSE, TRUE),
  ('ru', 'Русский', FALSE, TRUE),
  ('zh', '中文', FALSE, TRUE)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  is_rtl = EXCLUDED.is_rtl,
  is_active = TRUE;

-- Yeni diller için yol segmentleri (EN ile aynı; ileride locale başına özelleştirilebilir).
INSERT INTO localized_routes (locale_id, logical_key, path_segment)
SELECT l.id, v.lk, v.ps
FROM locales l
CROSS JOIN (VALUES
  ('blog', 'blog'),
  ('contact', 'contact'),
  ('legal', 'legal')
) AS v(lk, ps)
WHERE lower(l.code) IN ('de', 'ru', 'zh')
ON CONFLICT (locale_id, logical_key) DO UPDATE SET path_segment = EXCLUDED.path_segment;
