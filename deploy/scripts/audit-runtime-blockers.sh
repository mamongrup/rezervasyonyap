#!/usr/bin/env bash
# Runtime blocker audit — eksik migration, çalışmayan servis, çift süreç, bekleyen deploy.
# Salt okunur; hiçbir şeyi öldürmez/değiştirmez.
#
#   cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
#   chmod +x deploy/scripts/audit-runtime-blockers.sh
#   ./deploy/scripts/audit-runtime-blockers.sh
set -uo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$APP_ROOT"

sec() { echo; echo "===== $* ====="; }
ok() { echo "[OK] $*"; }
warn() { echo "[WARN] $*"; }
bad() { echo "[BAD] $*"; }

sec "1) Git / deploy durumu"
echo "cwd=$APP_ROOT"
git log -1 --oneline 2>/dev/null || bad "git log fail"
git status -sb 2>/dev/null | head -5
echo
./deploy/deploy-detached.sh status 2>/dev/null || true
if [[ -f .deploy/travel-deploy.pid ]]; then
  pid="$(cat .deploy/travel-deploy.pid 2>/dev/null || true)"
  if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
    bad "Aktif deploy process var (pid $pid) — ikinci deploy başlatmayın"
  else
    ok "Aktif deploy process yok (pid dosyası eski olabilir: $pid)"
  fi
else
  ok "Deploy pid dosyası yok"
fi
if [[ -f .travel-deploy-shipment.lock ]] || [[ -f /run/travel-shipment.lock ]]; then
  warn "Shipment lock dosyası mevcut — kontrol: ls -la .travel-deploy-shipment.lock /run/travel-shipment.lock 2>/dev/null"
  ls -la .travel-deploy-shipment.lock /run/travel-shipment.lock 2>/dev/null || true
fi
echo "--- son deploy log (25) ---"
tail -n 25 .deploy/travel-deploy.log 2>/dev/null || warn "deploy log yok"

sec "2) Servisler (çalışmalı / çalışmamalı)"
for u in travel-web travel-api; do
  st="$(systemctl is-active "$u" 2>/dev/null || echo missing)"
  if [[ "$st" == "active" ]]; then ok "$u = active"; else bad "$u = $st"; fi
done
echo "--- travel-* timer ---"
systemctl list-timers 'travel-*' --all --no-pager 2>/dev/null | head -25 || true
echo "--- travel-* service (running?) ---"
systemctl list-units 'travel-*' --type=service --all --no-pager 2>/dev/null | head -30 || true

sec "3) Çift / fazla process"
echo "--- gleam/next/node travel ---"
ps aux | grep -E 'travel-api|erlang-shipment|next start|next-server|gleam run' | grep -v grep || echo "(yok)"
web_n="$(pgrep -af 'next start|next-server' 2>/dev/null | grep -vc grep || true)"
api_n="$(pgrep -af 'erlang-shipment|beam.*travel|travel-api' 2>/dev/null | grep -vc grep || true)"
echo "next-ish count≈$web_n  api/beam-ish count≈$api_n"
echo "--- deploy/apply-sql/psql eşzamanlı ---"
ps aux | grep -E 'deploy\.sh|deploy-detached|apply-sql|refresh_listing_region|npm run build' | grep -v grep || echo "(yok — iyi)"

sec "4) PostgreSQL bağlantı / orphan / uzun sorgu"
# app env'den kullanıcı tahmin
ENV_FILE="${BACKEND_ENV_FILE:-/etc/rezervasyonyap/backend.env}"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a; # partial source safe-ish
  # only PG* / DATABASE
  while IFS= read -r line; do
    case "$line" in
      PGUSER=*|PGDATABASE=*|PGHOST=*|PGPORT=*|DATABASE_URL=*) export "$line" ;;
    esac
  done < <(grep -E '^(PGUSER|PGDATABASE|PGHOST|PGPORT|DATABASE_URL)=' "$ENV_FILE" 2>/dev/null || true)
  set +a
fi
PSQL=(psql)
if [[ -n "${DATABASE_URL:-}" ]]; then
  PSQL=(psql "$DATABASE_URL")
elif command -v sudo >/dev/null; then
  PSQL=(sudo -u postgres psql -d "${PGDATABASE:-travel}")
fi
echo "psql via: ${PSQL[*]}"
"${PSQL[@]}" -v ON_ERROR_STOP=0 -c "
SELECT usename, state, count(*) 
FROM pg_stat_activity 
WHERE datname = current_database() OR datname IS NULL
GROUP BY 1,2 ORDER BY 3 DESC;
" 2>&1 | head -40

"${PSQL[@]}" -v ON_ERROR_STOP=0 -c "
SELECT count(*) AS travel_prod_like
FROM pg_stat_activity
WHERE usename IN ('travel_prod','travel','postgres')
  AND pid <> pg_backend_pid();
" 2>&1 | head -10

"${PSQL[@]}" -v ON_ERROR_STOP=0 -c "
SELECT pid, usename, state, now()-query_start AS running_for, left(query,100) AS q
FROM pg_stat_activity
WHERE state = 'active'
  AND now()-query_start > interval '8 seconds'
  AND pid <> pg_backend_pid()
ORDER BY running_for DESC
LIMIT 15;
" 2>&1 | head -40

sec "5) Eksik migration belirtileri (şema smoke)"
"${PSQL[@]}" -v ON_ERROR_STOP=0 -c "
SELECT
  to_regclass('public.listing_region_stats_cache') IS NOT NULL AS has_372_cache,
  EXISTS(SELECT 1 FROM pg_proc WHERE proname='refresh_listing_region_stats') AS has_refresh_fn,
  to_regclass('public.listings') IS NOT NULL AS has_listings,
  EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='vitrin_price'
  ) AS has_vitrin_price,
  EXISTS(
    SELECT 1 FROM pg_indexes WHERE indexname LIKE '%trgm%' OR indexdef ILIKE '%gin_trgm%'
  ) AS has_some_trgm_index;
" 2>&1 | head -20

"${PSQL[@]}" -v ON_ERROR_STOP=0 -c "
SELECT category_code, count(*) AS rows,
       count(*) FILTER (WHERE coalesce(thumbnail,'')='') AS empty_thumb,
       max(refreshed_at) AS last_refresh
FROM listing_region_stats_cache
GROUP BY 1 ORDER BY 1;
" 2>&1 | head -30

"${PSQL[@]}" -v ON_ERROR_STOP=0 -c "
SELECT c.relname AS invalid_index
FROM pg_index i
JOIN pg_class c ON c.oid=i.indexrelid
WHERE NOT i.indisvalid
LIMIT 20;
" 2>&1 | head -30

# 369/370/371 deploy.sh auto-apply etmez — varlık kontrolü
"${PSQL[@]}" -v ON_ERROR_STOP=0 -c "
SELECT indexname FROM pg_indexes
WHERE schemaname='public'
  AND (indexname ILIKE '%listing%trgm%' OR indexname ILIKE '%suggest%trgm%' OR indexname ILIKE '%vitrin%')
ORDER BY 1
LIMIT 40;
" 2>&1 | head -50

sec "6) Yerel HTTP duman"
curl -sS -o /dev/null -w "web :3000  %{http_code} ttfb=%{time_starttransfer}\n" --max-time 15 http://127.0.0.1:3000/ || bad "web fail"
curl -sS -o /dev/null -w "api :8080  %{http_code} ttfb=%{time_starttransfer}\n" --max-time 15 http://127.0.0.1:8080/api/v1/meta || bad "api fail"
curl -sS -o /dev/null -w "hotels api %{http_code} ttfb=%{time_starttransfer}\n" --max-time 20 \
  'http://127.0.0.1:8080/api/v1/catalog/public/listings?category_code=hotel&limit=12&sort=created_at' || true
curl -sS --max-time 15 'http://127.0.0.1:8080/api/v1/catalog/public/region-stats?category_code=hotel&limit=20' \
  | python3 -c "import sys,json;from collections import Counter
rs=json.load(sys.stdin).get('regions',[])
c=Counter(r['name'] for r in rs)
d={k:v for k,v in c.items() if v>1}
print('region rows',len(rs),'dupes',d or 'none','empty_thumb',sum(1 for r in rs if not (r.get('thumbnail')or'').strip()))" 2>/dev/null || warn "region-stats parse fail"

sec "7) load / bellek (özet)"
uptime
free -h | head -3
df -h / /var/www 2>/dev/null | head -5

echo
echo "Bitti — bu çıktıyı olduğu gibi paylaşın."
