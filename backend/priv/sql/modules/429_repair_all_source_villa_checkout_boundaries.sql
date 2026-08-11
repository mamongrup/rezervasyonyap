-- Kaynak takvimle yonetilen tum villalarda dolu gece araliklarinin yarim gun
-- sinirlarini onar. Aktif iCal akisi olan ilanlar kendi kesin VEVENT
-- sinirlarindan kuruldugu icin bu toplu donusumun disinda tutulur.

-- Once cikis sinirini yaz: ilk gunu yarima cevirmeden once iki veya daha fazla
-- tam dolu gece kosulu korunur.
WITH source_villas AS (
  SELECT DISTINCT l.id AS listing_id
  FROM listings l
  JOIN product_categories pc
    ON pc.id = l.category_id
   AND pc.code = 'holiday_home'
  JOIN listing_attributes la
    ON la.listing_id = l.id
   AND la.group_code = 'listing_meta'
   AND la.key = 'v1'
  WHERE coalesce(
    nullif(trim(la.value_json->>'source_availability_url'), ''),
    nullif(trim(la.value_json->>'source_reference_url'), ''),
    nullif(trim(la.value_json->>'source_price_url'), '')
  ) IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM ical_feeds f
      WHERE f.listing_id = l.id
        AND f.is_active = true
    )
),
full_days AS (
  SELECT
    lac.listing_id,
    lac.day,
    lac.day - (row_number() OVER (PARTITION BY lac.listing_id ORDER BY lac.day))::int AS island
  FROM listing_availability_calendar lac
  JOIN source_villas sv ON sv.listing_id = lac.listing_id
  WHERE lac.day >= current_date
    AND lac.is_available = false
    AND coalesce(lac.am_available, lac.is_available, false) = false
    AND coalesce(lac.pm_available, lac.is_available, false) = false
),
blocked_ranges AS (
  SELECT listing_id, min(day) AS starts_on, max(day) AS last_night
  FROM full_days
  GROUP BY listing_id, island
  HAVING count(*) >= 2
),
checkout_boundaries AS (
  SELECT br.listing_id, br.last_night + 1 AS day
  FROM blocked_ranges br
  LEFT JOIN listing_availability_calendar following
    ON following.listing_id = br.listing_id
   AND following.day = br.last_night + 1
  WHERE following.listing_id IS NULL
     OR (
       coalesce(following.am_available, following.is_available, true) = true
       AND coalesce(following.pm_available, following.is_available, true) = true
     )
)
INSERT INTO listing_availability_calendar (
  listing_id,
  day,
  is_available,
  am_available,
  pm_available,
  price_override,
  day_status
)
SELECT listing_id, day, true, false, true, NULL, NULL
FROM checkout_boundaries
ON CONFLICT (listing_id, day) DO UPDATE
SET
  is_available = true,
  am_available = false,
  pm_available = true;

-- Ilk dolu gece: sabah musait, ogleden sonra dolu.
WITH source_villas AS (
  SELECT DISTINCT l.id AS listing_id
  FROM listings l
  JOIN product_categories pc
    ON pc.id = l.category_id
   AND pc.code = 'holiday_home'
  JOIN listing_attributes la
    ON la.listing_id = l.id
   AND la.group_code = 'listing_meta'
   AND la.key = 'v1'
  WHERE coalesce(
    nullif(trim(la.value_json->>'source_availability_url'), ''),
    nullif(trim(la.value_json->>'source_reference_url'), ''),
    nullif(trim(la.value_json->>'source_price_url'), '')
  ) IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM ical_feeds f
      WHERE f.listing_id = l.id
        AND f.is_active = true
    )
),
full_days AS (
  SELECT
    lac.listing_id,
    lac.day,
    lac.day - (row_number() OVER (PARTITION BY lac.listing_id ORDER BY lac.day))::int AS island
  FROM listing_availability_calendar lac
  JOIN source_villas sv ON sv.listing_id = lac.listing_id
  WHERE lac.day >= current_date
    AND lac.is_available = false
    AND coalesce(lac.am_available, lac.is_available, false) = false
    AND coalesce(lac.pm_available, lac.is_available, false) = false
),
blocked_ranges AS (
  SELECT listing_id, min(day) AS starts_on, max(day) AS last_night
  FROM full_days
  GROUP BY listing_id, island
  HAVING count(*) >= 2
),
checkin_boundaries AS (
  SELECT br.listing_id, br.starts_on AS day
  FROM blocked_ranges br
  JOIN listing_availability_calendar previous
    ON previous.listing_id = br.listing_id
   AND previous.day = br.starts_on - 1
  WHERE coalesce(previous.am_available, previous.is_available, true) = true
    AND coalesce(previous.pm_available, previous.is_available, true) = true
)
UPDATE listing_availability_calendar lac
SET
  is_available = true,
  am_available = true,
  pm_available = false
FROM checkin_boundaries boundary
WHERE lac.listing_id = boundary.listing_id
  AND lac.day = boundary.day;
