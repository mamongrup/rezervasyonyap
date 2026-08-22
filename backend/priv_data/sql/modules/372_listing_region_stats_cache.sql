-- 372: Kategori bölge istatistik önbelleği (anasayfa / kategori region-stats)
-- Canlıda 16k+ otelde anlık LIKE/OR join → query_timeout → boş slider.
-- HTTP yolu bu tablodan okur; yenileme ayrı (deploy / timer / import sonrası).

CREATE TABLE IF NOT EXISTS listing_region_stats_cache (
  category_code text NOT NULL,
  property_type text NOT NULL DEFAULT '',
  slug text NOT NULL,
  name text NOT NULL,
  cnt int NOT NULL CHECK (cnt > 0),
  thumbnail text NOT NULL DEFAULT '',
  refreshed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (category_code, property_type, slug)
);

CREATE INDEX IF NOT EXISTS idx_listing_region_stats_cache_cat_cnt
  ON listing_region_stats_cache (category_code, property_type, cnt DESC);

COMMENT ON TABLE listing_region_stats_cache IS
  'GET /api/v1/catalog/public/region-stats için önceden hesaplanmış TR bölge sayıları';

CREATE OR REPLACE FUNCTION refresh_listing_region_stats(p_category text DEFAULT NULL)
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
  v_cat text;
  v_rows int := 0;
  v_n int;
BEGIN
  -- Deploy sırasında dolum; HTTP değil — 60 sn izin ver
  PERFORM set_config('statement_timeout', '60s', true);

  FOR v_cat IN
    SELECT c.code
    FROM product_categories c
    WHERE c.code IS NOT NULL
      AND trim(c.code) <> ''
      AND c.code <> 'tour'
      AND (p_category IS NULL OR c.code = lower(trim(p_category)))
  LOOP
    DELETE FROM listing_region_stats_cache
    WHERE category_code = v_cat
      AND property_type = '';

    WITH cat AS (
      SELECT id FROM product_categories WHERE code = v_cat LIMIT 1
    ),
    agg AS (
      SELECT
        translate(
          lower(trim(coalesce(
            nullif(trim(lm.value_json->>'city'), ''),
            nullif(trim(lm.value_json->>'district_label'), ''),
            nullif(trim(split_part(coalesce(l.location_name, ''), ',', 1)), ''),
            ''
          ))),
          'üğışöç', 'ugisoc'
        ) AS place_key,
        count(*)::int AS cnt
      FROM listings l
      LEFT JOIN listing_attributes lm
        ON lm.listing_id = l.id
       AND lm.group_code = 'listing_meta'
       AND lm.key = 'v1'
      WHERE l.status = 'published'
        AND l.category_id = (SELECT id FROM cat)
      GROUP BY 1
    ),
    place AS (
      SELECT place_key, replace(place_key, ' ', '-') AS place_slug, cnt
      FROM agg
      WHERE place_key <> ''
        AND place_key NOT IN (
          'turkey', 'turkiye', 'tr', 'germany', 'deutschland', 'greece', 'cyprus', 'russia'
        )
    ),
    dkeys AS (
      SELECT
        d.id AS district_id,
        d.slug AS district_slug,
        d.name AS district_name,
        d.region_id,
        translate(lower(d.name), 'üğışöç', 'ugisoc') AS name_key
      FROM districts d
    ),
    rkeys AS (
      SELECT
        r.id AS region_id,
        r.slug AS region_slug,
        r.name AS region_name,
        translate(lower(r.name), 'üğışöç', 'ugisoc') AS name_key
      FROM regions r
      JOIN countries c ON c.id = r.country_id AND c.iso2 = 'TR'
    ),
    district_hit AS (
      SELECT
        dk.district_id,
        rk.region_id,
        rk.region_slug,
        dk.district_slug,
        dk.district_name AS display_name,
        sum(p.cnt)::int AS cnt,
        1 AS is_district
      FROM place p
      JOIN dkeys dk ON dk.name_key = p.place_key
      JOIN rkeys rk ON rk.region_id = dk.region_id
      GROUP BY dk.district_id, rk.region_id, rk.region_slug, dk.district_slug, dk.district_name
      UNION ALL
      SELECT
        dk.district_id,
        rk.region_id,
        rk.region_slug,
        dk.district_slug,
        dk.district_name AS display_name,
        sum(p.cnt)::int AS cnt,
        1 AS is_district
      FROM place p
      JOIN dkeys dk ON dk.district_slug = p.place_slug
      JOIN rkeys rk ON rk.region_id = dk.region_id
      WHERE dk.name_key IS DISTINCT FROM p.place_key
      GROUP BY dk.district_id, rk.region_id, rk.region_slug, dk.district_slug, dk.district_name
    ),
    region_hit AS (
      SELECT
        NULL::int AS district_id,
        rk.region_id,
        rk.region_slug,
        rk.region_slug AS district_slug,
        rk.region_name AS display_name,
        sum(p.cnt)::int AS cnt,
        0 AS is_district
      FROM place p
      JOIN rkeys rk ON rk.name_key = p.place_key
      WHERE NOT EXISTS (
        SELECT 1 FROM district_hit dh WHERE dh.region_id = rk.region_id
      )
      GROUP BY rk.region_id, rk.region_slug, rk.region_name
      UNION ALL
      SELECT
        NULL::int AS district_id,
        rk.region_id,
        rk.region_slug,
        rk.region_slug AS district_slug,
        rk.region_name AS display_name,
        sum(p.cnt)::int AS cnt,
        0 AS is_district
      FROM place p
      JOIN rkeys rk ON rk.region_slug = p.place_slug
      WHERE rk.name_key IS DISTINCT FROM p.place_key
        AND NOT EXISTS (
          SELECT 1 FROM district_hit dh WHERE dh.region_id = rk.region_id
        )
      GROUP BY rk.region_id, rk.region_slug, rk.region_name
    ),
    matched AS (
      SELECT
        district_id,
        region_id,
        region_slug,
        district_slug,
        display_name,
        sum(cnt)::int AS cnt,
        max(is_district) AS is_district
      FROM (
        SELECT * FROM district_hit
        UNION ALL
        SELECT * FROM region_hit
      ) u
      GROUP BY district_id, region_id, region_slug, district_slug, display_name
    ),
    ranked AS (
      SELECT
        CASE WHEN m.is_district = 1
          THEN 'TR/' || m.region_slug || '/' || m.district_slug
          ELSE 'TR/' || m.region_slug
        END AS slug,
        m.display_name AS name,
        m.cnt
      FROM matched m
      WHERE m.cnt > 0
      ORDER BY m.cnt DESC, m.display_name ASC
      LIMIT 50
    )
    INSERT INTO listing_region_stats_cache (category_code, property_type, slug, name, cnt, thumbnail, refreshed_at)
    SELECT v_cat, '', r.slug, r.name, r.cnt, '', now()
    FROM ranked r;

    GET DIAGNOSTICS v_n = ROW_COUNT;
    v_rows := v_rows + v_n;
  END LOOP;

  RETURN v_rows;
END;
$$;

COMMENT ON FUNCTION refresh_listing_region_stats(text) IS
  'listing_region_stats_cache doldurur; p_category NULL = tüm konaklama kategorileri';

-- İlk doldurma (otel öncelikli; diğerleri de)
SELECT refresh_listing_region_stats('hotel');
SELECT refresh_listing_region_stats(NULL);
