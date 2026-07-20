-- Villa Bella 1-5 canlı fiyat/müsaitlik/özellik güncellemesi (Birvillas)
-- Uygula: ./deploy/apply-sql.sh deploy/scripts/sql/update-villa-bella-live.sql
BEGIN;
-- villa-bella-1-orkide-islamlar
UPDATE listings SET
    currency_code = 'TRY',
    min_stay_nights = 5,
    vitrin_price = 6023,
    first_charge_amount = COALESCE(5000, first_charge_amount),
    map_lat = '36.300114478414734',
    map_lng = '29.410516887535636',
    location_name = 'İslamlar, Kaş, Antalya',
    ministry_license_ref = COALESCE('07-9339', ministry_license_ref),
    updated_at = now()
  WHERE id = (SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1);
DELETE FROM listing_price_rules WHERE listing_id = (SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1);
INSERT INTO listing_price_rules (listing_id, rule_json, valid_from, valid_to)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '{"base_nightly":"8800","weekly_total":"61600","weekend_nightly":"","label":"summer","min_nights":"3"}'::jsonb, '2026-07-07'::date, '2026-09-05'::date);
INSERT INTO listing_price_rules (listing_id, rule_json, valid_from, valid_to)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '{"base_nightly":"6160","weekly_total":"43120","weekend_nightly":"","label":"autumn-1","min_nights":"3"}'::jsonb, '2026-09-06'::date, '2026-09-30'::date);
INSERT INTO listing_price_rules (listing_id, rule_json, valid_from, valid_to)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '{"base_nightly":"3740","weekly_total":"26180","weekend_nightly":"","label":"autumn","min_nights":"3"}'::jsonb, '2026-10-01'::date, '2026-10-31'::date);
INSERT INTO listing_price_rules (listing_id, rule_json, valid_from, valid_to)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '{"base_nightly":"3520","weekly_total":"24640","weekend_nightly":"","label":"autumn-2","min_nights":"3"}'::jsonb, '2026-11-01'::date, '2026-11-30'::date);
DELETE FROM listing_availability_calendar WHERE listing_id = (SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1);
INSERT INTO listing_availability_calendar (listing_id, day, is_available, am_available, pm_available, price_override) VALUES
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-07-07'::date, true, true, true, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-07-08'::date, true, true, true, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-07-09'::date, true, true, true, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-07-10'::date, true, true, true, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-07-11'::date, true, true, true, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-07-12'::date, true, true, true, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-07-13'::date, true, true, true, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-07-14'::date, true, true, true, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-07-15'::date, true, true, true, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-07-16'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-07-17'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-07-18'::date, true, true, true, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-07-19'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-07-20'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-07-21'::date, true, true, true, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-07-22'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-07-23'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-07-24'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-07-25'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-07-26'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-07-27'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-07-28'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-07-29'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-07-30'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-07-31'::date, true, true, true, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-08-01'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-08-02'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-08-03'::date, true, true, true, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-08-04'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-08-05'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-08-06'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-08-07'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-08-08'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-08-09'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-08-10'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-08-11'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-08-12'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-08-13'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-08-14'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-08-15'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-08-16'::date, true, true, true, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-08-17'::date, true, true, true, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-08-18'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-08-19'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-08-20'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-08-21'::date, true, true, true, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-08-22'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-08-23'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-08-24'::date, true, true, true, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-08-25'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-08-26'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-08-27'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-08-28'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-08-29'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-08-30'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-08-31'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-09-01'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-09-02'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-09-03'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-09-04'::date, true, true, true, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-09-05'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-09-06'::date, true, true, true, '6160'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-09-07'::date, false, false, false, '6160'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-09-08'::date, false, false, false, '6160'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-09-09'::date, false, false, false, '6160'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-09-10'::date, false, false, false, '6160'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-09-11'::date, true, true, true, '6160'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-09-12'::date, false, false, false, '6160'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-09-13'::date, false, false, false, '6160'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-09-14'::date, true, true, true, '6160'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-09-15'::date, false, false, false, '6160'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-09-16'::date, false, false, false, '6160'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-09-17'::date, false, false, false, '6160'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-09-18'::date, false, false, false, '6160'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-09-19'::date, false, false, false, '6160'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-09-20'::date, false, false, false, '6160'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-09-21'::date, false, false, false, '6160'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-09-22'::date, false, false, false, '6160'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-09-23'::date, false, false, false, '6160'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-09-24'::date, false, false, false, '6160');
INSERT INTO listing_availability_calendar (listing_id, day, is_available, am_available, pm_available, price_override) VALUES
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-09-25'::date, false, false, false, '6160'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-09-26'::date, false, false, false, '6160'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-09-27'::date, false, false, false, '6160'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-09-28'::date, false, false, false, '6160'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-09-29'::date, true, true, true, '6160'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-09-30'::date, false, false, false, '6160'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-10-01'::date, true, true, true, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-10-02'::date, false, false, false, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-10-03'::date, false, false, false, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-10-04'::date, false, false, false, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-10-05'::date, false, false, false, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-10-06'::date, false, false, false, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-10-07'::date, false, false, false, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-10-08'::date, false, false, false, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-10-09'::date, false, false, false, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-10-10'::date, false, false, false, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-10-11'::date, false, false, false, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-10-12'::date, false, false, false, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-10-13'::date, false, false, false, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-10-14'::date, false, false, false, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-10-15'::date, false, false, false, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-10-16'::date, false, false, false, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-10-17'::date, false, false, false, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-10-18'::date, false, false, false, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-10-19'::date, false, false, false, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-10-20'::date, false, false, false, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-10-21'::date, false, false, false, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-10-22'::date, false, false, false, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-10-23'::date, false, false, false, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-10-24'::date, false, false, false, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-10-25'::date, true, true, true, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-10-26'::date, false, false, false, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-10-27'::date, false, false, false, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-10-28'::date, true, true, true, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-10-29'::date, true, true, true, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-10-30'::date, true, true, true, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-10-31'::date, true, true, true, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-11-01'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-11-02'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-11-03'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-11-04'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-11-05'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-11-06'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-11-07'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-11-08'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-11-09'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-11-10'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-11-11'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-11-12'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-11-13'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-11-14'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-11-15'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-11-16'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-11-17'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-11-18'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-11-19'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-11-20'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-11-21'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-11-22'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-11-23'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-11-24'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-11-25'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-11-26'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-11-27'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-11-28'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-11-29'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), '2026-11-30'::date, true, true, true, '3520');
INSERT INTO listing_holiday_home_details (listing_id, theme_codes, rule_codes, ical_managed)
    VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), ARRAY['sea_view','conservative','luxury','honeymoon','nature','pool','jacuzzi']::text[], ARRAY['no_pets','no_smoking','no_parties']::text[], false)
    ON CONFLICT (listing_id) DO UPDATE SET theme_codes = EXCLUDED.theme_codes, rule_codes = EXCLUDED.rule_codes;
DELETE FROM listing_attributes WHERE listing_id = (SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1) AND group_code IN ('tema','imported_amenity','ic_mekan','dis_mekan');
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'tema', 'sea_view', 'true'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'tema', 'conservative', 'true'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'tema', 'luxury', 'true'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'tema', 'honeymoon', 'true'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'tema', 'nature', 'true'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'tema', 'pool', 'true'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'tema', 'jacuzzi', 'true'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'imported_amenity', 'klima', '{"label":"Klima","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'imported_amenity', 'barbeku', '{"label":"Barbekü","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'imported_amenity', 'nevresim', '{"label":"Nevresim","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'imported_amenity', 'karartma-perdesi', '{"label":"Karartma perdesi","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'imported_amenity', 'blender', '{"label":"Blender","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'imported_amenity', 'kahve-makinesi', '{"label":"Kahve makinesi","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'imported_amenity', 'pisirme-gerecleri', '{"label":"Pişirme gereçleri","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'imported_amenity', 'bebek-yatagi', '{"label":"Bebek yatağı","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'imported_amenity', 'catal-bicak-takimi', '{"label":"Çatal bıçak takımı","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'imported_amenity', 'yemek-masasi', '{"label":"Yemek masası","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'imported_amenity', 'yemek-takimi', '{"label":"Yemek takımı","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'imported_amenity', 'bulasik-makinesi', '{"label":"Bulaşık makinesi","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'imported_amenity', 'kurutma-makinesi', '{"label":"Kurutma makinesi","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'imported_amenity', 'ebeveyn-banyosu', '{"label":"Ebeveyn banyosu","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'imported_amenity', 'yangin-sondurucu', '{"label":"Yangın söndürücü","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'imported_amenity', 'somine', '{"label":"Şömine","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'imported_amenity', 'ilk-yardim-seti', '{"label":"İlk yardım seti","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'imported_amenity', 'ucretsiz-otopark', '{"label":"Ücretsiz otopark","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'imported_amenity', 'tam-mobilyali', '{"label":"Tam mobilyalı","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'imported_amenity', 'bahce', '{"label":"Bahçe","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'imported_amenity', 'bardak-takimi', '{"label":"Bardak takımı","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'imported_amenity', 'sac-kurutma-makinesi', '{"label":"Saç kurutma makinesi","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'imported_amenity', 'mama-sandalyesi', '{"label":"Mama sandalyesi","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'imported_amenity', 'sicak-su', '{"label":"Sıcak su","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'imported_amenity', 'utu', '{"label":"Ütü","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'imported_amenity', 'jakuzi', '{"label":"Jakuzi","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'imported_amenity', 'su-isiticisi', '{"label":"Su ısıtıcısı","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'imported_amenity', 'mikrodalga', '{"label":"Mikrodalga","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'imported_amenity', 'ic-mekanda-sigara-icilmez', '{"label":"İç mekânda sigara içilmez","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'imported_amenity', 'bahce-mobilyasi', '{"label":"Bahçe mobilyası","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'imported_amenity', 'firin', '{"label":"Fırın","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'imported_amenity', 'veranda', '{"label":"Veranda","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'imported_amenity', 'havuz-ve-bahce-bakimi', '{"label":"Havuz ve bahçe bakımı","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'imported_amenity', 'buzdolabi', '{"label":"Buzdolabı","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'imported_amenity', 'dusakabin', '{"label":"Duşakabin","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'imported_amenity', 'akilli-tv', '{"label":"Akıllı TV","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'imported_amenity', 'duman-dedektoru', '{"label":"Duman dedektörü","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'imported_amenity', 'ocak', '{"label":"Ocak","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'imported_amenity', 'sezlong', '{"label":"Şezlong","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'imported_amenity', 'guneslenme-yatagi', '{"label":"Güneşlenme yatağı","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'imported_amenity', 'salincak', '{"label":"Salıncak","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'imported_amenity', 'teras', '{"label":"Teras","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'imported_amenity', 'havlu', '{"label":"Havlu","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'imported_amenity', 'tv', '{"label":"TV","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'imported_amenity', 'gardirop', '{"label":"Gardırop","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'imported_amenity', 'camasir-makinesi', '{"label":"Çamaşır makinesi","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'imported_amenity', 'wi-fi', '{"label":"Wi-Fi","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
    VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'listing_meta', 'v1', '{"city":"Kaş","province_city":"Antalya","district_label":"İslamlar","region_display":"İslamlar, Kaş","address":"İslamlar, Kaş, Antalya, Türkiye","bed_count":"1","bath_count":"1","room_count":"1","max_guests":"2","property_type":"villa","pool_type":"Özel açık havuz","check_in_time":"16:00","check_out_time":"10:00","min_advance_booking_days":"1","short_stay_fee":"2500","min_short_stay_nights":"6","damage_deposit":"5000","ministry_license_ref":"07-9339","source_url":"https://www.birvillas.com/listing/tc97shkNcDvOfEPCKSVs/villa-bella-1-orkide-islamlar","bedrooms":[{"ensuite":true,"id":"bedroom-1","amenities":["air-conditioning","ensuite","wardrobe","jacuzzi","blackout-curtains"],"beds":[{"count":1,"type":"double"}]}]}'::jsonb)
    ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
      value_json = COALESCE(listing_attributes.value_json, '{}'::jsonb) || EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
    VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'tc97shkNcDvOfEPCKSVs') OR slug = 'villa-bella-1-orkide-islamlar' LIMIT 1), 'birvillas', 'snapshot', '{"source_url":"https://www.birvillas.com/listing/tc97shkNcDvOfEPCKSVs/villa-bella-1-orkide-islamlar","external_ref":"tc97shkNcDvOfEPCKSVs","imported_at":"2026-07-20T18:05:31.676Z","currency":"TRY","price_note":"Fiyat ve müsaitlik Birvillas canlı ilan verisinden alınmıştır."}'::jsonb)
    ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
-- villa-bella-2-sardunya-islamlar
UPDATE listings SET
    currency_code = 'TRY',
    min_stay_nights = 5,
    vitrin_price = 8282,
    first_charge_amount = COALESCE(5000, first_charge_amount),
    map_lat = '36.30025222542307',
    map_lng = '29.4104774450102',
    location_name = 'İslamlar, Kaş, Antalya',
    ministry_license_ref = COALESCE('07-9338', ministry_license_ref),
    updated_at = now()
  WHERE id = (SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1);
DELETE FROM listing_price_rules WHERE listing_id = (SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1);
INSERT INTO listing_price_rules (listing_id, rule_json, valid_from, valid_to)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '{"base_nightly":"11800","weekly_total":"82600","weekend_nightly":"","label":"summer","min_nights":"3"}'::jsonb, '2026-07-07'::date, '2026-09-05'::date);
INSERT INTO listing_price_rules (listing_id, rule_json, valid_from, valid_to)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '{"base_nightly":"8260","weekly_total":"57820","weekend_nightly":"","label":"autumn-1","min_nights":"3"}'::jsonb, '2026-09-06'::date, '2026-09-30'::date);
INSERT INTO listing_price_rules (listing_id, rule_json, valid_from, valid_to)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '{"base_nightly":"5015","weekly_total":"35105","weekend_nightly":"","label":"autumn","min_nights":"3"}'::jsonb, '2026-10-01'::date, '2026-10-31'::date);
INSERT INTO listing_price_rules (listing_id, rule_json, valid_from, valid_to)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '{"base_nightly":"4720","weekly_total":"33040","weekend_nightly":"","label":"autumn-2","min_nights":"3"}'::jsonb, '2026-11-01'::date, '2026-11-30'::date);
DELETE FROM listing_availability_calendar WHERE listing_id = (SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1);
INSERT INTO listing_availability_calendar (listing_id, day, is_available, am_available, pm_available, price_override) VALUES
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-07-07'::date, true, true, true, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-07-08'::date, true, true, true, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-07-09'::date, true, true, true, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-07-10'::date, true, true, true, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-07-11'::date, true, true, true, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-07-12'::date, true, true, true, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-07-13'::date, true, true, true, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-07-14'::date, true, true, true, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-07-15'::date, true, true, true, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-07-16'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-07-17'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-07-18'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-07-19'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-07-20'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-07-21'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-07-22'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-07-23'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-07-24'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-07-25'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-07-26'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-07-27'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-07-28'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-07-29'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-07-30'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-07-31'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-08-01'::date, true, true, true, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-08-02'::date, true, true, true, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-08-03'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-08-04'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-08-05'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-08-06'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-08-07'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-08-08'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-08-09'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-08-10'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-08-11'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-08-12'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-08-13'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-08-14'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-08-15'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-08-16'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-08-17'::date, true, true, true, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-08-18'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-08-19'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-08-20'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-08-21'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-08-22'::date, true, true, true, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-08-23'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-08-24'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-08-25'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-08-26'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-08-27'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-08-28'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-08-29'::date, true, true, true, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-08-30'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-08-31'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-09-01'::date, true, true, true, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-09-02'::date, true, true, true, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-09-03'::date, true, true, true, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-09-04'::date, true, true, true, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-09-05'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-09-06'::date, false, false, false, '8260'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-09-07'::date, true, true, true, '8260'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-09-08'::date, false, false, false, '8260'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-09-09'::date, false, false, false, '8260'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-09-10'::date, false, false, false, '8260'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-09-11'::date, false, false, false, '8260'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-09-12'::date, false, false, false, '8260'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-09-13'::date, false, false, false, '8260'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-09-14'::date, false, false, false, '8260'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-09-15'::date, false, false, false, '8260'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-09-16'::date, false, false, false, '8260'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-09-17'::date, true, true, true, '8260'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-09-18'::date, false, false, false, '8260'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-09-19'::date, false, false, false, '8260'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-09-20'::date, true, true, true, '8260'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-09-21'::date, true, true, true, '8260'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-09-22'::date, true, true, true, '8260'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-09-23'::date, true, true, true, '8260'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-09-24'::date, true, true, true, '8260');
INSERT INTO listing_availability_calendar (listing_id, day, is_available, am_available, pm_available, price_override) VALUES
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-09-25'::date, true, true, true, '8260'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-09-26'::date, true, true, true, '8260'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-09-27'::date, true, true, true, '8260'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-09-28'::date, true, true, true, '8260'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-09-29'::date, true, true, true, '8260'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-09-30'::date, true, true, true, '8260'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-10-01'::date, true, true, true, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-10-02'::date, true, true, true, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-10-03'::date, true, true, true, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-10-04'::date, true, true, true, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-10-05'::date, true, true, true, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-10-06'::date, true, true, true, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-10-07'::date, true, true, true, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-10-08'::date, true, true, true, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-10-09'::date, true, true, true, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-10-10'::date, true, true, true, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-10-11'::date, true, true, true, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-10-12'::date, true, true, true, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-10-13'::date, true, true, true, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-10-14'::date, true, true, true, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-10-15'::date, true, true, true, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-10-16'::date, true, true, true, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-10-17'::date, true, true, true, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-10-18'::date, true, true, true, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-10-19'::date, true, true, true, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-10-20'::date, true, true, true, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-10-21'::date, true, true, true, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-10-22'::date, true, true, true, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-10-23'::date, true, true, true, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-10-24'::date, true, true, true, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-10-25'::date, true, true, true, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-10-26'::date, true, true, true, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-10-27'::date, true, true, true, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-10-28'::date, true, true, true, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-10-29'::date, true, true, true, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-10-30'::date, true, true, true, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-10-31'::date, true, true, true, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-11-01'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-11-02'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-11-03'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-11-04'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-11-05'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-11-06'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-11-07'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-11-08'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-11-09'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-11-10'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-11-11'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-11-12'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-11-13'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-11-14'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-11-15'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-11-16'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-11-17'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-11-18'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-11-19'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-11-20'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-11-21'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-11-22'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-11-23'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-11-24'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-11-25'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-11-26'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-11-27'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-11-28'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-11-29'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), '2026-11-30'::date, true, true, true, '4720');
INSERT INTO listing_holiday_home_details (listing_id, theme_codes, rule_codes, ical_managed)
    VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), ARRAY['sea_view','conservative','luxury','honeymoon','family','nature','pool','jacuzzi']::text[], ARRAY['no_pets','no_smoking','no_parties']::text[], false)
    ON CONFLICT (listing_id) DO UPDATE SET theme_codes = EXCLUDED.theme_codes, rule_codes = EXCLUDED.rule_codes;
DELETE FROM listing_attributes WHERE listing_id = (SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1) AND group_code IN ('tema','imported_amenity','ic_mekan','dis_mekan');
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'tema', 'sea_view', 'true'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'tema', 'conservative', 'true'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'tema', 'luxury', 'true'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'tema', 'honeymoon', 'true'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'tema', 'family', 'true'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'tema', 'nature', 'true'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'tema', 'pool', 'true'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'tema', 'jacuzzi', 'true'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'imported_amenity', 'klima', '{"label":"Klima","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'imported_amenity', 'barbeku', '{"label":"Barbekü","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'imported_amenity', 'nevresim', '{"label":"Nevresim","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'imported_amenity', 'karartma-perdesi', '{"label":"Karartma perdesi","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'imported_amenity', 'blender', '{"label":"Blender","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'imported_amenity', 'kahve-makinesi', '{"label":"Kahve makinesi","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'imported_amenity', 'pisirme-gerecleri', '{"label":"Pişirme gereçleri","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'imported_amenity', 'bebek-yatagi', '{"label":"Bebek yatağı","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'imported_amenity', 'catal-bicak-takimi', '{"label":"Çatal bıçak takımı","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'imported_amenity', 'yemek-masasi', '{"label":"Yemek masası","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'imported_amenity', 'yemek-takimi', '{"label":"Yemek takımı","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'imported_amenity', 'bulasik-makinesi', '{"label":"Bulaşık makinesi","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'imported_amenity', 'kurutma-makinesi', '{"label":"Kurutma makinesi","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'imported_amenity', 'ebeveyn-banyosu', '{"label":"Ebeveyn banyosu","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'imported_amenity', 'yangin-sondurucu', '{"label":"Yangın söndürücü","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'imported_amenity', 'somine', '{"label":"Şömine","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'imported_amenity', 'ilk-yardim-seti', '{"label":"İlk yardım seti","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'imported_amenity', 'ucretsiz-otopark', '{"label":"Ücretsiz otopark","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'imported_amenity', 'tam-mobilyali', '{"label":"Tam mobilyalı","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'imported_amenity', 'bahce', '{"label":"Bahçe","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'imported_amenity', 'bardak-takimi', '{"label":"Bardak takımı","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'imported_amenity', 'sac-kurutma-makinesi', '{"label":"Saç kurutma makinesi","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'imported_amenity', 'mama-sandalyesi', '{"label":"Mama sandalyesi","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'imported_amenity', 'sicak-su', '{"label":"Sıcak su","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'imported_amenity', 'utu', '{"label":"Ütü","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'imported_amenity', 'jakuzi', '{"label":"Jakuzi","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'imported_amenity', 'su-isiticisi', '{"label":"Su ısıtıcısı","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'imported_amenity', 'mikrodalga', '{"label":"Mikrodalga","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'imported_amenity', 'ic-mekanda-sigara-icilmez', '{"label":"İç mekânda sigara içilmez","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'imported_amenity', 'bahce-mobilyasi', '{"label":"Bahçe mobilyası","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'imported_amenity', 'firin', '{"label":"Fırın","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'imported_amenity', 'veranda', '{"label":"Veranda","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'imported_amenity', 'havuz-ve-bahce-bakimi', '{"label":"Havuz ve bahçe bakımı","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'imported_amenity', 'buzdolabi', '{"label":"Buzdolabı","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'imported_amenity', 'dusakabin', '{"label":"Duşakabin","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'imported_amenity', 'akilli-tv', '{"label":"Akıllı TV","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'imported_amenity', 'duman-dedektoru', '{"label":"Duman dedektörü","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'imported_amenity', 'ocak', '{"label":"Ocak","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'imported_amenity', 'sezlong', '{"label":"Şezlong","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'imported_amenity', 'guneslenme-yatagi', '{"label":"Güneşlenme yatağı","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'imported_amenity', 'salincak', '{"label":"Salıncak","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'imported_amenity', 'teras', '{"label":"Teras","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'imported_amenity', 'havlu', '{"label":"Havlu","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'imported_amenity', 'tv', '{"label":"TV","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'imported_amenity', 'gardirop', '{"label":"Gardırop","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'imported_amenity', 'camasir-makinesi', '{"label":"Çamaşır makinesi","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'imported_amenity', 'wi-fi', '{"label":"Wi-Fi","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
    VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'listing_meta', 'v1', '{"city":"Kaş","province_city":"Antalya","district_label":"İslamlar","region_display":"İslamlar, Kaş","address":"İslamlar, Kaş, Antalya, Türkiye","bed_count":"2","bath_count":"2","room_count":"2","max_guests":"4","property_type":"villa","pool_type":"Özel açık havuz","check_in_time":"16:00","check_out_time":"10:00","min_advance_booking_days":"1","short_stay_fee":"3000","min_short_stay_nights":"6","damage_deposit":"5000","ministry_license_ref":"07-9338","source_url":"https://www.birvillas.com/listing/40N1KtxyzUcj1AjNmo8e/villa-bella-2-sardunya-islamlar","bedrooms":[{"amenities":["air-conditioning","ensuite","wardrobe","jacuzzi","blackout-curtains"],"ensuite":true,"id":"bedroom-1","beds":[{"count":1,"type":"double"}]},{"beds":[{"type":"single","count":2}],"id":"bedroom-2","amenities":["air-conditioning","ensuite","wardrobe","blackout-curtains"],"ensuite":true}]}'::jsonb)
    ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
      value_json = COALESCE(listing_attributes.value_json, '{}'::jsonb) || EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
    VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = '40N1KtxyzUcj1AjNmo8e') OR slug = 'villa-bella-2-sardunya-islamlar' LIMIT 1), 'birvillas', 'snapshot', '{"source_url":"https://www.birvillas.com/listing/40N1KtxyzUcj1AjNmo8e/villa-bella-2-sardunya-islamlar","external_ref":"40N1KtxyzUcj1AjNmo8e","imported_at":"2026-07-20T18:05:32.948Z","currency":"TRY","price_note":"Fiyat ve müsaitlik Birvillas canlı ilan verisinden alınmıştır."}'::jsonb)
    ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
-- villa-bella-3-lale-islamlar
UPDATE listings SET
    currency_code = 'TRY',
    min_stay_nights = 5,
    vitrin_price = 8282,
    first_charge_amount = COALESCE(5000, first_charge_amount),
    map_lat = '36.30040763201223',
    map_lng = '29.41038322119944',
    location_name = 'İslamlar, Kaş, Antalya',
    ministry_license_ref = COALESCE('07-9337', ministry_license_ref),
    updated_at = now()
  WHERE id = (SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1);
DELETE FROM listing_price_rules WHERE listing_id = (SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1);
INSERT INTO listing_price_rules (listing_id, rule_json, valid_from, valid_to)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '{"base_nightly":"11800","weekly_total":"82600","weekend_nightly":"","label":"summer","min_nights":"3"}'::jsonb, '2026-07-07'::date, '2026-09-05'::date);
INSERT INTO listing_price_rules (listing_id, rule_json, valid_from, valid_to)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '{"base_nightly":"8260","weekly_total":"57820","weekend_nightly":"","label":"autumn-1","min_nights":"3"}'::jsonb, '2026-09-06'::date, '2026-09-30'::date);
INSERT INTO listing_price_rules (listing_id, rule_json, valid_from, valid_to)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '{"base_nightly":"5015","weekly_total":"35105","weekend_nightly":"","label":"autumn","min_nights":"3"}'::jsonb, '2026-10-01'::date, '2026-10-31'::date);
INSERT INTO listing_price_rules (listing_id, rule_json, valid_from, valid_to)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '{"base_nightly":"4720","weekly_total":"33040","weekend_nightly":"","label":"autumn-2","min_nights":"3"}'::jsonb, '2026-11-01'::date, '2026-11-30'::date);
DELETE FROM listing_availability_calendar WHERE listing_id = (SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1);
INSERT INTO listing_availability_calendar (listing_id, day, is_available, am_available, pm_available, price_override) VALUES
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-07-07'::date, true, true, true, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-07-08'::date, true, true, true, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-07-09'::date, true, true, true, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-07-10'::date, true, true, true, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-07-11'::date, true, true, true, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-07-12'::date, true, true, true, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-07-13'::date, true, true, true, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-07-14'::date, true, true, true, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-07-15'::date, true, true, true, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-07-16'::date, true, true, true, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-07-17'::date, true, true, true, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-07-18'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-07-19'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-07-20'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-07-21'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-07-22'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-07-23'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-07-24'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-07-25'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-07-26'::date, true, true, true, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-07-27'::date, true, true, true, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-07-28'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-07-29'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-07-30'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-07-31'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-08-01'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-08-02'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-08-03'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-08-04'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-08-05'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-08-06'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-08-07'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-08-08'::date, true, true, true, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-08-09'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-08-10'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-08-11'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-08-12'::date, true, true, true, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-08-13'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-08-14'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-08-15'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-08-16'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-08-17'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-08-18'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-08-19'::date, true, true, true, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-08-20'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-08-21'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-08-22'::date, true, true, true, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-08-23'::date, true, true, true, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-08-24'::date, true, true, true, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-08-25'::date, true, true, true, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-08-26'::date, true, true, true, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-08-27'::date, true, true, true, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-08-28'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-08-29'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-08-30'::date, true, true, true, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-08-31'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-09-01'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-09-02'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-09-03'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-09-04'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-09-05'::date, false, false, false, '11800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-09-06'::date, false, false, false, '8260'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-09-07'::date, false, false, false, '8260'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-09-08'::date, false, false, false, '8260'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-09-09'::date, false, false, false, '8260'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-09-10'::date, false, false, false, '8260'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-09-11'::date, false, false, false, '8260'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-09-12'::date, true, true, true, '8260'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-09-13'::date, false, false, false, '8260'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-09-14'::date, false, false, false, '8260'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-09-15'::date, true, true, true, '8260'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-09-16'::date, true, true, true, '8260'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-09-17'::date, true, true, true, '8260'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-09-18'::date, true, true, true, '8260'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-09-19'::date, true, true, true, '8260'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-09-20'::date, true, true, true, '8260'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-09-21'::date, true, true, true, '8260'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-09-22'::date, true, true, true, '8260'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-09-23'::date, true, true, true, '8260'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-09-24'::date, true, true, true, '8260');
INSERT INTO listing_availability_calendar (listing_id, day, is_available, am_available, pm_available, price_override) VALUES
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-09-25'::date, true, true, true, '8260'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-09-26'::date, false, false, false, '8260'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-09-27'::date, false, false, false, '8260'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-09-28'::date, true, true, true, '8260'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-09-29'::date, false, false, false, '8260'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-09-30'::date, false, false, false, '8260'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-10-01'::date, false, false, false, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-10-02'::date, false, false, false, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-10-03'::date, false, false, false, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-10-04'::date, false, false, false, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-10-05'::date, false, false, false, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-10-06'::date, false, false, false, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-10-07'::date, false, false, false, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-10-08'::date, false, false, false, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-10-09'::date, false, false, false, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-10-10'::date, true, true, true, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-10-11'::date, false, false, false, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-10-12'::date, true, true, true, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-10-13'::date, false, false, false, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-10-14'::date, false, false, false, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-10-15'::date, false, false, false, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-10-16'::date, false, false, false, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-10-17'::date, false, false, false, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-10-18'::date, true, true, true, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-10-19'::date, false, false, false, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-10-20'::date, false, false, false, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-10-21'::date, true, true, true, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-10-22'::date, true, true, true, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-10-23'::date, true, true, true, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-10-24'::date, true, true, true, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-10-25'::date, true, true, true, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-10-26'::date, true, true, true, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-10-27'::date, true, true, true, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-10-28'::date, true, true, true, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-10-29'::date, true, true, true, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-10-30'::date, true, true, true, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-10-31'::date, true, true, true, '5015'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-11-01'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-11-02'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-11-03'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-11-04'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-11-05'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-11-06'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-11-07'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-11-08'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-11-09'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-11-10'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-11-11'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-11-12'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-11-13'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-11-14'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-11-15'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-11-16'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-11-17'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-11-18'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-11-19'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-11-20'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-11-21'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-11-22'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-11-23'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-11-24'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-11-25'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-11-26'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-11-27'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-11-28'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-11-29'::date, true, true, true, '4720'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), '2026-11-30'::date, true, true, true, '4720');
INSERT INTO listing_holiday_home_details (listing_id, theme_codes, rule_codes, ical_managed)
    VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), ARRAY['sea_view','conservative','luxury','honeymoon','family','nature','pool','jacuzzi']::text[], ARRAY['no_pets','no_smoking','no_parties']::text[], false)
    ON CONFLICT (listing_id) DO UPDATE SET theme_codes = EXCLUDED.theme_codes, rule_codes = EXCLUDED.rule_codes;
DELETE FROM listing_attributes WHERE listing_id = (SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1) AND group_code IN ('tema','imported_amenity','ic_mekan','dis_mekan');
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'tema', 'sea_view', 'true'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'tema', 'conservative', 'true'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'tema', 'luxury', 'true'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'tema', 'honeymoon', 'true'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'tema', 'family', 'true'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'tema', 'nature', 'true'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'tema', 'pool', 'true'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'tema', 'jacuzzi', 'true'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'imported_amenity', 'klima', '{"label":"Klima","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'imported_amenity', 'barbeku', '{"label":"Barbekü","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'imported_amenity', 'nevresim', '{"label":"Nevresim","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'imported_amenity', 'karartma-perdesi', '{"label":"Karartma perdesi","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'imported_amenity', 'blender', '{"label":"Blender","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'imported_amenity', 'kahve-makinesi', '{"label":"Kahve makinesi","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'imported_amenity', 'pisirme-gerecleri', '{"label":"Pişirme gereçleri","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'imported_amenity', 'bebek-yatagi', '{"label":"Bebek yatağı","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'imported_amenity', 'catal-bicak-takimi', '{"label":"Çatal bıçak takımı","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'imported_amenity', 'yemek-masasi', '{"label":"Yemek masası","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'imported_amenity', 'yemek-takimi', '{"label":"Yemek takımı","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'imported_amenity', 'bulasik-makinesi', '{"label":"Bulaşık makinesi","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'imported_amenity', 'kurutma-makinesi', '{"label":"Kurutma makinesi","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'imported_amenity', 'ebeveyn-banyosu', '{"label":"Ebeveyn banyosu","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'imported_amenity', 'yangin-sondurucu', '{"label":"Yangın söndürücü","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'imported_amenity', 'somine', '{"label":"Şömine","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'imported_amenity', 'ilk-yardim-seti', '{"label":"İlk yardım seti","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'imported_amenity', 'ucretsiz-otopark', '{"label":"Ücretsiz otopark","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'imported_amenity', 'tam-mobilyali', '{"label":"Tam mobilyalı","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'imported_amenity', 'bahce', '{"label":"Bahçe","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'imported_amenity', 'bardak-takimi', '{"label":"Bardak takımı","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'imported_amenity', 'sac-kurutma-makinesi', '{"label":"Saç kurutma makinesi","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'imported_amenity', 'mama-sandalyesi', '{"label":"Mama sandalyesi","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'imported_amenity', 'sicak-su', '{"label":"Sıcak su","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'imported_amenity', 'utu', '{"label":"Ütü","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'imported_amenity', 'jakuzi', '{"label":"Jakuzi","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'imported_amenity', 'su-isiticisi', '{"label":"Su ısıtıcısı","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'imported_amenity', 'mikrodalga', '{"label":"Mikrodalga","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'imported_amenity', 'ic-mekanda-sigara-icilmez', '{"label":"İç mekânda sigara içilmez","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'imported_amenity', 'bahce-mobilyasi', '{"label":"Bahçe mobilyası","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'imported_amenity', 'firin', '{"label":"Fırın","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'imported_amenity', 'veranda', '{"label":"Veranda","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'imported_amenity', 'havuz-ve-bahce-bakimi', '{"label":"Havuz ve bahçe bakımı","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'imported_amenity', 'buzdolabi', '{"label":"Buzdolabı","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'imported_amenity', 'dusakabin', '{"label":"Duşakabin","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'imported_amenity', 'akilli-tv', '{"label":"Akıllı TV","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'imported_amenity', 'duman-dedektoru', '{"label":"Duman dedektörü","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'imported_amenity', 'ocak', '{"label":"Ocak","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'imported_amenity', 'sezlong', '{"label":"Şezlong","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'imported_amenity', 'guneslenme-yatagi', '{"label":"Güneşlenme yatağı","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'imported_amenity', 'salincak', '{"label":"Salıncak","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'imported_amenity', 'teras', '{"label":"Teras","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'imported_amenity', 'havlu', '{"label":"Havlu","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'imported_amenity', 'tv', '{"label":"TV","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'imported_amenity', 'gardirop', '{"label":"Gardırop","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'imported_amenity', 'camasir-makinesi', '{"label":"Çamaşır makinesi","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'imported_amenity', 'wi-fi', '{"label":"Wi-Fi","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
    VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'listing_meta', 'v1', '{"city":"Kaş","province_city":"Antalya","district_label":"İslamlar","region_display":"İslamlar, Kaş","address":"İslamlar, Kaş, Antalya, Türkiye","bed_count":"2","bath_count":"2","room_count":"2","max_guests":"4","property_type":"villa","pool_type":"Özel açık havuz","check_in_time":"16:00","check_out_time":"10:00","min_advance_booking_days":"1","short_stay_fee":"3000","min_short_stay_nights":"6","damage_deposit":"5000","ministry_license_ref":"07-9337","source_url":"https://www.birvillas.com/listing/Ohr7zRG8TXYfaJm2sBIg/villa-bella-3-lale-islamlar","bedrooms":[{"amenities":["jacuzzi","wardrobe","air-conditioning","blackout-curtains","tv"],"beds":[{"count":1,"type":"double"}],"ensuite":false,"id":"4c51f9b5-7d4c-4532-a239-47a1b42dac08"},{"amenities":["wardrobe","air-conditioning","blackout-curtains"],"ensuite":false,"id":"02ad2568-f868-439c-baec-019b78d55e6c","beds":[{"type":"single","count":2}]}]}'::jsonb)
    ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
      value_json = COALESCE(listing_attributes.value_json, '{}'::jsonb) || EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
    VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'Ohr7zRG8TXYfaJm2sBIg') OR slug = 'villa-bella-3-lale-islamlar' LIMIT 1), 'birvillas', 'snapshot', '{"source_url":"https://www.birvillas.com/listing/Ohr7zRG8TXYfaJm2sBIg/villa-bella-3-lale-islamlar","external_ref":"Ohr7zRG8TXYfaJm2sBIg","imported_at":"2026-07-20T18:05:34.740Z","currency":"TRY","price_note":"Fiyat ve müsaitlik Birvillas canlı ilan verisinden alınmıştır."}'::jsonb)
    ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
-- villa-bella-4-leylak-islamlar
UPDATE listings SET
    currency_code = 'TRY',
    min_stay_nights = 5,
    vitrin_price = 7529,
    first_charge_amount = COALESCE(5000, first_charge_amount),
    map_lat = '36.30052595273047',
    map_lng = '29.41033720491976',
    location_name = 'İslamlar, Kaş, Antalya',
    ministry_license_ref = COALESCE('07-9336', ministry_license_ref),
    updated_at = now()
  WHERE id = (SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1);
DELETE FROM listing_price_rules WHERE listing_id = (SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1);
INSERT INTO listing_price_rules (listing_id, rule_json, valid_from, valid_to)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '{"base_nightly":"8800","weekly_total":"61600","weekend_nightly":"","label":"summer","min_nights":"3"}'::jsonb, '2026-07-07'::date, '2026-09-05'::date);
INSERT INTO listing_price_rules (listing_id, rule_json, valid_from, valid_to)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '{"base_nightly":"6160","weekly_total":"43120","weekend_nightly":"","label":"autumn-1","min_nights":"3"}'::jsonb, '2026-09-06'::date, '2026-09-30'::date);
INSERT INTO listing_price_rules (listing_id, rule_json, valid_from, valid_to)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '{"base_nightly":"3740","weekly_total":"26180","weekend_nightly":"","label":"autumn","min_nights":"3"}'::jsonb, '2026-10-01'::date, '2026-10-31'::date);
INSERT INTO listing_price_rules (listing_id, rule_json, valid_from, valid_to)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '{"base_nightly":"3520","weekly_total":"24640","weekend_nightly":"","label":"autumn-2","min_nights":"3"}'::jsonb, '2026-11-01'::date, '2026-11-30'::date);
DELETE FROM listing_availability_calendar WHERE listing_id = (SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1);
INSERT INTO listing_availability_calendar (listing_id, day, is_available, am_available, pm_available, price_override) VALUES
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-07-07'::date, true, true, true, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-07-08'::date, true, true, true, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-07-09'::date, true, true, true, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-07-10'::date, true, true, true, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-07-11'::date, true, true, true, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-07-12'::date, true, true, true, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-07-13'::date, true, true, true, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-07-14'::date, true, true, true, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-07-15'::date, true, true, true, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-07-16'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-07-17'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-07-18'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-07-19'::date, true, true, true, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-07-20'::date, true, true, true, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-07-21'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-07-22'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-07-23'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-07-24'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-07-25'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-07-26'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-07-27'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-07-28'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-07-29'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-07-30'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-07-31'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-08-01'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-08-02'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-08-03'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-08-04'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-08-05'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-08-06'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-08-07'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-08-08'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-08-09'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-08-10'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-08-11'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-08-12'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-08-13'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-08-14'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-08-15'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-08-16'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-08-17'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-08-18'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-08-19'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-08-20'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-08-21'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-08-22'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-08-23'::date, true, true, true, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-08-24'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-08-25'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-08-26'::date, true, true, true, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-08-27'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-08-28'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-08-29'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-08-30'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-08-31'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-09-01'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-09-02'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-09-03'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-09-04'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-09-05'::date, false, false, false, '8800'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-09-06'::date, false, false, false, '6160'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-09-07'::date, false, false, false, '6160'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-09-08'::date, false, false, false, '6160'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-09-09'::date, false, false, false, '6160'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-09-10'::date, false, false, false, '6160'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-09-11'::date, false, false, false, '6160'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-09-12'::date, false, false, false, '6160'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-09-13'::date, false, false, false, '6160'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-09-14'::date, true, true, true, '6160'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-09-15'::date, true, true, true, '6160'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-09-16'::date, false, false, false, '6160'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-09-17'::date, false, false, false, '6160'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-09-18'::date, false, false, false, '6160'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-09-19'::date, false, false, false, '6160'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-09-20'::date, true, true, true, '6160'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-09-21'::date, false, false, false, '6160'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-09-22'::date, false, false, false, '6160'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-09-23'::date, true, true, true, '6160'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-09-24'::date, true, true, true, '6160');
INSERT INTO listing_availability_calendar (listing_id, day, is_available, am_available, pm_available, price_override) VALUES
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-09-25'::date, true, true, true, '6160'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-09-26'::date, true, true, true, '6160'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-09-27'::date, true, true, true, '6160'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-09-28'::date, true, true, true, '6160'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-09-29'::date, true, true, true, '6160'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-09-30'::date, false, false, false, '6160'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-10-01'::date, false, false, false, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-10-02'::date, true, true, true, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-10-03'::date, false, false, false, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-10-04'::date, false, false, false, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-10-05'::date, false, false, false, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-10-06'::date, false, false, false, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-10-07'::date, false, false, false, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-10-08'::date, false, false, false, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-10-09'::date, false, false, false, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-10-10'::date, true, true, true, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-10-11'::date, false, false, false, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-10-12'::date, false, false, false, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-10-13'::date, true, true, true, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-10-14'::date, true, true, true, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-10-15'::date, true, true, true, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-10-16'::date, true, true, true, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-10-17'::date, true, true, true, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-10-18'::date, true, true, true, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-10-19'::date, true, true, true, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-10-20'::date, true, true, true, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-10-21'::date, true, true, true, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-10-22'::date, true, true, true, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-10-23'::date, false, false, false, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-10-24'::date, false, false, false, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-10-25'::date, true, true, true, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-10-26'::date, false, false, false, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-10-27'::date, false, false, false, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-10-28'::date, false, false, false, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-10-29'::date, false, false, false, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-10-30'::date, false, false, false, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-10-31'::date, false, false, false, '3740'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-11-01'::date, false, false, false, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-11-02'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-11-03'::date, false, false, false, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-11-04'::date, false, false, false, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-11-05'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-11-06'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-11-07'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-11-08'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-11-09'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-11-10'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-11-11'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-11-12'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-11-13'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-11-14'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-11-15'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-11-16'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-11-17'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-11-18'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-11-19'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-11-20'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-11-21'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-11-22'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-11-23'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-11-24'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-11-25'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-11-26'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-11-27'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-11-28'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-11-29'::date, true, true, true, '3520'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), '2026-11-30'::date, true, true, true, '3520');
INSERT INTO listing_holiday_home_details (listing_id, theme_codes, rule_codes, ical_managed)
    VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), ARRAY['sea_view','conservative','luxury','honeymoon','nature','pool','jacuzzi']::text[], ARRAY['no_pets','no_smoking','no_parties']::text[], false)
    ON CONFLICT (listing_id) DO UPDATE SET theme_codes = EXCLUDED.theme_codes, rule_codes = EXCLUDED.rule_codes;
DELETE FROM listing_attributes WHERE listing_id = (SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1) AND group_code IN ('tema','imported_amenity','ic_mekan','dis_mekan');
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'tema', 'sea_view', 'true'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'tema', 'conservative', 'true'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'tema', 'luxury', 'true'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'tema', 'honeymoon', 'true'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'tema', 'nature', 'true'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'tema', 'pool', 'true'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'tema', 'jacuzzi', 'true'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'imported_amenity', 'klima', '{"label":"Klima","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'imported_amenity', 'barbeku', '{"label":"Barbekü","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'imported_amenity', 'nevresim', '{"label":"Nevresim","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'imported_amenity', 'karartma-perdesi', '{"label":"Karartma perdesi","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'imported_amenity', 'blender', '{"label":"Blender","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'imported_amenity', 'kahve-makinesi', '{"label":"Kahve makinesi","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'imported_amenity', 'coffee-maker', '{"label":"coffee maker","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'imported_amenity', 'pisirme-gerecleri', '{"label":"Pişirme gereçleri","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'imported_amenity', 'bebek-yatagi', '{"label":"Bebek yatağı","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'imported_amenity', 'catal-bicak-takimi', '{"label":"Çatal bıçak takımı","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'imported_amenity', 'yemek-masasi', '{"label":"Yemek masası","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'imported_amenity', 'yemek-takimi', '{"label":"Yemek takımı","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'imported_amenity', 'bulasik-makinesi', '{"label":"Bulaşık makinesi","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'imported_amenity', 'kurutma-makinesi', '{"label":"Kurutma makinesi","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'imported_amenity', 'ebeveyn-banyosu', '{"label":"Ebeveyn banyosu","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'imported_amenity', 'yangin-sondurucu', '{"label":"Yangın söndürücü","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'imported_amenity', 'somine', '{"label":"Şömine","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'imported_amenity', 'ilk-yardim-seti', '{"label":"İlk yardım seti","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'imported_amenity', 'ucretsiz-otopark', '{"label":"Ücretsiz otopark","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'imported_amenity', 'tam-mobilyali', '{"label":"Tam mobilyalı","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'imported_amenity', 'bahce', '{"label":"Bahçe","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'imported_amenity', 'bardak-takimi', '{"label":"Bardak takımı","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'imported_amenity', 'sac-kurutma-makinesi', '{"label":"Saç kurutma makinesi","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'imported_amenity', 'hangers', '{"label":"hangers","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'imported_amenity', 'mama-sandalyesi', '{"label":"Mama sandalyesi","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'imported_amenity', 'sicak-su', '{"label":"Sıcak su","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'imported_amenity', 'utu', '{"label":"Ütü","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'imported_amenity', 'jakuzi', '{"label":"Jakuzi","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'imported_amenity', 'su-isiticisi', '{"label":"Su ısıtıcısı","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'imported_amenity', 'mikrodalga', '{"label":"Mikrodalga","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'imported_amenity', 'ic-mekanda-sigara-icilmez', '{"label":"İç mekânda sigara içilmez","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'imported_amenity', 'bahce-mobilyasi', '{"label":"Bahçe mobilyası","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'imported_amenity', 'firin', '{"label":"Fırın","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'imported_amenity', 'veranda', '{"label":"Veranda","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'imported_amenity', 'buzdolabi', '{"label":"Buzdolabı","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'imported_amenity', 'dusakabin', '{"label":"Duşakabin","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'imported_amenity', 'duman-dedektoru', '{"label":"Duman dedektörü","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'imported_amenity', 'solar-energy', '{"label":"solar energy","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'imported_amenity', 'ocak', '{"label":"Ocak","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'imported_amenity', 'sezlong', '{"label":"Şezlong","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'imported_amenity', 'guneslenme-yatagi', '{"label":"Güneşlenme yatağı","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'imported_amenity', 'salincak', '{"label":"Salıncak","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'imported_amenity', 'teras', '{"label":"Teras","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'imported_amenity', 'toaster', '{"label":"toaster","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'imported_amenity', 'tv', '{"label":"TV","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'imported_amenity', 'gardirop', '{"label":"Gardırop","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'imported_amenity', 'camasir-makinesi', '{"label":"Çamaşır makinesi","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'imported_amenity', 'wi-fi', '{"label":"Wi-Fi","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
    VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'listing_meta', 'v1', '{"city":"Kaş","province_city":"Antalya","district_label":"İslamlar","region_display":"İslamlar, Kaş","address":"İslamlar, Kaş, Antalya, Türkiye","bed_count":"1","bath_count":"1","room_count":"1","max_guests":"2","property_type":"villa","pool_type":"Özel açık havuz","check_in_time":"16:00","check_out_time":"10:00","min_advance_booking_days":"1","short_stay_fee":"2500","min_short_stay_nights":"6","damage_deposit":"5000","ministry_license_ref":"07-9336","source_url":"https://www.birvillas.com/listing/p32t5PQB7oycOmJ6jEXW/villa-bella-4-leylak-islamlar","bedrooms":[{"id":"25659f39-5df1-41ae-af10-048a84c64b7b","beds":[{"count":1,"type":"double"}],"ensuite":false,"amenities":["jacuzzi","tv","air-conditioning","blackout-curtains","wardrobe"]}]}'::jsonb)
    ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
      value_json = COALESCE(listing_attributes.value_json, '{}'::jsonb) || EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
    VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'p32t5PQB7oycOmJ6jEXW') OR slug = 'villa-bella-4-leylak-islamlar' LIMIT 1), 'birvillas', 'snapshot', '{"source_url":"https://www.birvillas.com/listing/p32t5PQB7oycOmJ6jEXW/villa-bella-4-leylak-islamlar","external_ref":"p32t5PQB7oycOmJ6jEXW","imported_at":"2026-07-20T18:05:35.483Z","currency":"TRY","price_note":"Fiyat ve müsaitlik Birvillas canlı ilan verisinden alınmıştır."}'::jsonb)
    ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
-- villa-bella-5-kartal-yuvasi-islamlar
UPDATE listings SET
    currency_code = 'TRY',
    min_stay_nights = 6,
    vitrin_price = 5940,
    first_charge_amount = COALESCE(10000, first_charge_amount),
    map_lat = '36.300704316459',
    map_lng = '29.410164096058125',
    location_name = 'İslamlar, Kaş, Antalya',
    ministry_license_ref = COALESCE('07-9335', ministry_license_ref),
    updated_at = now()
  WHERE id = (SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1);
DELETE FROM listing_price_rules WHERE listing_id = (SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1);
INSERT INTO listing_price_rules (listing_id, rule_json, valid_from, valid_to)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '{"base_nightly":"16500","weekly_total":"115500","weekend_nightly":"","label":"summer","min_nights":"1"}'::jsonb, '2026-07-07'::date, '2026-09-05'::date);
INSERT INTO listing_price_rules (listing_id, rule_json, valid_from, valid_to)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '{"base_nightly":"11550","weekly_total":"80850","weekend_nightly":"","label":"autumn-2","min_nights":"3"}'::jsonb, '2026-09-06'::date, '2026-09-30'::date);
INSERT INTO listing_price_rules (listing_id, rule_json, valid_from, valid_to)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '{"base_nightly":"7000","weekly_total":"49000","weekend_nightly":"","label":"autumn","min_nights":"3"}'::jsonb, '2026-10-01'::date, '2026-10-31'::date);
INSERT INTO listing_price_rules (listing_id, rule_json, valid_from, valid_to)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '{"base_nightly":"6600","weekly_total":"46200","weekend_nightly":"","label":"autumn-2","min_nights":"3"}'::jsonb, '2026-11-01'::date, '2026-11-30'::date);
DELETE FROM listing_availability_calendar WHERE listing_id = (SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1);
INSERT INTO listing_availability_calendar (listing_id, day, is_available, am_available, pm_available, price_override) VALUES
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-07-07'::date, true, true, true, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-07-08'::date, true, true, true, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-07-09'::date, true, true, true, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-07-10'::date, true, true, true, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-07-11'::date, true, true, true, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-07-12'::date, true, true, true, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-07-13'::date, true, true, true, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-07-14'::date, true, true, true, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-07-15'::date, true, true, true, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-07-16'::date, true, true, true, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-07-17'::date, false, false, false, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-07-18'::date, false, false, false, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-07-19'::date, false, false, false, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-07-20'::date, false, false, false, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-07-21'::date, true, true, true, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-07-22'::date, true, true, true, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-07-23'::date, false, false, false, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-07-24'::date, false, false, false, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-07-25'::date, false, false, false, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-07-26'::date, false, false, false, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-07-27'::date, false, false, false, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-07-28'::date, false, false, false, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-07-29'::date, false, false, false, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-07-30'::date, false, false, false, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-07-31'::date, false, false, false, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-08-01'::date, false, false, false, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-08-02'::date, false, false, false, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-08-03'::date, false, false, false, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-08-04'::date, false, false, false, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-08-05'::date, false, false, false, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-08-06'::date, false, false, false, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-08-07'::date, false, false, false, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-08-08'::date, false, false, false, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-08-09'::date, false, false, false, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-08-10'::date, false, false, false, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-08-11'::date, false, false, false, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-08-12'::date, false, false, false, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-08-13'::date, false, false, false, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-08-14'::date, false, false, false, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-08-15'::date, false, false, false, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-08-16'::date, false, false, false, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-08-17'::date, true, true, true, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-08-18'::date, true, true, true, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-08-19'::date, true, true, true, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-08-20'::date, false, false, false, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-08-21'::date, false, false, false, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-08-22'::date, false, false, false, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-08-23'::date, false, false, false, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-08-24'::date, false, false, false, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-08-25'::date, false, false, false, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-08-26'::date, true, true, true, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-08-27'::date, true, true, true, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-08-28'::date, true, true, true, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-08-29'::date, true, true, true, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-08-30'::date, true, true, true, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-08-31'::date, true, true, true, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-09-01'::date, true, true, true, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-09-02'::date, true, true, true, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-09-03'::date, true, true, true, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-09-04'::date, true, true, true, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-09-05'::date, true, true, true, '16500'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-09-06'::date, true, true, true, '11550'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-09-07'::date, true, true, true, '11550'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-09-08'::date, false, false, false, '11550'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-09-09'::date, false, false, false, '11550'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-09-10'::date, true, true, true, '11550'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-09-11'::date, false, false, false, '11550'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-09-12'::date, false, false, false, '11550'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-09-13'::date, false, false, false, '11550'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-09-14'::date, false, false, false, '11550'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-09-15'::date, false, false, false, '11550'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-09-16'::date, false, false, false, '11550'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-09-17'::date, true, true, true, '11550'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-09-18'::date, false, false, false, '11550'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-09-19'::date, false, false, false, '11550'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-09-20'::date, true, true, true, '11550'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-09-21'::date, true, true, true, '11550'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-09-22'::date, true, true, true, '11550'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-09-23'::date, true, true, true, '11550'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-09-24'::date, true, true, true, '11550');
INSERT INTO listing_availability_calendar (listing_id, day, is_available, am_available, pm_available, price_override) VALUES
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-09-25'::date, true, true, true, '11550'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-09-26'::date, true, true, true, '11550'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-09-27'::date, true, true, true, '11550'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-09-28'::date, true, true, true, '11550'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-09-29'::date, true, true, true, '11550'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-09-30'::date, true, true, true, '11550'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-10-01'::date, true, true, true, '7000'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-10-02'::date, true, true, true, '7000'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-10-03'::date, true, true, true, '7000'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-10-04'::date, true, true, true, '7000'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-10-05'::date, true, true, true, '7000'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-10-06'::date, true, true, true, '7000'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-10-07'::date, true, true, true, '7000'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-10-08'::date, true, true, true, '7000'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-10-09'::date, true, true, true, '7000'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-10-10'::date, true, true, true, '7000'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-10-11'::date, true, true, true, '7000'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-10-12'::date, true, true, true, '7000'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-10-13'::date, true, true, true, '7000'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-10-14'::date, true, true, true, '7000'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-10-15'::date, true, true, true, '7000'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-10-16'::date, true, true, true, '7000'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-10-17'::date, true, true, true, '7000'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-10-18'::date, true, true, true, '7000'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-10-19'::date, true, true, true, '7000'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-10-20'::date, true, true, true, '7000'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-10-21'::date, true, true, true, '7000'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-10-22'::date, true, true, true, '7000'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-10-23'::date, true, true, true, '7000'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-10-24'::date, true, true, true, '7000'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-10-25'::date, true, true, true, '7000'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-10-26'::date, true, true, true, '7000'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-10-27'::date, true, true, true, '7000'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-10-28'::date, true, true, true, '7000'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-10-29'::date, true, true, true, '7000'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-10-30'::date, true, true, true, '7000'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-10-31'::date, true, true, true, '7000'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-11-01'::date, true, true, true, '6600'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-11-02'::date, true, true, true, '6600'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-11-03'::date, true, true, true, '6600'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-11-04'::date, true, true, true, '6600'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-11-05'::date, true, true, true, '6600'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-11-06'::date, true, true, true, '6600'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-11-07'::date, true, true, true, '6600'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-11-08'::date, true, true, true, '6600'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-11-09'::date, true, true, true, '6600'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-11-10'::date, true, true, true, '6600'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-11-11'::date, true, true, true, '6600'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-11-12'::date, true, true, true, '6600'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-11-13'::date, true, true, true, '6600'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-11-14'::date, true, true, true, '6600'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-11-15'::date, true, true, true, '6600'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-11-16'::date, true, true, true, '6600'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-11-17'::date, true, true, true, '6600'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-11-18'::date, true, true, true, '6600'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-11-19'::date, true, true, true, '6600'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-11-20'::date, true, true, true, '6600'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-11-21'::date, true, true, true, '6600'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-11-22'::date, true, true, true, '6600'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-11-23'::date, true, true, true, '6600'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-11-24'::date, true, true, true, '6600'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-11-25'::date, true, true, true, '6600'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-11-26'::date, true, true, true, '6600'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-11-27'::date, true, true, true, '6600'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-11-28'::date, true, true, true, '6600'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-11-29'::date, true, true, true, '6600'),
((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), '2026-11-30'::date, true, true, true, '6600');
INSERT INTO listing_holiday_home_details (listing_id, theme_codes, rule_codes, ical_managed)
    VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), ARRAY['sea_view','conservative','luxury','nature','pool','jacuzzi']::text[], ARRAY['no_pets','no_smoking','no_parties']::text[], false)
    ON CONFLICT (listing_id) DO UPDATE SET theme_codes = EXCLUDED.theme_codes, rule_codes = EXCLUDED.rule_codes;
DELETE FROM listing_attributes WHERE listing_id = (SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1) AND group_code IN ('tema','imported_amenity','ic_mekan','dis_mekan');
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'tema', 'sea_view', 'true'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'tema', 'conservative', 'true'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'tema', 'luxury', 'true'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'tema', 'nature', 'true'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'tema', 'pool', 'true'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'tema', 'jacuzzi', 'true'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'imported_amenity', 'klima', '{"label":"Klima","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'imported_amenity', 'barbeku', '{"label":"Barbekü","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'imported_amenity', 'nevresim', '{"label":"Nevresim","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'imported_amenity', 'karartma-perdesi', '{"label":"Karartma perdesi","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'imported_amenity', 'blender', '{"label":"Blender","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'imported_amenity', 'kahve-makinesi', '{"label":"Kahve makinesi","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'imported_amenity', 'pisirme-gerecleri', '{"label":"Pişirme gereçleri","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'imported_amenity', 'bebek-yatagi', '{"label":"Bebek yatağı","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'imported_amenity', 'catal-bicak-takimi', '{"label":"Çatal bıçak takımı","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'imported_amenity', 'yemek-masasi', '{"label":"Yemek masası","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'imported_amenity', 'yemek-takimi', '{"label":"Yemek takımı","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'imported_amenity', 'bulasik-makinesi', '{"label":"Bulaşık makinesi","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'imported_amenity', 'kurutma-makinesi', '{"label":"Kurutma makinesi","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'imported_amenity', 'ebeveyn-banyosu', '{"label":"Ebeveyn banyosu","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'imported_amenity', 'yangin-sondurucu', '{"label":"Yangın söndürücü","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'imported_amenity', 'somine', '{"label":"Şömine","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'imported_amenity', 'ilk-yardim-seti', '{"label":"İlk yardım seti","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'imported_amenity', 'ucretsiz-otopark', '{"label":"Ücretsiz otopark","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'imported_amenity', 'tam-mobilyali', '{"label":"Tam mobilyalı","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'imported_amenity', 'bahce', '{"label":"Bahçe","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'imported_amenity', 'bardak-takimi', '{"label":"Bardak takımı","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'imported_amenity', 'sac-kurutma-makinesi', '{"label":"Saç kurutma makinesi","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'imported_amenity', 'mama-sandalyesi', '{"label":"Mama sandalyesi","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'imported_amenity', 'sicak-su', '{"label":"Sıcak su","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'imported_amenity', 'utu', '{"label":"Ütü","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'imported_amenity', 'jakuzi', '{"label":"Jakuzi","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'imported_amenity', 'su-isiticisi', '{"label":"Su ısıtıcısı","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'imported_amenity', 'mikrodalga', '{"label":"Mikrodalga","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'imported_amenity', 'ic-mekanda-sigara-icilmez', '{"label":"İç mekânda sigara içilmez","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'imported_amenity', 'bahce-mobilyasi', '{"label":"Bahçe mobilyası","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'imported_amenity', 'firin', '{"label":"Fırın","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'imported_amenity', 'veranda', '{"label":"Veranda","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'imported_amenity', 'havuz-ve-bahce-bakimi', '{"label":"Havuz ve bahçe bakımı","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'imported_amenity', 'buzdolabi', '{"label":"Buzdolabı","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'imported_amenity', 'dusakabin', '{"label":"Duşakabin","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'imported_amenity', 'akilli-tv', '{"label":"Akıllı TV","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'imported_amenity', 'duman-dedektoru', '{"label":"Duman dedektörü","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'imported_amenity', 'ocak', '{"label":"Ocak","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'imported_amenity', 'sezlong', '{"label":"Şezlong","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'imported_amenity', 'guneslenme-yatagi', '{"label":"Güneşlenme yatağı","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'imported_amenity', 'salincak', '{"label":"Salıncak","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'imported_amenity', 'teras', '{"label":"Teras","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'imported_amenity', 'havlu', '{"label":"Havlu","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'imported_amenity', 'tv', '{"label":"TV","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'imported_amenity', 'gardirop', '{"label":"Gardırop","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'imported_amenity', 'camasir-makinesi', '{"label":"Çamaşır makinesi","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'imported_amenity', 'wi-fi', '{"label":"Wi-Fi","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
      VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'imported_amenity', 'balcony', '{"label":"balcony","enabled":true}'::jsonb)
      ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
    VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'listing_meta', 'v1', '{"city":"Kaş","province_city":"Antalya","district_label":"İslamlar","region_display":"İslamlar, Kaş","address":"İslamlar, Kaş, Antalya, Türkiye","bed_count":"3","bath_count":"3","room_count":"3","max_guests":"6","property_type":"villa","pool_type":"Özel açık havuz","check_in_time":"16:00","check_out_time":"10:00","min_advance_booking_days":"1","short_stay_fee":"4000","min_short_stay_nights":"6","damage_deposit":"10000","ministry_license_ref":"07-9335","source_url":"https://www.birvillas.com/listing/pfosunWEj7iQaf36WVbT/villa-bella-5-kartal-yuvasi-islamlar","bedrooms":[{"ensuite":true,"beds":[{"count":1,"type":"double"}],"id":"bedroom-1","amenities":["air-conditioning","ensuite","jacuzzi","turkish-bath","fireplace","tv","blackout-curtains","wardrobe"]},{"amenities":["air-conditioning","ensuite","jacuzzi","tv","wardrobe","blackout-curtains"],"beds":[{"count":1,"type":"double"}],"id":"bedroom-2","ensuite":true},{"beds":[{"type":"single","count":2}],"id":"bedroom-3","amenities":["air-conditioning","ensuite","tv","wardrobe","blackout-curtains"],"ensuite":true}]}'::jsonb)
    ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
      value_json = COALESCE(listing_attributes.value_json, '{}'::jsonb) || EXCLUDED.value_json;
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
    VALUES ((SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = 'pfosunWEj7iQaf36WVbT') OR slug = 'villa-bella-5-kartal-yuvasi-islamlar' LIMIT 1), 'birvillas', 'snapshot', '{"source_url":"https://www.birvillas.com/listing/pfosunWEj7iQaf36WVbT/villa-bella-5-kartal-yuvasi-islamlar","external_ref":"pfosunWEj7iQaf36WVbT","imported_at":"2026-07-20T18:05:36.922Z","currency":"TRY","price_note":"Fiyat ve müsaitlik Birvillas canlı ilan verisinden alınmıştır."}'::jsonb)
    ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json;
SELECT refresh_listing_vitrin_prices();
SELECT l.slug, l.vitrin_price::text, l.min_stay_nights,
  (SELECT count(*) FROM listing_price_rules pr WHERE pr.listing_id = l.id) AS bands,
  (SELECT count(*) FROM listing_availability_calendar c WHERE c.listing_id = l.id) AS days,
  coalesce(array_to_string(h.theme_codes, ','), '') AS themes
FROM listings l
LEFT JOIN listing_holiday_home_details h ON h.listing_id = l.id
WHERE l.external_provider_code = 'birvillas'
  AND l.external_listing_ref IN (
    'tc97shkNcDvOfEPCKSVs','40N1KtxyzUcj1AjNmo8e','Ohr7zRG8TXYfaJm2sBIg',
    'p32t5PQB7oycOmJ6jEXW','pfosunWEj7iQaf36WVbT'
  )
ORDER BY l.slug;
COMMIT;
