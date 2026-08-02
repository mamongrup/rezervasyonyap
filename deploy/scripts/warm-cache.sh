#!/usr/bin/env bash
# Deploy/restart sonrası kritik vitrin sayfalarının ISR (revalidate) önbelleğini ısıtır.
# Amaç: ilk gerçek ziyaretçinin "soğuk" render'a (kategori listeleri ~1-1.3s) düşmemesi.
# travel-web restart Next Data/Full-Route cache'ini boşaltır → bu script önceden render tetikler.
#
# Kullanım:
#   chmod +x deploy/scripts/warm-cache.sh
#   ./deploy/scripts/warm-cache.sh
# Opsiyonel:
#   WEB_ORIGIN=http://127.0.0.1:3000 LOCALE=tr ./deploy/scripts/warm-cache.sh
#   WARM_ROUNDS=2 ./deploy/scripts/warm-cache.sh   # varsayılan: her sayfayı 2 kez (soğuk + ISR doğrula)
#
# Not: Başarısız (yavaş/timeout) sayfalar deploy'u BOZMAZ; script her zaman 0 döner.

set -uo pipefail

WEB_ORIGIN="${WEB_ORIGIN:-http://127.0.0.1:3000}"
LOCALE="${LOCALE:-tr}"
WARM_ROUNDS="${WARM_ROUNDS:-2}"
MAX_TIME="${WARM_MAX_TIME:-30}"

# TR varsayılan locale: vitrin segmentleri prefix'siz çalışır (api-origin/localized-routes).
# Kritik landing + tam liste sayfaları (en sık girilen ve en pahalı render'lar).
PATHS=(
  "/"
  "/oteller/all"
  "/tatil-evleri/all"
  "/turlar/all"
  "/aktiviteler/all"
  "/yat-kiralama/all"
  "/kruvaziyer/all"
  "/arac-kiralama/all"
  "/feribot/all"
  "/transfer/all"
  "/vize/all"
  "/hac-umre/all"
  "/ucak-bileti/all"
)

# Anasayfadaki ilan vitrinleri ayrı API uçlarıyla yüklenir. Yalnız `/` ısıtılırsa
# ilk gerçek ziyaretçi bu katalog sorgularını bekler.
HOMEPAGE_FEATURED_CATEGORIES=(
  "oteller"
  "tatil-evleri"
  "yat-kiralama"
  "turlar"
  "aktiviteler"
  "feribot"
)

# Locale prefix'i yalnızca tr değilse ekle (tr prefix'siz servis edilir).
prefix=""
if [[ "$LOCALE" != "tr" ]]; then
  prefix="/$LOCALE"
fi

echo "==> warm-cache: $WEB_ORIGIN (locale=$LOCALE, rounds=$WARM_ROUNDS)"
ok=0
total=0
for ((r = 1; r <= WARM_ROUNDS; r++)); do
  for p in "${PATHS[@]}"; do
    url="${WEB_ORIGIN}${prefix}${p}"
    total=$((total + 1))
    # %{http_code}/%{time_total} — yavaş/timeout sayfaları raporla, deploy'u bozma.
    out="$(curl -sS -o /dev/null -w "%{http_code} %{time_total}" \
      --connect-timeout 5 --max-time "$MAX_TIME" "$url" 2>/dev/null || echo "000 0")"
    code="${out%% *}"
    secs="${out##* }"
    if [[ "$code" == "200" ]]; then
      ok=$((ok + 1))
      printf "   [OK]   %-28s %ss\n" "${prefix}${p}" "$secs"
    else
      printf "   [WARN] %-28s HTTP=%s %ss\n" "${prefix}${p}" "$code" "$secs"
    fi
  done
done

echo "==> anasayfa ilan vitrinleri ısıtılıyor"
for ((r = 1; r <= WARM_ROUNDS; r++)); do
  pids=()
  for category in "${HOMEPAGE_FEATURED_CATEGORIES[@]}"; do
    url="${WEB_ORIGIN}/api/homepage-featured?category=${category}&locale=${LOCALE}&include_last_minute=0"
    (
      out="$(curl -sS -o /dev/null -w "%{http_code} %{time_total}" \
        --connect-timeout 5 --max-time "$MAX_TIME" "$url" 2>/dev/null || echo "000 0")"
      printf "   [featured] %-20s HTTP=%s %ss\n" "$category" "${out%% *}" "${out##* }"
    ) &
    pids+=("$!")
  done
  for pid in "${pids[@]}"; do wait "$pid" || true; done
done

echo "==> warm-cache bitti: $ok/$total sayfa 200"
exit 0
