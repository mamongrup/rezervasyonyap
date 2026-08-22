-- Kaş/Kalkan villa mesafeleri: alt kategori, popülerlik ve dengeli gerçek mekan havuzu.
-- Otomatik veri yenilenir; panelden eklenen manual=true kayıtlar korunur.

BEGIN;

WITH poi(title, summary, category, popularity, place_id, lat, lng) AS (
  VALUES
    -- Gezilecek yerler / Plajlar
    ('Büyük Çakıl Plajı', 'Plaj', 'beach', 98, 'osm-node-buyuk-cakil', 36.1917547::float8, 29.6516304::float8),
    ('Limanağzı Plajı', 'Plaj', 'beach', 94, 'osm-node-limanagzi', 36.1725501, 29.6500818),
    ('Akçagerme Halk Plajı', 'Plaj', 'beach', 92, 'osm-node-akcagerme', 36.2066892, 29.6018100),
    ('Çoban Plajı', 'Plaj', 'beach', 78, 'osm-node-coban-plaji', 36.1528373, 29.6577487),

    -- Gezilecek yerler / Ören yerleri
    ('İsinda Antik Kenti', 'Ören yeri', 'ruins', 96, 'osm-node-isinda', 36.1804340, 29.7038274),
    ('Aperlae Antik Kenti', 'Ören yeri', 'ruins', 94, 'osm-node-aperlae', 36.1596050, 29.7821787),
    ('Phellos Antik Kenti', 'Ören yeri', 'ruins', 91, 'osm-node-phellos', 36.2425193, 29.6618073),
    ('Kyaneai Antik Kenti', 'Ören yeri', 'ruins', 84, 'osm-node-kyaneai', 36.2453857, 29.8150710),

    -- Gezilecek yerler / Tarihi alanlar
    ('Antiphellos Antik Tiyatrosu', 'Tarihi alan', 'historic', 99, 'osm-node-antiphellos', 36.1999647, 29.6349462),
    ('Kaş Su Altı Müzesi', 'Müze', 'historic', 93, 'osm-node-kas-sualti-muzesi', 36.1787306, 29.6413451),
    ('Likya Kaya Mezarı', 'Tarihi alan', 'historic', 90, 'osm-node-lycian-tomb', 36.2015888, 29.6425524),

    -- Temel ihtiyaçlar / Marketler
    ('Muhtar Alışveriş Merkezi', 'Süpermarket', 'market', 92, 'osm-node-muhtar-kas', 36.1987140, 29.6542918),
    ('Dia Market', 'Süpermarket', 'market', 88, 'osm-node-dia-kas', 36.2162578, 29.6814840),
    ('Migros', 'Süpermarket', 'market', 90, 'osm-node-migros-kas', 36.2015720, 29.6383578),

    -- Temel ihtiyaçlar / Restoranlar
    ('Smiley''s Cafe & Bar', 'Restoran', 'restaurant', 94, 'osm-node-smileys-kas', 36.1988202, 29.6398960),
    ('Lola Restaurant', 'Restoran', 'restaurant', 92, 'osm-node-lola-kas', 36.1991935, 29.6417323),
    ('Kaşık Mantı', 'Restoran', 'restaurant', 90, 'osm-node-kasik-manti', 36.1995109, 29.6413121),

    -- Temel ihtiyaçlar / Sağlık
    ('Kaş Devlet Hastanesi', 'Hastane', 'hospital', 100, 'osm-node-kas-devlet-hastanesi', 36.2031219, 29.5861435),
    ('Kaş Eczanesi', 'Eczane', 'pharmacy', 92, 'osm-node-kas-eczanesi', 36.1993480, 29.6395048),
    ('Onur Eczanesi', 'Eczane', 'pharmacy', 88, 'osm-node-onur-eczanesi', 36.1995783, 29.6396888),

    -- Ulaşım / Havalimanları
    ('Dalaman Havalimanı', 'Havalimanı', 'airport', 100, 'osm-dalaman-airport', 36.7130560, 28.7925000),
    ('Antalya Havalimanı', 'Havalimanı', 'airport', 100, 'osm-antalya-airport', 36.8987310, 30.8004610),

    -- Ulaşım / Otogarlar
    ('Kaş Otogar', 'Otogar', 'bus_station', 98, 'osm-node-kas-otogar', 36.2139179, 29.6765547),
    ('Kalkan Otogar', 'Otogar', 'bus_station', 94, 'osm-node-kalkan-otogar', 36.2707758, 29.4132826),

    -- Ulaşım / Limanlar
    ('Kaş Limanı', 'Liman', 'port', 98, 'osm-node-kas-limani', 36.1979701, 29.6415749),
    ('Setur Kaş Marina', 'Marina', 'port', 95, 'osm-node-setur-kas-marina', 36.2038591, 29.6299053),
    ('Çayağzı Limanı', 'Liman', 'port', 86, 'osm-node-cayagzi', 36.2239274, 29.9421270)
),
candidate AS (
  SELECT
    l.id,
    l.map_lat::float8 AS listing_lat,
    l.map_lng::float8 AS listing_lng,
    coalesce(l.nearby_pois_json, '[]'::jsonb) AS existing_pois
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
    c.existing_pois,
    p.title,
    p.summary,
    p.category,
    p.popularity,
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
aggregated AS (
  SELECT
    listing_id,
    existing_pois,
    jsonb_agg(
      jsonb_build_object(
        'title', title,
        'summary', summary,
        'category', category,
        'popularity', popularity,
        'manual', false,
        'place_id', place_id,
        'lat', lat,
        'lng', lng,
        'distance_km', distance_km,
        'distance_km_from_listing', distance_km
      )
      ORDER BY category, popularity DESC, distance_km, title
    ) FILTER (
      WHERE (category = 'airport' AND distance_km <= 180)
         OR (category <> 'airport' AND distance_km <= 80)
    ) AS generated_pois
  FROM calculated
  GROUP BY listing_id, existing_pois
),
with_manual AS (
  SELECT
    a.listing_id,
    coalesce(a.generated_pois, '[]'::jsonb)
      || coalesce(
        (
          SELECT jsonb_agg(manual_poi)
          FROM jsonb_array_elements(
            CASE
              WHEN jsonb_typeof(a.existing_pois) = 'array' THEN a.existing_pois
              ELSE '[]'::jsonb
            END
          ) manual_poi
          WHERE coalesce((manual_poi->>'manual')::boolean, false)
        ),
        '[]'::jsonb
      ) AS pois_json
  FROM aggregated a
)
UPDATE listings l
SET nearby_pois_json = data.pois_json
FROM with_manual data
WHERE l.id = data.listing_id;

COMMIT;
