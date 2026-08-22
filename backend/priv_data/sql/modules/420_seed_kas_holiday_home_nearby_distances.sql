-- Kaş/Kalkan tatil evleri için gerçek OSM mekan koordinatlarından mesafe önbelleği.
-- Kaynak: OpenStreetMap Overpass (2026-08-05); mesafe ilan koordinatından Haversine.
-- Google Places sunucu anahtarı olmayan kurulumlarda boş nearby_pois_json'u doldurur.

BEGIN;

WITH poi(title, summary, place_id, lat, lng) AS (
  VALUES
    ('Aperlae', 'Tarihi yer', 'osm-node-aperlae', 36.1596050::float8, 29.7821787::float8),
    ('Kaş Su Altı Müzesi', 'Müze ve gezi noktası', 'osm-node-kas-sualti-muzesi', 36.1787306, 29.6413451),
    ('Antiphellos Antik Tiyatrosu', 'Antik tiyatro', 'osm-node-antiphellos', 36.1999647, 29.6349462),
    ('Limanağzı Plajı', 'Plaj', 'osm-node-limanagzi', 36.1725501, 29.6500818),
    ('Büyük Çakıl Plajı', 'Plaj', 'osm-node-buyuk-cakil', 36.1917547, 29.6516304),
    ('Akçagerme Halk Plajı', 'Plaj', 'osm-node-akcagerme', 36.2066892, 29.6018100),
    ('Çoban Plajı', 'Plaj', 'osm-node-coban-plaji', 36.1528373, 29.6577487),
    ('Dia Market', 'Süpermarket', 'osm-node-dia-kas', 36.2162578, 29.6814840),
    ('Muhtar Alışveriş Merkezi', 'Süpermarket', 'osm-node-muhtar-kas', 36.1987140, 29.6542918),
    ('CarrefourSA', 'Süpermarket', 'osm-node-carrefour-kas', 36.2014983, 29.6387989),
    ('Migros', 'Süpermarket', 'osm-node-migros-kas', 36.2015720, 29.6383578),
    ('Onur Eczanesi', 'Eczane', 'osm-node-onur-eczanesi', 36.1995783, 29.6396888),
    ('Kaş Eczanesi', 'Eczane', 'osm-node-kas-eczanesi', 36.1993480, 29.6395048),
    ('Kaş Otogar', 'Otogar', 'osm-node-kas-otogar', 36.2139179, 29.6765547)
),
candidate AS (
  SELECT l.id, l.map_lat::float8 AS listing_lat, l.map_lng::float8 AS listing_lng
  FROM listings l
  JOIN product_categories pc ON pc.id = l.category_id
  WHERE pc.code = 'holiday_home'
    AND l.map_lat IS NOT NULL
    AND l.map_lng IS NOT NULL
    AND (
      lower(coalesce(l.location_name, '')) LIKE '%kaş%'
      OR lower(coalesce(l.location_name, '')) LIKE '%ka?%'
      OR lower(coalesce(l.location_name, '')) LIKE '%kalkan%'
      OR (
        l.map_lat::float8 BETWEEN 36.00 AND 36.45
        AND l.map_lng::float8 BETWEEN 29.30 AND 29.95
      )
    )
),
calculated AS (
  SELECT
    c.id AS listing_id,
    p.title,
    p.summary,
    p.place_id,
    p.lat,
    p.lng,
    round(
      (
        6371.0 * acos(
          greatest(-1.0, least(1.0,
            cos(radians(c.listing_lat)) * cos(radians(p.lat))
            * cos(radians(p.lng) - radians(c.listing_lng))
            + sin(radians(c.listing_lat)) * sin(radians(p.lat))
          ))
        )
      )::numeric,
      1
    ) AS distance_km
  FROM candidate c
  CROSS JOIN poi p
),
ranked AS (
  SELECT
    calculated.*,
    row_number() OVER (PARTITION BY listing_id ORDER BY distance_km, title) AS rn
  FROM calculated
  WHERE distance_km > 0
    AND distance_km <= 80
),
aggregated AS (
  SELECT
    listing_id,
    jsonb_agg(
      jsonb_build_object(
        'title', title,
        'summary', summary,
        'place_id', place_id,
        'lat', lat,
        'lng', lng,
        'distance_km', distance_km,
        'distance_km_from_listing', distance_km
      )
      ORDER BY distance_km, title
    ) AS pois_json
  FROM ranked
  WHERE rn <= 18
  GROUP BY listing_id
)
UPDATE listings l
SET nearby_pois_json = a.pois_json
FROM aggregated a
WHERE l.id = a.listing_id
  AND CASE
    WHEN jsonb_typeof(l.nearby_pois_json) = 'array'
      THEN jsonb_array_length(l.nearby_pois_json) = 0
    ELSE true
  END;

COMMIT;
