-- Mara Villa vitrin verisi: lokal ile canlı parity (belge no, depozito, havuz meta)

UPDATE listings
SET
  ministry_license_ref = COALESCE(NULLIF(trim(ministry_license_ref), ''), '48-23'),
  first_charge_amount = COALESCE(first_charge_amount, 5000.00),
  pool_size_label = COALESCE(
    NULLIF(trim(pool_size_label), ''),
    'Açık 8×5×1.45m · Isıtmalı 8×5×1.45m'
  )
WHERE slug = 'mara-villa';

INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
SELECT
  l.id,
  'vertical_holiday_home',
  'v1',
  jsonb_build_object(
    'category', 'holiday_home',
    'data', jsonb_build_object(
      'pools', jsonb_build_object(
        'open_pool', jsonb_build_object(
          'enabled', true,
          'width', '5',
          'length', '8',
          'depth', '1.45',
          'description', 'Özel Havuz',
          'heating_fee_per_day', ''
        ),
        'heated_pool', jsonb_build_object(
          'enabled', true,
          'width', '5',
          'length', '8',
          'depth', '1.45',
          'description', 'Isıtmalı havuz',
          'heating_fee_per_day', ''
        ),
        'children_pool', jsonb_build_object(
          'enabled', false,
          'width', '',
          'length', '',
          'depth', '',
          'description', '',
          'heating_fee_per_day', ''
        )
      )
    )
  )
FROM listings l
WHERE l.slug = 'mara-villa'
ON CONFLICT (listing_id, group_code, key) DO UPDATE
SET value_json = EXCLUDED.value_json;
