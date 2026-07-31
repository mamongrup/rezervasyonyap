-- Referans siteden günlük müsaitlik AI eşitleme zamanlaması (import_schedule).
-- Varsayılan UTC 22:00 = Türkiye saati gece 01:00 (UTC+3).
-- Panel: Yönetim → Ayarlar → İlan API / Import zamanlama.

UPDATE site_settings
SET value_json = coalesce(value_json, '{}'::jsonb) || '{"listing_availability":[22]}'::jsonb
WHERE key = 'import_schedule'
  AND organization_id IS NULL
  AND NOT (coalesce(value_json, '{}'::jsonb) ? 'listing_availability');

INSERT INTO site_settings (organization_id, key, value_json)
SELECT NULL, 'import_schedule', '{"listing_availability":[22]}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM site_settings WHERE key = 'import_schedule' AND organization_id IS NULL
);
