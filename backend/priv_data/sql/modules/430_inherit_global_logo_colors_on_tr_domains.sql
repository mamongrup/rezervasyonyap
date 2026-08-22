-- Turkce vitrinler global logo renklerini miras alsin. Domain'e ozel logo
-- metinleri ve diger ayarlar korunur; yalnizca eski renk override'lari silinir.
-- Isaret alani, sonraki deploy'larda sonradan tanimlanan ozel renkleri korur.
UPDATE site_settings
SET value_json = jsonb_set(
  jsonb_set(
    value_json,
    '{domain_overrides}',
    CASE
      WHEN jsonb_typeof(value_json->'domain_overrides') = 'object'
        THEN value_json->'domain_overrides'
      ELSE '{}'::jsonb
    END
      #- ARRAY['rezervasyonyap.tr', 'logo_text_line1_color']
      #- ARRAY['rezervasyonyap.tr', 'logo_text_line2_color']
      #- ARRAY['rezervasyonyap.com.tr', 'logo_text_line1_color']
      #- ARRAY['rezervasyonyap.com.tr', 'logo_text_line2_color'],
    true
  ),
  '{_migration_430_logo_color_inheritance_done}',
  'true'::jsonb,
  true
)
WHERE key = 'branding'
  AND jsonb_typeof(value_json) = 'object'
  AND coalesce(value_json->>'_migration_430_logo_color_inheritance_done', 'false') <> 'true';
