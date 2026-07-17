#!/usr/bin/env bash
# Acil frontend recovery: Webpack'in binlerce ara dosyasini VPS diskine degil
# gecici tmpfs'e yazar. Basarili cikti en sonda tek seferde .next'e aktarilir.
#
# Kullanim (root):
#   RAM_BUILD_SIZE=2G ./deploy/scripts/build-frontend-in-ram.sh
#
# Not: Mevcut .next build bitene kadar yerinde kalir. Basarisiz derleme
# calisan siteyi bozmaz; basarili derlemeden sonra atomik dizin degisimi olur.
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FRONTEND_DIR="${FRONTEND_DIR:-$APP_ROOT/frontend}"
WEB_SERVICE="${WEB_SERVICE:-travel-web.service}"
ENV_FILE="${FRONTEND_ENV_FILE:-/etc/rezervasyonyap/frontend.env}"
RAM_BUILD_SIZE="${RAM_BUILD_SIZE:-2G}"

fail() { echo "[FAIL] $*" >&2; exit 1; }
step() { echo; echo "==> $*"; }

[[ "$(id -u)" -eq 0 ]] || fail "tmpfs mount icin root gerekli"
[[ -f "$FRONTEND_DIR/package.json" ]] || fail "Frontend bulunamadi: $FRONTEND_DIR"
command -v mount >/dev/null || fail "mount komutu bulunamadi"
command -v tar >/dev/null || fail "tar komutu bulunamadi"

if [[ -f "$ENV_FILE" ]]; then
  # NEXT_PUBLIC_* build asamasinda gomulur; production ile ayni env kullanilmali.
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

RAM_DIR="$(mktemp -d /run/travel-frontend-build.XXXXXX)"
STAGE_DIR="$FRONTEND_DIR/.next.ram-stage.$$"
BACKUP_DIR="$FRONTEND_DIR/.next.pre-ram-$(date +%Y%m%d%H%M%S)"
mounted=0

cleanup() {
  local status=$?
  if [[ "$mounted" -eq 1 ]]; then
    umount "$RAM_DIR" 2>/dev/null || true
  fi
  rmdir "$RAM_DIR" 2>/dev/null || true
  if [[ "$status" -ne 0 ]]; then
    rm -rf "$STAGE_DIR" 2>/dev/null || true
    echo "[FAIL] Build degistirilmedi; mevcut .next yerinde." >&2
  fi
}
trap cleanup EXIT

step "RAM build alani baglaniyor ($RAM_BUILD_SIZE)"
mount -t tmpfs -o "size=$RAM_BUILD_SIZE,mode=0755" tmpfs "$RAM_DIR"
mounted=1

step "Kaynaklar RAM calisma alanina baglaniyor"
shopt -s dotglob nullglob
for entry in "$FRONTEND_DIR"/*; do
  [[ "$(basename "$entry")" == ".next" ]] && continue
  ln -s "$entry" "$RAM_DIR/$(basename "$entry")"
done
shopt -u dotglob nullglob

step "Webpack production build (ara dosyalar RAM'de)"
(
  cd "$RAM_DIR"
  export NEXT_TELEMETRY_DISABLED=1
  export NEXT_NODE_HEAP_MB="${NEXT_NODE_HEAP_MB:-4096}"
  export CSS_OPTIMIZE="${CSS_OPTIMIZE:-0}"
  export TRAVEL_LOW_IO_BUILD="${TRAVEL_LOW_IO_BUILD:-1}"
  if command -v ionice >/dev/null 2>&1; then
    exec ionice -c3 nice -n 19 npm run build
  fi
  exec nice -n 19 npm run build
)

[[ -f "$RAM_DIR/.next/BUILD_ID" ]] || fail "BUILD_ID yok; cikti eksik"
[[ -d "$RAM_DIR/.next/static" ]] || fail "static cikti yok; cikti eksik"

step "Basarili build diske aktariliyor"
rm -rf "$STAGE_DIR"
mkdir -p "$STAGE_DIR"
(cd "$RAM_DIR/.next" && tar -cf - .) | (cd "$STAGE_DIR" && tar -xpf -)

[[ -f "$STAGE_DIR/BUILD_ID" ]] || fail "Diskte BUILD_ID yok; degisim iptal edildi"
[[ -d "$STAGE_DIR/static" ]] || fail "Diskte static cikti yok; degisim iptal edildi"

step "Yeni build atomik olarak etkinlestiriliyor"
if [[ -e "$FRONTEND_DIR/.next" ]]; then
  mv "$FRONTEND_DIR/.next" "$BACKUP_DIR"
fi
mv "$STAGE_DIR" "$FRONTEND_DIR/.next"

systemctl restart "$WEB_SERVICE"
sleep 8
curl -fsS --max-time 30 -o /dev/null http://127.0.0.1:3000/ \
  || fail "$WEB_SERVICE yeniden basladi ancak :3000 yanit vermedi"

echo "[OK] Webpack RAM build basarili. Onceki build: $BACKUP_DIR"
