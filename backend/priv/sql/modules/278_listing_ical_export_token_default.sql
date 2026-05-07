-- Yeni ilan kayıtlarında `ical_export_token` dolu gelsin; GET başarısız olsa bile
-- `.ics` URL'si DB'den oluşturulabilir (64 hex ≈ Gleam'deki 32 byte base16).
-- Mevcut NULL kayıtlar tek seferlik doldurulur.

ALTER TABLE listings
  ALTER COLUMN ical_export_token SET DEFAULT (
    lower(
      replace(gen_random_uuid()::text, '-', '')
      || replace(gen_random_uuid()::text, '-', '')
    )
  );

UPDATE listings
SET ical_export_token = lower(
  replace(gen_random_uuid()::text, '-', '')
  || replace(gen_random_uuid()::text, '-', '')
)
WHERE ical_export_token IS NULL OR btrim(ical_export_token) = '';
