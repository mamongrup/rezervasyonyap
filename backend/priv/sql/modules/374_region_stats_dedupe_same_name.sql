-- 374: region-stats aynı isimli ilçe çiftini tekilleştir (ör. Kemer Antalya vs Burdur)
-- place_key yalnız "kemer" olunca her iki ilçe de aynı sayımı alıyordu.

CREATE OR REPLACE FUNCTION refresh_listing_region_stats(p_category text DEFAULT NULL)
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
  v_cat text;
  v_rows int := 0;
  v_n int;
BEGIN
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
        count(*)::int AS cnt,
        (array_agg(
          nullif(trim(l.featured_image_url), '')
          ORDER BY l.updated_at DESC NULLS LAST
        ) FILTER (WHERE nullif(trim(l.featured_image_url), '') IS NOT NULL))[1] AS sample_img
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
      SELECT place_key, replace(place_key, ' ', '-') AS place_slug, cnt, sample_img
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
      -- İsim eşleşmesi: aynı isimli birden fazla ilçede turizm ili öncelikli tek aday
      SELECT
        hit.district_id,
        hit.region_id,
        hit.region_slug,
        hit.district_slug,
        hit.district_name AS display_name,
        sum(p.cnt)::int AS cnt,
        1 AS is_district,
        (array_agg(p.sample_img) FILTER (WHERE nullif(p.sample_img, '') IS NOT NULL))[1] AS sample_img
      FROM place p
      JOIN LATERAL (
        SELECT
          dk.district_id,
          dk.district_slug,
          dk.district_name,
          rk.region_id,
          rk.region_slug
        FROM dkeys dk
        JOIN rkeys rk ON rk.region_id = dk.region_id
        WHERE dk.name_key = p.place_key
        ORDER BY
          CASE rk.region_slug
            WHEN 'antalya' THEN 0
            WHEN 'mugla' THEN 1
            WHEN 'izmir' THEN 2
            WHEN 'aydin' THEN 3
            WHEN 'nevsehir' THEN 4
            WHEN 'istanbul' THEN 5
            WHEN 'balikesir' THEN 6
            WHEN 'canakkale' THEN 7
            ELSE 50
          END,
          dk.district_id
        LIMIT 1
      ) hit ON true
      GROUP BY hit.district_id, hit.region_id, hit.region_slug, hit.district_slug, hit.district_name
      UNION ALL
      SELECT
        hit.district_id,
        hit.region_id,
        hit.region_slug,
        hit.district_slug,
        hit.district_name AS display_name,
        sum(p.cnt)::int AS cnt,
        1 AS is_district,
        (array_agg(p.sample_img) FILTER (WHERE nullif(p.sample_img, '') IS NOT NULL))[1] AS sample_img
      FROM place p
      JOIN LATERAL (
        SELECT
          dk.district_id,
          dk.district_slug,
          dk.district_name,
          rk.region_id,
          rk.region_slug,
          dk.name_key
        FROM dkeys dk
        JOIN rkeys rk ON rk.region_id = dk.region_id
        WHERE dk.district_slug = p.place_slug
          AND dk.name_key IS DISTINCT FROM p.place_key
        ORDER BY
          CASE rk.region_slug
            WHEN 'antalya' THEN 0
            WHEN 'mugla' THEN 1
            WHEN 'izmir' THEN 2
            WHEN 'aydin' THEN 3
            WHEN 'nevsehir' THEN 4
            WHEN 'istanbul' THEN 5
            WHEN 'balikesir' THEN 6
            WHEN 'canakkale' THEN 7
            ELSE 50
          END,
          dk.district_id
        LIMIT 1
      ) hit ON true
      GROUP BY hit.district_id, hit.region_id, hit.region_slug, hit.district_slug, hit.district_name
    ),
    region_hit AS (
      SELECT
        NULL::int AS district_id,
        rk.region_id,
        rk.region_slug,
        rk.region_slug AS district_slug,
        rk.region_name AS display_name,
        sum(p.cnt)::int AS cnt,
        0 AS is_district,
        (array_agg(p.sample_img) FILTER (WHERE nullif(p.sample_img, '') IS NOT NULL))[1] AS sample_img
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
        0 AS is_district,
        (array_agg(p.sample_img) FILTER (WHERE nullif(p.sample_img, '') IS NOT NULL))[1] AS sample_img
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
        max(is_district) AS is_district,
        (array_agg(sample_img) FILTER (WHERE nullif(sample_img, '') IS NOT NULL))[1] AS sample_img
      FROM (
        SELECT * FROM district_hit
        UNION ALL
        SELECT * FROM region_hit
      ) u
      GROUP BY district_id, region_id, region_slug, district_slug, display_name
    ),
    ranked AS (
      SELECT
        slug,
        name,
        cnt,
        district_id,
        region_id,
        is_district,
        sample_img
      FROM (
        SELECT
          CASE WHEN m.is_district = 1
            THEN 'TR/' || m.region_slug || '/' || m.district_slug
            ELSE 'TR/' || m.region_slug
          END AS slug,
          m.display_name AS name,
          m.cnt,
          m.district_id,
          m.region_id,
          m.is_district,
          coalesce(m.sample_img, '') AS sample_img,
          row_number() OVER (
            PARTITION BY translate(lower(m.display_name), 'üğışöç', 'ugisoc')
            ORDER BY
              CASE m.region_slug
                WHEN 'antalya' THEN 0
                WHEN 'mugla' THEN 1
                WHEN 'izmir' THEN 2
                WHEN 'aydin' THEN 3
                WHEN 'nevsehir' THEN 4
                WHEN 'istanbul' THEN 5
                WHEN 'balikesir' THEN 6
                WHEN 'canakkale' THEN 7
                ELSE 50
              END,
              m.cnt DESC,
              m.display_name ASC
          ) AS rn
        FROM matched m
        WHERE m.cnt > 0
      ) x
      WHERE rn = 1
      ORDER BY cnt DESC, name ASC
      LIMIT 50
    )
    INSERT INTO listing_region_stats_cache (category_code, property_type, slug, name, cnt, thumbnail, refreshed_at)
    SELECT
      v_cat,
      '',
      r.slug,
      r.name,
      r.cnt,
      coalesce(
        nullif(trim(lp.thumb), ''),
        nullif(trim(r.sample_img), ''),
        ''
      ),
      now()
    FROM ranked r
    LEFT JOIN LATERAL (
      SELECT coalesce(
        nullif(trim(x.cover_image), ''),
        nullif(trim(x.featured_image_url), ''),
        nullif(trim(x.hero_image_url), ''),
        nullif(trim(x.travel_ideas_image_url), ''),
        ''
      ) AS thumb
      FROM location_pages x
      WHERE
        (
          r.is_district = 1
          AND x.district_id = r.district_id
          AND coalesce(x.region_type, 'district') = 'district'
        )
        OR (
          r.is_district = 0
          AND x.region_id = r.region_id
          AND coalesce(x.region_type, 'province') = 'province'
        )
        OR lower(x.slug_path) = lower(r.slug)
      ORDER BY
        CASE WHEN lower(x.slug_path) = lower(r.slug) THEN 0 ELSE 1 END,
        CASE
          WHEN nullif(trim(x.cover_image), '') IS NOT NULL THEN 0
          WHEN nullif(trim(x.featured_image_url), '') IS NOT NULL THEN 1
          WHEN nullif(trim(x.hero_image_url), '') IS NOT NULL THEN 2
          ELSE 3
        END
      LIMIT 1
    ) lp ON true;

    GET DIAGNOSTICS v_n = ROW_COUNT;
    v_rows := v_rows + v_n;
  END LOOP;

  RETURN v_rows;
END;
$$;

COMMENT ON FUNCTION refresh_listing_region_stats(text) IS
  'listing_region_stats_cache: cnt+thumbnail; aynı isimli ilçelerde turizm ili öncelikli tekilleştirme';

SELECT refresh_listing_region_stats('hotel');
SELECT refresh_listing_region_stats(NULL);
