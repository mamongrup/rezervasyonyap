-- Toplu konum düzeltmesi: Fethiye kuşağı + NG otelleri
-- Kaynak: Bookeder JSON-LD streetAddress / mahalle (Kargı, Çalış, Faralya, Taşyaka, …)

BEGIN;

WITH fixes(
  ref, location_name, district, city, province, address, lat, lng
) AS (
  VALUES
    -- Fethiye kuşağı
    ('oyster-residences', 'Ölüdeniz, Fethiye, Muğla', 'Ölüdeniz', 'Fethiye', 'Muğla',
      '1. Sokak, Ölüdeniz, Fethiye/Muğla', 36.546885, 29.122292),
    ('jade-residence', 'Ölüdeniz, Fethiye, Muğla', 'Ölüdeniz', 'Fethiye', 'Muğla',
      '224. Sokak No:3, Ölüdeniz, Fethiye/Muğla', 36.547251, 29.122074),
    ('lissiya-hotel', 'Faralya, Fethiye, Muğla', 'Faralya', 'Fethiye', 'Muğla',
      'Uzunyurt Koyu Kabak No:16, Faralya, Ölüdeniz/Fethiye', 36.470342, 29.128278),
    ('jiva-beach-resort', 'Çalış, Fethiye, Muğla', 'Çalış', 'Fethiye', 'Muğla',
      'Karagedik Mah. 1112. Sok. No:14, Çalış, Fethiye/Muğla', 36.673877, 29.101852),
    ('liberty-fabay', 'Kargı, Fethiye, Muğla', 'Kargı', 'Fethiye', 'Muğla',
      'Kargı Mahallesi 202 Manolya Sokak No:4/2, Fethiye/Muğla', 36.6822, 29.078262),
    ('sundia-exclusive-by-liberty-fethiye', 'Çalış, Fethiye, Muğla', 'Çalış', 'Fethiye', 'Muğla',
      'Foça Mahallesi 1085. Sokak, Çalış, Fethiye/Muğla', 36.665517, 29.107713),
    ('lykia-botanika-beach-fun-club', 'Yanıklar, Fethiye, Muğla', 'Yanıklar', 'Fethiye', 'Muğla',
      'Yanıklar Mahallesi, Yanıklar, Fethiye/Muğla', 36.690653, 29.049906),
    ('liberty-signa', 'Kargı, Fethiye, Muğla', 'Kargı', 'Fethiye', 'Muğla',
      'Kargı Mahallesi 202 Manolya Sokak No:4/3, Fethiye/Muğla', 36.682583, 29.080148),
    ('akra-fethiye-tui-blue-sensatori', 'Kargı, Fethiye, Muğla', 'Kargı', 'Fethiye', 'Muğla',
      'Kargı Mahallesi 202 Manolya Sokak No:4/1, Fethiye/Muğla', 36.683679, 29.075203),
    ('orka-cove-hotel-penthouse-suites', 'Ölüdeniz, Fethiye, Muğla', 'Ölüdeniz', 'Fethiye', 'Muğla',
      'Ölüdeniz Mah. İmar Ağartan Cad. No:4/1, Ocakköy, Fethiye/Muğla', 36.590401, 29.146622),
    ('exelans-hotel-spa', 'Taşyaka, Fethiye, Muğla', 'Taşyaka', 'Fethiye', 'Muğla',
      'Taşyaka Mah. 246. Sokak No:6, Ölüdeniz/Fethiye', 36.623793, 29.129629),
    ('xo-cape-arnna-fethiye', 'Kargı, Fethiye, Muğla', 'Kargı', 'Fethiye', 'Muğla',
      'Kargı Mahallesi Manolya Sokak No:4/4, Fethiye/Muğla', 36.682095, 29.081783),
    ('akra-fethiye-the-residence-tui-blue-sensatori', 'Kargı, Fethiye, Muğla', 'Kargı', 'Fethiye', 'Muğla',
      'Kargı Mahallesi 202 Manolya Sokak No:4/1, Fethiye/Muğla', 36.68335, 29.07366),
    ('silence-villas', 'Kargı, Fethiye, Muğla', 'Kargı', 'Fethiye', 'Muğla',
      'Kargı Mahallesi Zafer Sokak No:39/A, Fethiye/Muğla', 36.685849, 29.081465),
    -- NG
    ('ng-phaselis-bay', 'Göynük, Kemer, Antalya', 'Göynük', 'Kemer', 'Antalya',
      'Göynük / Kemer, Antalya', 36.643093, 30.556439),
    ('ng-enjoy', 'Kırkpınar, Sapanca, Sakarya', 'Kırkpınar', 'Sapanca', 'Sakarya',
      'Tepebaşı Mh. Şehit Cevdet Koç Cd. No:69, Kırkpınar, Sapanca', 40.689984, 30.216715),
    ('ng-sapanca', 'Kırkpınar, Sapanca, Sakarya', 'Kırkpınar', 'Sapanca', 'Sakarya',
      'Tepebaşı Mah. Şehit Cevdet Koç Cad. No:73, Kırkpınar, Sapanca', 40.690861, 30.215144),
    ('ng-afyon-wellness-convention', 'Merkez, Afyonkarahisar', 'Merkez', 'Afyonkarahisar', 'Afyonkarahisar',
      'İzmir–Ankara Karayolu 7. Km, Afyonkarahisar', 38.784728, 30.477748),
    ('ng-sign-bodrum', 'Ortakent, Bodrum, Muğla', 'Ortakent', 'Bodrum', 'Muğla',
      'Yahşi Koyu, Kargı Cd. No:118, Ortakent, Bodrum/Muğla', 37.009044, 27.326831)
),
targets AS (
  SELECT l.id AS listing_id, f.*
  FROM fixes f
  JOIN listings l
    ON l.external_provider_code = 'tatilbudur'
   AND l.external_listing_ref = f.ref
)
UPDATE listings l
SET
  location_name = t.location_name,
  map_lat = t.lat,
  map_lng = t.lng,
  updated_at = now()
FROM targets t
WHERE l.id = t.listing_id;

INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
SELECT
  t.listing_id,
  'listing_meta',
  'v1',
  jsonb_build_object(
    'district_label', t.district,
    'city', t.city,
    'province_city', t.province,
    'region_display', t.district || ', ' || t.city,
    'address', t.address,
    'lat', t.lat::text,
    'lng', t.lng::text
  )
FROM targets t
ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
  value_json = listing_attributes.value_json
    || jsonb_build_object(
      'district_label', EXCLUDED.value_json->>'district_label',
      'city', EXCLUDED.value_json->>'city',
      'province_city', EXCLUDED.value_json->>'province_city',
      'region_display', EXCLUDED.value_json->>'region_display',
      'address', EXCLUDED.value_json->>'address',
      'lat', EXCLUDED.value_json->>'lat',
      'lng', EXCLUDED.value_json->>'lng'
    );

-- TR açıklamalardaki bariz yanlış bölge etiketleri
UPDATE listing_translations lt
SET
  description = replace(
    replace(
      replace(lt.description, 'Kayaköy, Fethiye, Muğla', 'Kargı, Fethiye, Muğla'),
      'Karaçulha, Fethiye, Muğla',
      'Kargı, Fethiye, Muğla'
    ),
    'Ölüdeniz, Fethiye, Muğla — Foça',
    'Çalış, Fethiye, Muğla — Foça'
  ),
  updated_at = now()
FROM targets t
WHERE lt.listing_id = t.listing_id
  AND lt.description IS NOT NULL;

SELECT
  l.external_listing_ref AS ref,
  l.location_name,
  la.value_json->>'district_label' AS district,
  la.value_json->>'address' AS address
FROM targets t
JOIN listings l ON l.id = t.listing_id
LEFT JOIN listing_attributes la
  ON la.listing_id = l.id AND la.group_code = 'listing_meta' AND la.key = 'v1'
ORDER BY l.external_listing_ref;

COMMIT;
