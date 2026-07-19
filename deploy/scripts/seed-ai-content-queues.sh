#!/usr/bin/env bash
# Eksik turizm içeriklerini küçük ve tekrarlanabilir batch'lerle AI kuyruklarına alır.
# Aynı konum/ilan için pending/running/done kayıtları çoğaltılmaz.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck source=deploy/scripts/lib/psql-env.sh
source "$APP_ROOT/deploy/scripts/lib/psql-env.sh"

SEED_LIMIT="${AI_CONTENT_SEED_LIMIT:-50}"
if ! [[ "$SEED_LIMIT" =~ ^[0-9]+$ ]] || (( SEED_LIMIT < 1 || SEED_LIMIT > 500 )); then
  echo "[FAIL] AI_CONTENT_SEED_LIMIT 1-500 arasında olmalı: $SEED_LIMIT" >&2
  exit 1
fi

psql_travel -v ON_ERROR_STOP=1 -v seed_limit="$SEED_LIMIT" <<'SQL'
-- Kesilmiş deploy/API isteğinden kalan blog işleri tekrar çalıştırılabilir olsun.
UPDATE ai_geo_blog_batches
SET status = 'pending', error = NULL, updated_at = now()
WHERE status = 'running' AND updated_at < now() - interval '45 minutes';

UPDATE ai_place_blog_batches
SET status = 'pending', error = NULL, updated_at = now()
WHERE status = 'running' AND updated_at < now() - interval '45 minutes';

-- Bölge tanıtımı + genel gezi blogları.
WITH candidates AS (
  SELECT lp.id
  FROM location_pages lp
  WHERE lp.region_type IN ('country', 'province', 'district', 'destination')
    AND (
      length(coalesce(lp.description, '')) <= 120
      OR NOT EXISTS (
        SELECT 1 FROM blog_posts bp
        WHERE bp.tags_json ? 'ai-region-content'
          AND bp.tags_json ? ('location:' || lp.id::text)
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM ai_geo_blog_batches b
      WHERE b.location_page_id = lp.id
        AND b.category_slug = 'gezi-rehberi'
        AND b.status IN ('pending', 'running', 'done')
    )
  ORDER BY CASE lp.region_type
    WHEN 'country' THEN 0 WHEN 'province' THEN 1
    WHEN 'destination' THEN 2 ELSE 3 END, lp.slug_path
  LIMIT :seed_limit
), inserted AS (
  INSERT INTO ai_geo_blog_batches
    (location_page_id, category_slug, posts_to_create, status)
  SELECT id, 'gezi-rehberi', 1, 'pending' FROM candidates
  ON CONFLICT DO NOTHING
  RETURNING 1
)
SELECT 'region_blog_queued' AS queue, count(*) AS queued FROM inserted;

-- Travel ideas bulunan konumlar için Favori Mekanlar / Gezilecek Yerler blogları.
WITH candidates AS (
  SELECT lp.id
  FROM location_pages lp
  WHERE CASE jsonb_typeof(coalesce(lp.travel_ideas_json, '[]'::jsonb))
          WHEN 'array' THEN jsonb_array_length(lp.travel_ideas_json)
          ELSE 0
        END > 0
    AND NOT EXISTS (
      SELECT 1 FROM blog_posts bp
      WHERE bp.tags_json ? 'ai-place-blog'
        AND bp.tags_json ? ('location:' || lp.id::text)
    )
    AND NOT EXISTS (
      SELECT 1 FROM ai_place_blog_batches b
      WHERE b.location_page_id = lp.id
        AND b.status IN ('pending', 'running', 'done')
    )
  ORDER BY lp.slug_path
  LIMIT :seed_limit
), inserted AS (
  INSERT INTO ai_place_blog_batches
    (location_page_id, posts_to_create, status)
  SELECT id, 1, 'pending' FROM candidates
  ON CONFLICT DO NOTHING
  RETURNING 1
)
SELECT 'place_blog_queued' AS queue, count(*) AS queued FROM inserted;

-- İçeriği boş ilçeler için gerçek mekan/gezi fikri üretim işleri.
WITH candidates AS (
  SELECT lp.id, d.name AS district_name, r.name AS region_name,
         co.name AS country_name
  FROM location_pages lp
  JOIN districts d ON d.id = lp.district_id
  JOIN regions r ON r.id = d.region_id
  JOIN countries co ON co.id = r.country_id
  WHERE lp.region_type = 'district'
    AND CASE jsonb_typeof(coalesce(lp.travel_ideas_json, '[]'::jsonb))
          WHEN 'array' THEN jsonb_array_length(lp.travel_ideas_json)
          ELSE 0
        END = 0
    AND NOT EXISTS (
      SELECT 1 FROM ai_jobs j
      WHERE j.profile_code = 'district_travel_ideas'
        AND j.status IN ('queued', 'running')
        AND j.input_json->>'location_page_id' = lp.id::text
    )
  ORDER BY r.name, d.name
  LIMIT :seed_limit
), inserted AS (
  INSERT INTO ai_jobs (profile_code, input_json)
  SELECT 'district_travel_ideas', jsonb_build_object(
    'location_page_id', id::text,
    'district_name', district_name,
    'region_name', region_name,
    'country_name', country_name,
    'locale', 'tr',
    'count', '5-8',
    'instruction', 'Yalnızca gerçek ve bölgede bilinen gezilecek yerleri üret; mekan uydurma. Her öğede title, summary ve place_query bulunan 5-8 öğelik JSON array döndür.'
  )
  FROM candidates
  RETURNING 1
)
SELECT 'district_ideas_queued' AS queue, count(*) AS queued FROM inserted;
SQL
