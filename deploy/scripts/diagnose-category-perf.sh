#!/usr/bin/env bash
# Kategori sayfası darboğaz teşhisi — API süreleri vs Next sayfa süresi.
#
# Kullanım (sunucuda, repo kökü):
#   chmod +x deploy/scripts/diagnose-category-perf.sh
#   ./deploy/scripts/diagnose-category-perf.sh
#
# Opsiyonel:
#   API_ORIGIN=http://127.0.0.1:8080 WEB_ORIGIN=http://127.0.0.1:3000 ./deploy/scripts/diagnose-category-perf.sh

set -uo pipefail

API_ORIGIN="${API_ORIGIN:-http://127.0.0.1:8080}"
WEB_ORIGIN="${WEB_ORIGIN:-http://127.0.0.1:3000}"
LOCALE="${LOCALE:-tr}"

prefix=""
if [[ "$LOCALE" != "tr" ]]; then
  prefix="/$LOCALE"
fi

time_curl() {
  local label="$1"
  local url="$2"
  local out
  out="$(curl -sS -o /dev/null -w "%{http_code} %{time_total}" --connect-timeout 3 --max-time 120 "$url" 2>/dev/null || echo "000 0")"
  local code="${out%% *}"
  local secs="${out##* }"
  printf "  %-42s HTTP=%-3s  %ss\n" "$label" "$code" "$secs"
}

echo "==> diagnose-category-perf (API=$API_ORIGIN WEB=$WEB_ORIGIN)"
echo
echo "-- API doğrudan (travel-api) --"
for cat in hotel holiday_home yacht_charter tour cruise; do
  lim=12
  [[ "$cat" == "holiday_home" || "$cat" == "yacht_charter" ]] && lim=48
  time_curl "listings?category=$cat&limit=$lim" \
    "$API_ORIGIN/api/v1/catalog/public/listings?category_code=$cat&limit=$lim&locale=$LOCALE"
done
time_curl "region-stats hotel" \
  "$API_ORIGIN/api/v1/catalog/public/region-stats?category_code=hotel&limit=12"
time_curl "theme-items hotel" \
  "$API_ORIGIN/api/v1/catalog/public/theme-items?category_code=hotel&locale=$LOCALE"

echo
echo "-- Next sayfa (travel-web, 2 tur) --"
for round in 1 2; do
  echo "  tur $round:"
  for path in /oteller/all /tatil-evleri/all /yat-kiralama/all /kruvaziyer/all; do
    time_curl "$path" "${WEB_ORIGIN}${prefix}${path}"
  done
done

echo
echo "-- travel-api log (son listings satırları) --"
if [[ -r /var/log/travel-api.log ]]; then
  tail -n 30 /var/log/travel-api.log | grep -E 'catalog\.public\.listings|timeout|53300|Seq Scan' || tail -n 8 /var/log/travel-api.log
else
  echo "  (log yok: /var/log/travel-api.log)"
fi

echo
echo "Yorum:"
echo "  - API tek başına >3s → PostgreSQL / index (invalid index: indisvalid=false)"
echo "  - API hızlı, sayfa >5s → Next dinamik render; unstable_cache deploy sonrası 2. tur düşmeli"
echo "  - 2. tur hâlâ yavaş → PUBLIC_LISTINGS_FETCH_TIMEOUT_MS veya snapshot yok"
