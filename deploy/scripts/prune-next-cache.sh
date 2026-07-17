#!/usr/bin/env bash
# Next.js fetch-cache + resilient snapshot dizinlerini sınırlı tutar.
# Next.js disk fetch-cache'i kendiliğinden temizlemez; yüksek URL çeşitliliği
# (kategori × dil × filtre × sayfa + botlar) klasörü sınırsız büyütür → disk dolar
# ve dizin yavaşlar. Bu script eski/dead cache dosyalarını budar.
#
# Otomatik: travel-prune-next-cache.timer (saatlik)
# Elle:     ./deploy/scripts/prune-next-cache.sh
set -uo pipefail

FRONTEND_DIR="${FRONTEND_DIR:-/var/www/vhosts/rezervasyonyap.tr/httpdocs/frontend}"
FETCH_CACHE="$FRONTEND_DIR/.next/cache/fetch-cache"
SNAP_CACHE="$FRONTEND_DIR/.next/cache/travel-public-listings"
WEBPACK_CACHE="$FRONTEND_DIR/.next/cache/webpack"

# Kaç saatten eski cache dosyaları silinsin (revalidate 300s olduğundan
# 6 saat fazlasıyla güvenli; sık gezilen sayfalar zaten yeniden yazılır).
FETCH_MAX_AGE_MIN="${FETCH_MAX_AGE_MIN:-360}"
# Snapshot yalnız fallback; 3 gün yeter (kod içi max-age ile uyumlu).
SNAP_MAX_AGE_MIN="${SNAP_MAX_AGE_MIN:-4320}"
# Güvenlik tavanı: dizinde bu sayıdan fazla dosya varsa en eskiden başlayarak kırp.
FETCH_MAX_FILES="${FETCH_MAX_FILES:-20000}"

log() { echo "[prune-next-cache] $*"; }

prune_by_age() {
  local dir="$1" age="$2"
  [[ -d "$dir" ]] || return 0
  local before after
  before="$(find "$dir" -type f 2>/dev/null | wc -l | tr -d ' ')"
  # ionice/nice: bu iş asla üretim I/O'sunu ezmesin.
  ionice -c3 -t nice -n 19 find "$dir" -type f -mmin +"$age" -delete 2>/dev/null || \
    find "$dir" -type f -mmin +"$age" -delete 2>/dev/null || true
  after="$(find "$dir" -type f 2>/dev/null | wc -l | tr -d ' ')"
  log "$dir: $before -> $after ( >${age}dk silindi )"
}

cap_by_count() {
  local dir="$1" cap="$2"
  [[ -d "$dir" ]] || return 0
  local n
  n="$(find "$dir" -type f 2>/dev/null | wc -l | tr -d ' ')"
  if [[ "${n:-0}" -gt "$cap" ]]; then
    local remove=$((n - cap))
    log "$dir: $n dosya > tavan $cap; en eski $remove siliniyor"
    # En eski dosyalar önce (mtime artan) → fazlalığı sil.
    find "$dir" -type f -printf '%T@ %p\0' 2>/dev/null \
      | sort -zn \
      | head -zn "$remove" \
      | cut -z -d' ' -f2- \
      | ionice -c3 -t nice -n 19 xargs -0 -r rm -f 2>/dev/null || true
  fi
}

log "start"
# Webpack cache'i runtime'da kullanilmaz; RAM build sonrasi diskte kalmasi
# sadece alan ve sonraki temizlemede metadata I/O tuketir.
if [[ -d "$WEBPACK_CACHE" ]]; then
  log "webpack build cache siliniyor (runtime tarafindan kullanilmaz)"
  ionice -c3 -t nice -n 19 rm -rf "$WEBPACK_CACHE" 2>/dev/null || \
    rm -rf "$WEBPACK_CACHE" 2>/dev/null || true
fi
prune_by_age "$FETCH_CACHE" "$FETCH_MAX_AGE_MIN"
cap_by_count "$FETCH_CACHE" "$FETCH_MAX_FILES"
prune_by_age "$SNAP_CACHE" "$SNAP_MAX_AGE_MIN"
log "done"
exit 0
