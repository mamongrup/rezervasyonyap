-- Referans takvim aktariminin tam gun olarak ezdigi rezervasyon sinirlarini onar.
-- Yalnizca kaynak musaitlik URL'si bulunan ilanlarin bugun ve sonrasindaki,
-- en az iki gunluk kesintisiz tam-kapali bloklarina dokunur. Tek gunluk bakim
-- kapamalari degismez.
CREATE TABLE IF NOT EXISTS travel_data_migrations (
  code text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

WITH source_listings AS (
  SELECT la.listing_id
  FROM listing_attributes la
  WHERE la.group_code = 'listing_meta'
    AND la.key = 'v1'
    AND coalesce(
      nullif(trim(la.value_json->>'source_availability_url'), ''),
      nullif(trim(la.value_json->>'source_reference_url'), ''),
      nullif(trim(la.value_json->>'source_price_url'), '')
    ) IS NOT NULL
),
full_days AS (
  SELECT
    lac.listing_id,
    lac.day,
    lac.day - (row_number() OVER (PARTITION BY lac.listing_id ORDER BY lac.day))::int AS island
  FROM listing_availability_calendar lac
  JOIN source_listings sl ON sl.listing_id = lac.listing_id
  WHERE lac.day >= current_date
    AND NOT EXISTS (
      SELECT 1
      FROM travel_data_migrations
      WHERE code = '427_source_calendar_half_day_boundaries'
    )
    AND coalesce(lac.am_available, lac.is_available, false) = false
    AND coalesce(lac.pm_available, lac.is_available, false) = false
    AND lac.is_available = false
),
blocked_ranges AS (
  SELECT listing_id, min(day) AS starts_on, max(day) AS ends_on
  FROM full_days
  GROUP BY listing_id, island
  HAVING count(*) >= 2
),
boundaries AS (
  SELECT listing_id, starts_on AS day, true AS am_available, false AS pm_available
  FROM blocked_ranges
  UNION ALL
  SELECT listing_id, ends_on AS day, false AS am_available, true AS pm_available
  FROM blocked_ranges
)
UPDATE listing_availability_calendar lac
SET
  am_available = b.am_available,
  pm_available = b.pm_available,
  is_available = true
FROM boundaries b
WHERE lac.listing_id = b.listing_id
  AND lac.day = b.day;

INSERT INTO travel_data_migrations (code)
VALUES ('427_source_calendar_half_day_boundaries')
ON CONFLICT (code) DO NOTHING;

-- iCal bloklari kesin giris/cikis tarihleri tasidigi icin bunlari ayrica
-- kaynagin kendisinden tekrar kur. Sirt sirta rezervasyonlarin ortak gununde
-- iki yarim kapali, is_available=true turnover isareti kalir.
WITH ical_segments AS (
  SELECT
    f.listing_id,
    b.starts_on AS day,
    false AS block_am,
    true AS block_pm,
    true AS checkin_boundary,
    false AS checkout_boundary,
    false AS full_block
  FROM ical_imported_blocks b
  JOIN ical_feeds f ON f.id = b.feed_id
  WHERE b.ends_on > b.starts_on
  UNION ALL
  SELECT
    f.listing_id,
    b.ends_on AS day,
    true AS block_am,
    false AS block_pm,
    false AS checkin_boundary,
    true AS checkout_boundary,
    false AS full_block
  FROM ical_imported_blocks b
  JOIN ical_feeds f ON f.id = b.feed_id
  WHERE b.ends_on > b.starts_on
  UNION ALL
  SELECT
    f.listing_id,
    gs::date AS day,
    true AS block_am,
    true AS block_pm,
    false AS checkin_boundary,
    false AS checkout_boundary,
    true AS full_block
  FROM ical_imported_blocks b
  JOIN ical_feeds f ON f.id = b.feed_id
  CROSS JOIN LATERAL generate_series(
    b.starts_on + 1,
    b.ends_on - 1,
    interval '1 day'
  ) gs
  WHERE b.ends_on > b.starts_on + 1
),
merged AS (
  SELECT
    listing_id,
    day,
    bool_or(block_am) AS block_am,
    bool_or(block_pm) AS block_pm,
    bool_or(checkin_boundary) AND bool_or(checkout_boundary) AND NOT bool_or(full_block) AS turnover
  FROM ical_segments
  GROUP BY listing_id, day
)
UPDATE listing_availability_calendar lac
SET
  am_available = NOT m.block_am,
  pm_available = NOT m.block_pm,
  is_available = (NOT m.block_am) OR (NOT m.block_pm) OR m.turnover
FROM merged m
WHERE lac.listing_id = m.listing_id
  AND lac.day = m.day
  AND lac.day >= current_date;
