#!/usr/bin/env bash
# Tatil evi, yat, aktivite ve feribot ilanlarını kalite kapısından geçirir;
# eksikleri AI kuyruğuna alır ve hazır taslakları yayınlar.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# shellcheck source=deploy/scripts/lib/psql-env.sh
source "$APP_ROOT/deploy/scripts/lib/psql-env.sh"

QUEUE_LIMIT="${RECONCILE_QUEUE_LIMIT:-100}"
if ! [[ "$QUEUE_LIMIT" =~ ^[0-9]+$ ]] || (( QUEUE_LIMIT < 1 || QUEUE_LIMIT > 500 )); then
  echo "[FAIL] RECONCILE_QUEUE_LIMIT 1-500 arasında olmalı: $QUEUE_LIMIT" >&2
  exit 1
fi

psql_travel -v ON_ERROR_STOP=1 -v queue_limit="$QUEUE_LIMIT" <<'SQL'
BEGIN;

WITH default_contract AS (
  SELECT cc.id
  FROM category_contracts cc
  JOIN product_categories pc ON pc.id = cc.category_id
  WHERE pc.code = 'holiday_home' AND cc.code = 'default'
    AND cc.is_active = true AND cc.contract_scope = 'category'
    AND cc.organization_id IS NULL
  ORDER BY cc.version DESC, cc.sort_order, cc.updated_at DESC
  LIMIT 1
), assigned AS (
  UPDATE listings l
  SET category_contract_id = dc.id, updated_at = now()
  FROM product_categories pc, default_contract dc
  WHERE pc.id = l.category_id AND pc.code = 'holiday_home'
    AND l.category_contract_id IS DISTINCT FROM dc.id
  RETURNING l.id
)
SELECT 'holiday_home_default_contract_assigned' AS result, count(*) AS affected FROM assigned;

UPDATE ai_listing_content_batches b
SET status = 'pending', error = NULL, updated_at = now()
WHERE b.category_code IN ('holiday_home', 'yacht_charter', 'activity', 'ferry')
  AND b.status = 'failed' AND b.updated_at < now() - interval '6 hours';

WITH targets AS (
  SELECT l.id, pc.code AS category_code,
         row_number() OVER (PARTITION BY pc.code ORDER BY l.updated_at DESC, l.id) AS rn
  FROM listings l
  JOIN product_categories pc ON pc.id = l.category_id
  WHERE pc.code IN ('holiday_home', 'yacht_charter', 'activity', 'ferry')
    AND l.status IN ('draft', 'published')
    AND (
      EXISTS (
        SELECT 1 FROM locales lo WHERE lo.is_active = true AND NOT EXISTS (
          SELECT 1 FROM listing_translations lt
          WHERE lt.listing_id = l.id AND lt.locale_id = lo.id
            AND length(btrim(coalesce(lt.title, ''))) > 0
            AND length(coalesce(lt.description, '')) >= 80
            AND lower(coalesce(lt.description, '')) ~ '<p([[:space:]]|>)'
            AND lower(coalesce(lt.description, '')) ~ '<(h2|h3|ul|ol)([[:space:]]|>)'
        )
      ) OR EXISTS (
        SELECT 1 FROM locales lo WHERE lo.is_active = true AND NOT EXISTS (
          SELECT 1 FROM seo_metadata sm
          WHERE sm.entity_type = 'listing' AND sm.entity_id = l.id AND sm.locale_id = lo.id
            AND length(btrim(coalesce(sm.title, ''))) > 10
            AND length(btrim(coalesce(sm.description, ''))) > 40
        )
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM ai_listing_content_batches b
      WHERE b.listing_id = l.id AND b.status IN ('pending', 'running')
    )
    AND NOT EXISTS (
      SELECT 1 FROM ai_listing_content_batches b
      WHERE b.listing_id = l.id AND b.status = 'failed'
        AND b.updated_at >= now() - interval '6 hours'
    )
), queued AS (
  INSERT INTO ai_listing_content_batches
    (listing_id, category_code, phase, status, overwrite)
  SELECT id, category_code, 'tr_description', 'pending', false
  FROM targets WHERE rn <= :queue_limit
  RETURNING category_code
)
SELECT 'content_queued' AS result, category_code, count(*) AS affected
FROM queued GROUP BY category_code ORDER BY category_code;

WITH first_images AS (
  SELECT DISTINCT ON (li.listing_id) li.listing_id, li.storage_key
  FROM listing_images li
  JOIN listings l ON l.id = li.listing_id
  JOIN product_categories pc ON pc.id = l.category_id
  WHERE pc.code IN ('holiday_home', 'yacht_charter', 'activity', 'ferry')
    AND btrim(coalesce(li.storage_key, '')) <> ''
  ORDER BY li.listing_id, li.sort_order, li.created_at, li.id
), repaired AS (
  UPDATE listings l
  SET featured_image_url = fi.storage_key,
      thumbnail_url = COALESCE(NULLIF(btrim(l.thumbnail_url), ''), fi.storage_key),
      updated_at = now()
  FROM first_images fi
  WHERE fi.listing_id = l.id AND btrim(coalesce(l.featured_image_url, '')) = ''
  RETURNING l.id
)
SELECT 'cover_repaired' AS result, count(*) AS affected FROM repaired;

WITH quality AS (
  SELECT l.id, pc.code AS category_code,
    NOT EXISTS (
      SELECT 1 FROM locales lo WHERE lo.is_active = true AND NOT EXISTS (
        SELECT 1 FROM listing_translations lt
        WHERE lt.listing_id = l.id AND lt.locale_id = lo.id
          AND length(btrim(coalesce(lt.title, ''))) > 0
          AND length(coalesce(lt.description, '')) >= 80
          AND lower(coalesce(lt.description, '')) ~ '<p([[:space:]]|>)'
          AND lower(coalesce(lt.description, '')) ~ '<(h2|h3|ul|ol)([[:space:]]|>)'
      )
    ) AS content_ready,
    NOT EXISTS (
      SELECT 1 FROM locales lo WHERE lo.is_active = true AND NOT EXISTS (
        SELECT 1 FROM seo_metadata sm
        WHERE sm.entity_type = 'listing' AND sm.entity_id = l.id AND sm.locale_id = lo.id
          AND length(btrim(coalesce(sm.title, ''))) > 10
          AND length(btrim(coalesce(sm.description, ''))) > 40
      )
    ) AS seo_ready,
    (SELECT count(*) FROM listing_images li WHERE li.listing_id = l.id) >=
      CASE pc.code WHEN 'holiday_home' THEN 5 WHEN 'yacht_charter' THEN 5 ELSE 1 END AS media_ready,
    NOT EXISTS (
      SELECT 1 FROM listing_attributes la WHERE la.listing_id = l.id
        AND lower(coalesce(la.value_json->>'media_incomplete', 'false')) = 'true'
    ) AS provider_media_ready,
    (pc.code <> 'holiday_home' OR l.category_contract_id IS NOT NULL) AS contract_ready
  FROM listings l
  JOIN product_categories pc ON pc.id = l.category_id
  WHERE pc.code IN ('holiday_home', 'yacht_charter', 'activity', 'ferry')
    AND l.status IN ('draft', 'published')
), published AS (
  UPDATE listings l SET status = 'published', updated_at = now()
  FROM quality q
  WHERE q.id = l.id AND l.status = 'draft'
    AND q.content_ready AND q.seo_ready AND q.media_ready
    AND q.provider_media_ready AND q.contract_ready
  RETURNING l.id
)
SELECT 'newly_published' AS result, count(*) AS affected FROM published;

COMMIT;

WITH quality AS (
  SELECT l.id, l.status, pc.code AS category_code,
    NOT EXISTS (
      SELECT 1 FROM locales lo WHERE lo.is_active = true AND NOT EXISTS (
        SELECT 1 FROM listing_translations lt WHERE lt.listing_id = l.id AND lt.locale_id = lo.id
          AND length(btrim(coalesce(lt.title, ''))) > 0 AND length(coalesce(lt.description, '')) >= 80
          AND lower(coalesce(lt.description, '')) ~ '<p([[:space:]]|>)'
          AND lower(coalesce(lt.description, '')) ~ '<(h2|h3|ul|ol)([[:space:]]|>)'
      )
    ) AS content_ready,
    NOT EXISTS (
      SELECT 1 FROM locales lo WHERE lo.is_active = true AND NOT EXISTS (
        SELECT 1 FROM seo_metadata sm WHERE sm.entity_type = 'listing'
          AND sm.entity_id = l.id AND sm.locale_id = lo.id
          AND length(btrim(coalesce(sm.title, ''))) > 10
          AND length(btrim(coalesce(sm.description, ''))) > 40
      )
    ) AS seo_ready,
    (SELECT count(*) FROM listing_images li WHERE li.listing_id = l.id) >=
      CASE pc.code WHEN 'holiday_home' THEN 5 WHEN 'yacht_charter' THEN 5 ELSE 1 END AS media_ready,
    NOT EXISTS (
      SELECT 1 FROM listing_attributes la WHERE la.listing_id = l.id
        AND lower(coalesce(la.value_json->>'media_incomplete', 'false')) = 'true'
    ) AS provider_media_ready,
    (pc.code <> 'holiday_home' OR l.category_contract_id IS NOT NULL) AS contract_ready
  FROM listings l JOIN product_categories pc ON pc.id = l.category_id
  WHERE pc.code IN ('holiday_home', 'yacht_charter', 'activity', 'ferry')
    AND l.status IN ('draft', 'published')
)
SELECT category_code, count(*) AS total,
  count(*) FILTER (WHERE status = 'published') AS published,
  count(*) FILTER (WHERE status = 'draft') AS draft,
  count(*) FILTER (WHERE NOT content_ready) AS content_blocked,
  count(*) FILTER (WHERE NOT seo_ready) AS seo_blocked,
  count(*) FILTER (WHERE NOT media_ready OR NOT provider_media_ready) AS media_blocked,
  count(*) FILTER (WHERE NOT contract_ready) AS contract_blocked
FROM quality GROUP BY category_code ORDER BY category_code;
SQL

echo "[OK] Çekirdek ilan kalite/yayın uzlaştırması tamamlandı."
