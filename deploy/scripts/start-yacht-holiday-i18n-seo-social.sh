#!/usr/bin/env bash
# Tatil evi + yat: eksik diller → çeviri → SEO kuyruğu (kesintisiz worker) +
# onaylı (mavi tik) sosyal boost + Instagram Reels.
#
# Pipeline (ilan başına otomatik):
#   tr_description → translations (en,de,ru,zh,fr) → seo (6 dil) → done
#
#   cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
#   chmod +x deploy/scripts/start-yacht-holiday-i18n-seo-social.sh
#   ./deploy/scripts/start-yacht-holiday-i18n-seo-social.sh
#
# Opsiyonel:
#   OVERWRITE=1          # mevcut çeviri/SEO'yu da baştan yaz (dikkat: uzun sürer)
#   ONLY_CATEGORIES=holiday_home,yacht_charter
#   SKIP_SOCIAL_BOOST=1  # yalnız AI kuyruk
#   SKIP_WORKER_KICK=1   # timer kur, hemen tetikleme
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck source=deploy/scripts/lib/psql-env.sh
source "$APP_ROOT/deploy/scripts/lib/psql-env.sh"

OVERWRITE="${OVERWRITE:-0}"
ONLY_CATEGORIES="${ONLY_CATEGORIES:-holiday_home,yacht_charter}"
SKIP_SOCIAL_BOOST="${SKIP_SOCIAL_BOOST:-0}"
SKIP_WORKER_KICK="${SKIP_WORKER_KICK:-0}"

cd "$APP_ROOT"

overwrite_sql=false
if [[ "$OVERWRITE" == "1" || "$OVERWRITE" == "true" ]]; then
  overwrite_sql=true
fi

# Kategori listesini SQL IN (...) için güvenli hale getir
cats_sql="$(
  node -e "
    const raw = process.env.ONLY_CATEGORIES || 'holiday_home,yacht_charter';
    const allowed = new Set(['holiday_home','yacht_charter','activity','ferry','hotel','tour','cruise']);
    const cats = [...new Set(raw.split(',').map(s => s.trim()).filter(c => allowed.has(c)))];
    if (!cats.length) { console.error('no valid categories'); process.exit(1); }
    process.stdout.write(cats.map(c => \"'\" + c + \"'\").join(','));
  "
)"

echo "[INFO] Kuyruk kategorileri: $cats_sql  overwrite=$overwrite_sql"

# 1) Failed → pending; eksik çeviri/SEO olanları (veya OVERWRITE) kuyruğa al
OVERWRITE_SQL="$overwrite_sql" CATS_SQL="$cats_sql" node --input-type=module <<'NODE' | psql_travel -v ON_ERROR_STOP=1
const overwrite = process.env.OVERWRITE_SQL === 'true'
const cats = process.env.CATS_SQL
const sql = `
-- Eski hataları yeniden dene
UPDATE ai_listing_content_batches
SET status = 'pending', error = NULL, updated_at = now()
WHERE category_code IN (${cats})
  AND status = 'failed';

-- Stuck running (>20 dk) → pending
UPDATE ai_listing_content_batches
SET status = 'pending', error = coalesce(error, 'reset_stuck_running'), updated_at = now()
WHERE category_code IN (${cats})
  AND status = 'running'
  AND updated_at < now() - interval '20 minutes';

${overwrite ? `
-- OVERWRITE: done kayıtlarını yeniden başlat (aktif pending/running yoksa)
UPDATE ai_listing_content_batches b
SET phase = 'tr_description', status = 'pending', overwrite = true,
    error = NULL, updated_at = now()
WHERE b.category_code IN (${cats})
  AND b.status = 'done'
  AND NOT EXISTS (
    SELECT 1 FROM ai_listing_content_batches x
    WHERE x.listing_id = b.listing_id AND x.status IN ('pending', 'running')
      AND x.id IS DISTINCT FROM b.id
  );
` : ''}

WITH targets AS (
  SELECT l.id, pc.code AS category_code
  FROM listings l
  JOIN product_categories pc ON pc.id = l.category_id
  WHERE pc.code IN (${cats})
    AND l.status IN ('draft', 'published')
    AND NOT EXISTS (
      SELECT 1 FROM ai_listing_content_batches b
      WHERE b.listing_id = l.id AND b.status IN ('pending', 'running')
    )
    AND (
      ${overwrite ? 'TRUE' : `
      -- Eksik: TR editöryal, 5 dil çeviri veya 6 dil SEO
      EXISTS (
        SELECT 1 FROM locales lo WHERE lo.is_active = true AND NOT EXISTS (
          SELECT 1 FROM listing_translations lt
          WHERE lt.listing_id = l.id AND lt.locale_id = lo.id
            AND length(btrim(coalesce(lt.title, ''))) > 0
            AND length(coalesce(lt.description, '')) >= 80
            AND lower(coalesce(lt.description, '')) ~ '<p([[:space:]]|>)'
            AND lower(coalesce(lt.description, '')) ~ '<(h2|h3|ul|ol)([[:space:]]|>)'
        )
      )
      OR EXISTS (
        SELECT 1 FROM locales lo WHERE lo.is_active = true AND NOT EXISTS (
          SELECT 1 FROM seo_metadata sm
          WHERE sm.entity_type = 'listing' AND sm.entity_id = l.id AND sm.locale_id = lo.id
            AND length(btrim(coalesce(sm.title, ''))) > 10
            AND length(btrim(coalesce(sm.description, ''))) > 40
        )
      )
      `}
    )
), queued AS (
  INSERT INTO ai_listing_content_batches
    (listing_id, category_code, phase, status, overwrite)
  SELECT id, category_code, 'tr_description', 'pending', ${overwrite}
  FROM targets
  RETURNING category_code
)
SELECT 'yacht_holiday_i18n_seo_queued' AS result, category_code, count(*) AS n
FROM queued GROUP BY category_code
ORDER BY category_code;

SELECT category_code, status, count(*) AS n
FROM ai_listing_content_batches
WHERE category_code IN (${cats})
GROUP BY category_code, status
ORDER BY category_code, status;
`
process.stdout.write(sql)
NODE

# 2) Onaylı hesap sosyal boost + Reels açık
if [[ "$SKIP_SOCIAL_BOOST" != "1" ]]; then
  echo "[INFO] social_api: Reels + verified boost..."
  psql_travel -v ON_ERROR_STOP=1 <<'SQL'
-- Token'ları koru; rotation + meta.auto_post güncelle (satır yoksa uyarı)
UPDATE site_settings
SET value_json = value_json
  || jsonb_build_object(
       'meta', coalesce(value_json->'meta', '{}'::jsonb)
         || jsonb_build_object('auto_post', true),
       'rotation', coalesce(value_json->'rotation', '{}'::jsonb)
         || jsonb_build_object(
              'enabled', true,
              'auto_story', true,
              'auto_reel', true,
              'stories_per_day', 30,
              'per_run_limit', 2,
              'min_repost_hours', 18,
              'category_codes', coalesce(
                value_json->'rotation'->'category_codes',
                '["holiday_home","yacht_charter","activity"]'::jsonb
              ),
              'story_category_codes', coalesce(
                value_json->'rotation'->'story_category_codes',
                '["holiday_home","yacht_charter","activity","cruise","hotel","ferry","car_rental","flight"]'::jsonb
              ),
              'reel_category_codes', coalesce(
                value_json->'rotation'->'reel_category_codes',
                '["holiday_home","yacht_charter","activity","cruise","hotel","ferry","car_rental","flight"]'::jsonb
              )
            )
     )
WHERE organization_id IS NULL AND key = 'social_api';

SELECT CASE WHEN EXISTS (
  SELECT 1 FROM site_settings WHERE organization_id IS NULL AND key = 'social_api'
) THEN 'social_api_boost_ok' ELSE 'social_api_missing_configure_in_admin' END AS result;

SELECT
  value_json->'rotation'->>'auto_reel' AS auto_reel,
  value_json->'rotation'->>'stories_per_day' AS stories_per_day,
  value_json->'rotation'->>'per_run_limit' AS per_run_limit,
  value_json->'meta'->>'auto_post' AS meta_auto_post
FROM site_settings
WHERE organization_id IS NULL AND key = 'social_api'
LIMIT 1;
SQL
fi

# 3) AI worker throughput (bu oturum için unit override dosyası)
mkdir -p /etc/systemd/system/travel-ai-worker.service.d 2>/dev/null || true
if [[ -d /etc/systemd/system/travel-ai-worker.service.d ]]; then
  cat >/etc/systemd/system/travel-ai-worker.service.d/burst.conf <<'EOF'
[Service]
Environment=WORKER_LOOPS=12
Environment=AI_CONTENT_SEED_LIMIT=100
Environment=AI_CONTENT_AUTO_SEED=1
Environment=CORE_LISTING_RECONCILE=1
EOF
  echo "[OK] AI worker burst conf yazıldı (WORKER_LOOPS=12, SEED=100)"
fi

# 4) Timer + hemen tetik
chmod +x \
  "$APP_ROOT/deploy/scripts/ensure-ai-social-workers.sh" \
  "$APP_ROOT/deploy/scripts/ai-worker-run-steps.sh" \
  "$APP_ROOT/deploy/scripts/social-process-pending.sh" \
  "$APP_ROOT/deploy/scripts/seed-ai-content-queues.sh" \
  2>/dev/null || true

if [[ "$SKIP_WORKER_KICK" == "1" ]]; then
  SKIP_KICK=1 "$APP_ROOT/deploy/scripts/ensure-ai-social-workers.sh"
else
  "$APP_ROOT/deploy/scripts/ensure-ai-social-workers.sh"
fi

echo ""
echo "[OK] Yat + tatil evi i18n/SEO kuyruğu + sosyal (Reels) başlatıldı."
echo "[INFO] İlerleme: node scripts/status-listing-content-localization.mjs"
echo "[INFO] AI log:   journalctl -u travel-ai-worker.service -n 40 --no-pager"
echo "[INFO] Social:   journalctl -u travel-social-worker.service -n 40 --no-pager"
echo "[INFO] Timer:    systemctl list-timers 'travel-*-worker.timer' --no-pager"
