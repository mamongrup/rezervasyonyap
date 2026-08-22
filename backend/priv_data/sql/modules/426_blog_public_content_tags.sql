-- AI blog yazılarındaki teknik etiketlere (ai-*, location:uuid, kategori slug)
-- ziyaretçiye uygun yer/konu etiketlerini ekler. İç sorgu etiketleri korunur.

CREATE OR REPLACE FUNCTION public._blog_tag_slug(raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(
    trim(both '-' from regexp_replace(
      lower(translate(
        coalesce(raw, ''),
        'İIıĞğÜüŞşÖöÇç',
        'iiiggguussoocc'
      )),
      '[^a-z0-9]+',
      '-',
      'g'
    )),
    ''
  );
$$;

WITH sourced AS (
  SELECT
    bp.id AS post_id,
    bp.tags_json,
    bp.slug,
    loc.loc_name,
    loc.region_name,
    loc.country_name,
    CASE
      WHEN bp.slug ~ '-gezilecek-yerler$' THEN 'gezilecek-yerler'
      WHEN bp.slug ~ '-gezi-rehberi$' THEN 'gezi-rehberi'
      WHEN bp.slug ~ '-tatil-ipuclari$' THEN 'tatil-ipuclari'
      WHEN bp.slug ~ '-favori-mekanlar$' THEN 'favori-mekanlar'
      WHEN bp.slug ~ '-populer-yerler$' THEN 'populer-yerler'
      WHEN bp.slug ~ '-hafta-sonu-rotasi$' THEN 'hafta-sonu-rotasi'
      WHEN bp.tags_json ? 'ai-place-blog' THEN 'favori-mekanlar'
      ELSE 'gezilecek-yerler'
    END AS topic
  FROM blog_posts bp
  CROSS JOIN LATERAL (
    SELECT NULLIF(substring(t FROM '^location:(.+)$'), '') AS location_id
    FROM jsonb_array_elements_text(coalesce(bp.tags_json, '[]'::jsonb)) AS t
    WHERE t LIKE 'location:%'
    LIMIT 1
  ) loc_id
  LEFT JOIN LATERAL (
    SELECT
      coalesce(nullif(lp.title, ''), d.name, r.name, c.name, lp.slug_path) AS loc_name,
      coalesce(r.name, '') AS region_name,
      coalesce(c.name, '') AS country_name
    FROM location_pages lp
    LEFT JOIN districts d ON d.id = lp.district_id
    LEFT JOIN regions r ON r.id = coalesce(lp.region_id, d.region_id)
    LEFT JOIN countries c ON c.id = coalesce(lp.country_id, r.country_id)
    WHERE loc_id.location_id IS NOT NULL
      AND lp.id = loc_id.location_id::uuid
    LIMIT 1
  ) loc ON true
  WHERE bp.tags_json ?| array['ai-region-content', 'ai-place-blog']
),
enriched AS (
  SELECT
    post_id,
    (
      SELECT jsonb_agg(to_jsonb(tag) ORDER BY ord)
      FROM (
        SELECT tag, min(ord) AS ord
        FROM (
          SELECT value AS tag, ord
          FROM jsonb_array_elements_text(coalesce(tags_json, '[]'::jsonb))
            WITH ORDINALITY AS x(value, ord)
          UNION ALL
          SELECT public._blog_tag_slug(loc_name), 1000
          WHERE public._blog_tag_slug(loc_name) IS NOT NULL
          UNION ALL
          SELECT public._blog_tag_slug(region_name), 1001
          WHERE public._blog_tag_slug(region_name) IS NOT NULL
            AND public._blog_tag_slug(region_name) IS DISTINCT FROM public._blog_tag_slug(loc_name)
          UNION ALL
          SELECT public._blog_tag_slug(country_name), 1002
          WHERE public._blog_tag_slug(country_name) IS NOT NULL
            AND public._blog_tag_slug(country_name) NOT IN ('turkiye', 'turkey')
            AND public._blog_tag_slug(country_name) IS DISTINCT FROM public._blog_tag_slug(loc_name)
            AND public._blog_tag_slug(country_name) IS DISTINCT FROM public._blog_tag_slug(region_name)
          UNION ALL
          SELECT topic, 1003
          WHERE topic IS NOT NULL AND topic <> ''
        ) parts
        GROUP BY tag
      ) uniq
    ) AS new_tags
  FROM sourced
)
UPDATE blog_posts bp
SET
  tags_json = e.new_tags,
  updated_at = now()
FROM enriched e
WHERE bp.id = e.post_id
  AND e.new_tags IS NOT NULL
  AND bp.tags_json IS DISTINCT FROM e.new_tags;

DROP FUNCTION IF EXISTS public._blog_tag_slug(text);
