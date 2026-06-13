-- MODÜL: AI ilan içerik kaydı — `tr` locale her zaman bulunur ve aktif
INSERT INTO locales (code, name, is_rtl, is_active) VALUES
  ('tr', 'Türkçe', FALSE, TRUE)
ON CONFLICT (code) DO UPDATE SET
  is_active = TRUE,
  name = EXCLUDED.name;
