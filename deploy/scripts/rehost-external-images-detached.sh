#!/usr/bin/env bash
# Harici ilan görsellerini lokale (uploads AVIF) çeker — SSH kopsa bile devam.
#
#   chmod +x deploy/scripts/rehost-external-images-detached.sh
#   ./deploy/scripts/rehost-external-images-detached.sh
#   ./deploy/scripts/rehost-external-images-detached.sh --category=activity --hosts=fairystonetravel.com
#   ./deploy/scripts/rehost-external-images-detached.sh --source=manual
#   ./deploy/scripts/rehost-external-images-detached.sh status|tail|wait|stop
#
# VPS soft lockup önlemi (varsayılan düşük yük):
#   IMAGE_CONVERT_CONCURRENCY=1 AVIF_EFFORT=2 VIPS_CONCURRENCY=1
#
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_ENV="${TRAVEL_DB_ENV:-/etc/rezervasyonyap/backend.env}"
LOG="${TRAVEL_REHOST_LOG:-$APP_ROOT/.deploy/rehost-images.log}"
PID_FILE="${TRAVEL_REHOST_PID:-$APP_ROOT/.deploy/rehost-images.pid}"

mkdir -p "$(dirname "$LOG")" "$(dirname "$PID_FILE")"

is_running() {
  [[ -f "$PID_FILE" ]] || return 1
  local pid
  pid="$(cat "$PID_FILE" 2>/dev/null || true)"
  [[ -n "$pid" ]] || return 1
  kill -0 "$pid" 2>/dev/null
}

if [[ "${1:-}" == "status" ]]; then
  if is_running; then
    echo "Rehost calisiyor (pid $(cat "$PID_FILE"))."
  else
    echo "Rehost calismiyor."
    [[ -f "$LOG" ]] && tail -n 8 "$LOG" || true
  fi
  exit 0
fi

if [[ "${1:-}" == "tail" ]]; then
  exec tail -n 80 -f "$LOG"
fi

if [[ "${1:-}" == "wait" ]]; then
  while is_running; do sleep 5; done
  echo "Rehost bitti."
  tail -n 40 "$LOG" || true
  exit 0
fi

if [[ "${1:-}" == "stop" ]]; then
  if is_running; then
    pid="$(cat "$PID_FILE")"
    echo "Rehost durduruluyor (pid $pid)…"
    kill "$pid" 2>/dev/null || true
    sleep 1
    kill -9 "$pid" 2>/dev/null || true
    # sharp/libvips çocuk süreçleri
    pkill -f 'rehost-external-listing-images-avif\.mjs' 2>/dev/null || true
    rm -f "$PID_FILE"
    echo "Durduruldu."
  else
    echo "Rehost zaten çalışmıyor."
    pkill -f 'rehost-external-listing-images-avif\.mjs' 2>/dev/null || true
    rm -f "$PID_FILE"
  fi
  exit 0
fi

NODE_ARGS=("$@")
if [[ "${1:-}" == "start" ]]; then
  NODE_ARGS=("${@:2}")
fi

if is_running; then
  echo "Zaten calisiyor (pid $(cat "$PID_FILE")). Log: $LOG"
  exit 0
fi

if [[ -f "$BACKEND_ENV" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$BACKEND_ENV"
  set +a
fi

cd "$APP_ROOT"
# pg scripts/ altında; sharp frontend'de (AVIF dönüşümü)
if [[ ! -d "$APP_ROOT/scripts/node_modules/pg" ]]; then
  echo "→ scripts/npm: pg kuruluyor…"
  (cd "$APP_ROOT/scripts" && npm install --omit=dev --no-fund --no-audit)
fi
if [[ ! -d "$APP_ROOT/frontend/node_modules/sharp" ]]; then
  echo "Uyari: frontend/node_modules/sharp yok — AVIF donusumu basarisiz olabilir."
fi

# Soft lockup (aom enc / libvips) önlemi — VPS'te tek dönüşüm + düşük effort.
export IMAGE_CONVERT_CONCURRENCY="${IMAGE_CONVERT_CONCURRENCY:-1}"
export IMAGE_DOWNLOAD_CONCURRENCY="${IMAGE_DOWNLOAD_CONCURRENCY:-2}"
export AVIF_EFFORT="${AVIF_EFFORT:-2}"
export AVIF_QUALITY="${AVIF_QUALITY:-82}"
export VIPS_CONCURRENCY="${VIPS_CONCURRENCY:-1}"
export UV_THREADPOOL_SIZE="${UV_THREADPOOL_SIZE:-2}"
export REHOST_LISTING_PAUSE_MS="${REHOST_LISTING_PAUSE_MS:-400}"

echo "→ Rehost basliyor… args=${NODE_ARGS[*]:-(all)} convert=${IMAGE_CONVERT_CONCURRENCY} effort=${AVIF_EFFORT} log=$LOG"
# nice/ionice: site trafiğini boğmasın (ionice yoksa sadece nice)
RUNNER=(nice -n 15)
if command -v ionice >/dev/null 2>&1; then
  RUNNER+=(ionice -c2 -n7)
fi
nohup setsid "${RUNNER[@]}" \
  node scripts/rehost-external-listing-images-avif.mjs "${NODE_ARGS[@]}" \
  >>"$LOG" 2>&1 </dev/null &
echo $! >"$PID_FILE"
disown || true
echo "pid=$(cat "$PID_FILE")"
echo "Durum: $0 status | Log: $0 tail | Durdur: $0 stop | Bitince: $0 wait"
