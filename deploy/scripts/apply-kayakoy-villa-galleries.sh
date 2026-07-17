#!/usr/bin/env bash
# Kayaköy Kuzey + Güney villa galerilerini sunucuya uygular.
#
# Fotoğrafları önce şuraya koyun:
#   /var/www/vhosts/rezervasyonyap.tr/tmp/kayakoy-kuzey-fotolar/
#   /var/www/vhosts/rezervasyonyap.tr/tmp/kayakoy-guney-fotolar/
#
#   cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
#   ./deploy/scripts/apply-kayakoy-villa-galleries.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

ENV_FILE="${TRAVEL_DB_ENV:-/etc/rezervasyonyap/backend.env}"
KUZEY_DIR="${KUZEY_PHOTO_DIR:-/var/www/vhosts/rezervasyonyap.tr/tmp/kayakoy-kuzey-fotolar}"
GUNEY_DIR="${GUNEY_PHOTO_DIR:-/var/www/vhosts/rezervasyonyap.tr/tmp/kayakoy-guney-fotolar}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

apply_one() {
  local slug="$1"
  local dir="$2"
  local title="$3"
  echo "===== $title ($slug) ====="
  echo "dir: $dir"
  local n
  n="$(find "$dir" -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.webp' -o -iname '*.avif' \) 2>/dev/null | wc -l | tr -d ' ')"
  if [[ ! -d "$dir" ]] || [[ "$n" -lt 1 ]]; then
    echo "HATA: foto yok ($n dosya). Windows'tan scp ile yükleyin."
    return 1
  fi
  echo "images: $n"
  node scripts/set-villa-gallery-from-folder.mjs --slug "$slug" --dir "$dir"
}

ok=0
apply_one 'kayakoy-kuzey-villa' "$KUZEY_DIR" 'Kayaköy Kuzey Villa' && ok=$((ok + 1)) || true
apply_one 'kayakoy-guney-villa' "$GUNEY_DIR" 'Kayaköy Güney Villa' && ok=$((ok + 1)) || true

if [[ "$ok" -gt 0 ]]; then
  echo "[kayakoy] vitrin / cache"
  ./deploy/scripts/refresh-vitrin-prices.sh 2>/dev/null || true
  rm -rf frontend/.next/cache/fetch-cache 2>/dev/null || true
  systemctl restart travel-web
  sleep 6
  curl -sS -o /dev/null -w "web %{http_code}\n" --max-time 20 http://127.0.0.1:3000/ || true
fi

echo "[kayakoy] bitti — başarılı galeri: $ok / 2"
