-- Trios Villa: boş dönemsel fiyatları Akdeniz Villam kaynağından doldur
-- Kaynak: https://www.akdenizvillam.com/kiralik-villalar/villa-trios
-- Hedef: id a1c3d8c3-a710-4d69-ba63-260d2e8f035c / slug trios-villa

UPDATE listings
SET location_name = 'Kalkan, Kışla, Antalya',
    ministry_license_ref = COALESCE(NULLIF(trim(ministry_license_ref), ''), '07-8242'),
    vitrin_price = 9290,
    min_stay_nights = 5,
    cleaning_fee_amount = 7000,
    first_charge_amount = CASE
      WHEN first_charge_amount IS NOT NULL AND abs(first_charge_amount - 10000) < 0.05 THEN NULL
      ELSE first_charge_amount
    END,
    external_provider_code = COALESCE(NULLIF(trim(external_provider_code), ''), 'akdenizvillam'),
    external_listing_ref = COALESCE(NULLIF(trim(external_listing_ref), ''), '1310'),
    updated_at = now()
WHERE id = 'a1c3d8c3-a710-4d69-ba63-260d2e8f035c'::uuid OR lower(slug) = 'trios-villa';

-- Pazarlama sonekini düşür
UPDATE listing_translations lt
SET title = 'Trios Villa'
FROM listings l
WHERE lt.listing_id = l.id
  AND (l.id = 'a1c3d8c3-a710-4d69-ba63-260d2e8f035c'::uuid OR lower(l.slug) = 'trios-villa')
  AND lt.title IS DISTINCT FROM 'Trios Villa';

UPDATE seo_metadata sm
SET title = 'Trios Villa'
FROM listings l
WHERE sm.entity_type = 'listing' AND sm.entity_id = l.id
  AND (l.id = 'a1c3d8c3-a710-4d69-ba63-260d2e8f035c'::uuid OR lower(l.slug) = 'trios-villa')
  AND sm.title IS DISTINCT FROM 'Trios Villa';

UPDATE listing_attributes la
SET value_json = coalesce(la.value_json, '{}'::jsonb) || jsonb_build_object(
  'city', 'Kalkan',
  'address', 'Kalkan Kışla, Antalya',
  'province_city', 'Antalya',
  'district_label', 'Kışla',
  'region_display', 'Kalkan, Kışla',
  'tourism_cert_no', '07-8242',
  'damage_deposit', '10000',
  'short_stay_fee', '7000',
  'check_in_time', '16:00',
  'check_out_time', '10:00',
  'source_url', 'https://www.akdenizvillam.com/kiralik-villalar/villa-trios'
)
FROM listings l
WHERE la.listing_id = l.id
  AND (l.id = 'a1c3d8c3-a710-4d69-ba63-260d2e8f035c'::uuid OR lower(l.slug) = 'trios-villa')
  AND la.group_code = 'listing_meta' AND la.key = 'v1';

DELETE FROM listing_price_rules
WHERE listing_id IN (
  SELECT id FROM listings WHERE id = 'a1c3d8c3-a710-4d69-ba63-260d2e8f035c'::uuid OR lower(slug) = 'trios-villa'
);

INSERT INTO listing_price_rules (listing_id, rule_json, valid_from, valid_to)
SELECT l.id, '{"base_nightly":"16430","weekly_total":"115010","weekend_nightly":"","min_nights":"5"}'::jsonb, '2026-07-01'::date, '2026-07-31'::date
FROM listings l
WHERE l.id = 'a1c3d8c3-a710-4d69-ba63-260d2e8f035c'::uuid OR lower(l.slug) = 'trios-villa';

INSERT INTO listing_price_rules (listing_id, rule_json, valid_from, valid_to)
SELECT l.id, '{"base_nightly":"19290","weekly_total":"135030","weekend_nightly":""}'::jsonb, '2026-08-01'::date, '2026-08-31'::date
FROM listings l
WHERE l.id = 'a1c3d8c3-a710-4d69-ba63-260d2e8f035c'::uuid OR lower(l.slug) = 'trios-villa';

INSERT INTO listing_price_rules (listing_id, rule_json, valid_from, valid_to)
SELECT l.id, '{"base_nightly":"16430","weekly_total":"115010","weekend_nightly":""}'::jsonb, '2026-09-01'::date, '2026-09-10'::date
FROM listings l
WHERE l.id = 'a1c3d8c3-a710-4d69-ba63-260d2e8f035c'::uuid OR lower(l.slug) = 'trios-villa';

INSERT INTO listing_price_rules (listing_id, rule_json, valid_from, valid_to)
SELECT l.id, '{"base_nightly":"15000","weekly_total":"105000","weekend_nightly":""}'::jsonb, '2026-09-11'::date, '2026-09-30'::date
FROM listings l
WHERE l.id = 'a1c3d8c3-a710-4d69-ba63-260d2e8f035c'::uuid OR lower(l.slug) = 'trios-villa';

INSERT INTO listing_price_rules (listing_id, rule_json, valid_from, valid_to)
SELECT l.id, '{"base_nightly":"9290","weekly_total":"65030","weekend_nightly":""}'::jsonb, '2026-10-01'::date, '2026-10-31'::date
FROM listings l
WHERE l.id = 'a1c3d8c3-a710-4d69-ba63-260d2e8f035c'::uuid OR lower(l.slug) = 'trios-villa';

UPDATE listings l
SET vitrin_price = sub.min_price, updated_at = now()
FROM (
  SELECT listing_id, min((rule_json->>'base_nightly')::numeric) AS min_price
  FROM listing_price_rules
  WHERE listing_id IN (SELECT id FROM listings WHERE id = 'a1c3d8c3-a710-4d69-ba63-260d2e8f035c'::uuid OR lower(slug) = 'trios-villa')
    AND coalesce(rule_json->>'base_nightly','') ~ '^[0-9]+(\.[0-9]+)?$'
  GROUP BY listing_id
) sub
WHERE l.id = sub.listing_id;