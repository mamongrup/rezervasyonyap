-- Sosyal paylaşım kategori sırası: villa → yat → aktivite → tur → gemi → otel.
-- Kod tarafı da aynı sırayı kullanır; mevcut site_settings kaydını günceller.

UPDATE site_settings
SET value_json = jsonb_set(
  jsonb_set(
    jsonb_set(
      coalesce(value_json, '{}'::jsonb),
      '{rotation,category_codes}',
      '["holiday_home","yacht_charter","activity","tour","cruise","hotel"]'::jsonb,
      true
    ),
    '{rotation,story_category_codes}',
    '["holiday_home","yacht_charter","activity","tour","cruise","hotel"]'::jsonb,
    true
  ),
  '{rotation,reel_category_codes}',
  '["holiday_home","yacht_charter","activity","tour","cruise","hotel"]'::jsonb,
  true
)
WHERE organization_id IS NULL
  AND key = 'social_api';
