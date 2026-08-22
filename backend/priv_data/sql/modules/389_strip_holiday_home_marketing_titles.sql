-- Tatil evi başlıklarından AI/SEO slogan soneklerini düşür.
-- Örn. "Gülbay Villa - Fethiye Kayaköy'de Doğayla İç İçe Huzurlu Villa" → "Gülbay Villa"
-- Kullanıcı ilan adı yazmış; konum sloganı AI listing-content tarafından eklenmişti.

WITH holiday AS (
  SELECT l.id
  FROM listings l
  JOIN product_categories pc ON pc.id = l.category_id
  WHERE pc.code = 'holiday_home'
),
targets AS (
  SELECT lt.ctid AS row_id,
         trim(both FROM split_part(lt.title, ' - ', 1)) AS clean_title
  FROM listing_translations lt
  JOIN holiday h ON h.id = lt.listing_id
  WHERE lt.title LIKE '% - %'
    AND (
      lt.title ~* $$ - .+(da|de|ta|te|nda|nde).+(villa|apart|bungalov|daire)$$
      OR lt.title ~* $$ - .+(özel\s+havuzlu|huzurlu|lüks|manzaralı|doğayla|merkeze\s+yakın|iç\s+içe)$$
    )
    AND length(trim(both FROM split_part(lt.title, ' - ', 1))) >= 2
)
UPDATE listing_translations lt
SET title = t.clean_title
FROM targets t
WHERE lt.ctid = t.row_id
  AND lt.title IS DISTINCT FROM t.clean_title;

-- SEO meta başlıkları da aynı kurala çek
WITH holiday AS (
  SELECT l.id
  FROM listings l
  JOIN product_categories pc ON pc.id = l.category_id
  WHERE pc.code = 'holiday_home'
),
targets AS (
  SELECT sm.ctid AS row_id,
         trim(both FROM split_part(sm.title, ' - ', 1)) AS clean_title
  FROM seo_metadata sm
  JOIN holiday h ON h.id = sm.entity_id
  WHERE sm.entity_type = 'listing'
    AND sm.title LIKE '% - %'
    AND (
      sm.title ~* $$ - .+(da|de|ta|te|nda|nde).+(villa|apart|bungalov|daire)$$
      OR sm.title ~* $$ - .+(özel\s+havuzlu|huzurlu|lüks|manzaralı|doğayla|merkeze\s+yakın|iç\s+içe)$$
    )
    AND length(trim(both FROM split_part(sm.title, ' - ', 1))) >= 2
)
UPDATE seo_metadata sm
SET title = t.clean_title
FROM targets t
WHERE sm.ctid = t.row_id
  AND sm.title IS DISTINCT FROM t.clean_title;

-- Gülbay Villa: yanlış AI konumu (Fethiye Kayaköy) → Kalkan Kışla
UPDATE listings
SET location_name = 'Kalkan, Kışla, Antalya',
    updated_at = now()
WHERE slug = 'gulbay-villa'
  AND (
    location_name IS DISTINCT FROM 'Kalkan, Kışla, Antalya'
    OR coalesce(location_name, '') = ''
  );

UPDATE listing_attributes la
SET value_json = coalesce(la.value_json, '{}'::jsonb)
  || jsonb_build_object(
    'city', 'Kalkan',
    'address', 'Kalkan Kışla, Antalya',
    'province_city', 'Antalya',
    'district_label', 'Kaş',
    'region_display', 'Kalkan, Kışla'
  )
FROM listings l
WHERE la.listing_id = l.id
  AND l.slug = 'gulbay-villa'
  AND la.group_code = 'listing_meta'
  AND la.key = 'v1';
