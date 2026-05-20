-- Backfill district/destination map pins from real Google POI coordinates.
-- Fixes pages whose pin stayed empty or was accidentally persisted as parent province center
-- (e.g. Fethiye page pointing to Mugla city center).

WITH poi_centers AS (
  SELECT
    lp.id AS location_page_id,
    lp.district_id,
    coalesce(lp.region_id, d.region_id) AS parent_region_id,
    round(avg((elem->>'lat')::numeric), 6)::numeric(9,6) AS poi_lat,
    round(avg((elem->>'lng')::numeric), 6)::numeric(9,6) AS poi_lng,
    count(*) AS poi_count
  FROM location_pages lp
  LEFT JOIN districts d ON d.id = lp.district_id
  CROSS JOIN LATERAL jsonb_array_elements(coalesce(lp.travel_ideas_json, '[]'::jsonb)) elem
  WHERE coalesce(lp.region_type, 'district') IN ('district', 'destination')
    AND nullif(trim(elem->>'place_id'), '') IS NOT NULL
    AND trim(coalesce(elem->>'lat', '')) ~ '^-?[0-9]+(\.[0-9]+)?$'
    AND trim(coalesce(elem->>'lng', '')) ~ '^-?[0-9]+(\.[0-9]+)?$'
    AND (elem->>'lat')::numeric BETWEEN -90 AND 90
    AND (elem->>'lng')::numeric BETWEEN -180 AND 180
  GROUP BY lp.id, lp.district_id, coalesce(lp.region_id, d.region_id)
),
page_targets AS (
  SELECT
    lp.id,
    pc.poi_lat,
    pc.poi_lng,
    r.center_lat AS region_lat,
    r.center_lng AS region_lng,
    lp.map_lat,
    lp.map_lng
  FROM location_pages lp
  JOIN poi_centers pc ON pc.location_page_id = lp.id
  LEFT JOIN regions r ON r.id = pc.parent_region_id
  WHERE pc.poi_count > 0
)
UPDATE location_pages lp
SET map_lat = pt.poi_lat,
    map_lng = pt.poi_lng,
    updated_at = now()
FROM page_targets pt
WHERE lp.id = pt.id
  AND (
    lp.map_lat IS NULL
    OR lp.map_lng IS NULL
    OR (
      pt.region_lat IS NOT NULL
      AND pt.region_lng IS NOT NULL
      -- existing pin is effectively the province center
      AND sqrt(power((pt.map_lat::float8 - pt.region_lat::float8) * 111.0, 2)
             + power((pt.map_lng::float8 - pt.region_lng::float8) * 85.0, 2)) <= 2.0
      -- Google POI cluster is meaningfully away from the province center
      AND sqrt(power((pt.poi_lat::float8 - pt.region_lat::float8) * 111.0, 2)
             + power((pt.poi_lng::float8 - pt.region_lng::float8) * 85.0, 2)) >= 5.0
    )
  );

WITH poi_centers AS (
  SELECT
    lp.district_id,
    coalesce(lp.region_id, d.region_id) AS parent_region_id,
    round(avg((elem->>'lat')::numeric), 6)::numeric(9,6) AS poi_lat,
    round(avg((elem->>'lng')::numeric), 6)::numeric(9,6) AS poi_lng,
    count(*) AS poi_count
  FROM location_pages lp
  JOIN districts d ON d.id = lp.district_id
  CROSS JOIN LATERAL jsonb_array_elements(coalesce(lp.travel_ideas_json, '[]'::jsonb)) elem
  WHERE coalesce(lp.region_type, 'district') = 'district'
    AND nullif(trim(elem->>'place_id'), '') IS NOT NULL
    AND trim(coalesce(elem->>'lat', '')) ~ '^-?[0-9]+(\.[0-9]+)?$'
    AND trim(coalesce(elem->>'lng', '')) ~ '^-?[0-9]+(\.[0-9]+)?$'
    AND (elem->>'lat')::numeric BETWEEN -90 AND 90
    AND (elem->>'lng')::numeric BETWEEN -180 AND 180
  GROUP BY lp.district_id, coalesce(lp.region_id, d.region_id)
),
district_targets AS (
  SELECT
    d.id,
    pc.poi_lat,
    pc.poi_lng,
    d.center_lat,
    d.center_lng,
    r.center_lat AS region_lat,
    r.center_lng AS region_lng
  FROM districts d
  JOIN poi_centers pc ON pc.district_id = d.id
  LEFT JOIN regions r ON r.id = pc.parent_region_id
  WHERE pc.poi_count > 0
)
UPDATE districts d
SET center_lat = dt.poi_lat,
    center_lng = dt.poi_lng
FROM district_targets dt
WHERE d.id = dt.id
  AND (
    d.center_lat IS NULL
    OR d.center_lng IS NULL
    OR (
      dt.region_lat IS NOT NULL
      AND dt.region_lng IS NOT NULL
      AND sqrt(power((dt.center_lat::float8 - dt.region_lat::float8) * 111.0, 2)
             + power((dt.center_lng::float8 - dt.region_lng::float8) * 85.0, 2)) <= 2.0
      AND sqrt(power((dt.poi_lat::float8 - dt.region_lat::float8) * 111.0, 2)
             + power((dt.poi_lng::float8 - dt.region_lng::float8) * 85.0, 2)) >= 5.0
    )
  );
