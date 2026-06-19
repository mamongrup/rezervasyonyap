-- Yolcu360: staging URL → production API
UPDATE site_settings
SET value_json = jsonb_set(
  value_json,
  '{yolcu360,base_url}',
  to_jsonb('https://api.pro.yolcu360.com/api/v1'::text)
)
WHERE key = 'listing_api_providers'
  AND value_json->'yolcu360'->>'base_url' LIKE '%staging%';
