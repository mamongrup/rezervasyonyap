#!/usr/bin/env bash
# Main deploy + Bodrum TatilBudur taslak importunu SSH/Plesk kopsa da sürdürür.
#
#   cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
#   DEPLOY_REF=main ./deploy/scripts/import-bodrum-tatilbudur-detached.sh
#   ./deploy/scripts/import-bodrum-tatilbudur-detached.sh status|tail|wait
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOG="${TATILBUDUR_BODRUM_IMPORT_LOG:-$APP_ROOT/.deploy/tatilbudur-bodrum-import.log}"
PID_FILE="${TATILBUDUR_BODRUM_IMPORT_PID:-$APP_ROOT/.deploy/tatilbudur-bodrum-import.pid}"
DEPLOY_REF="${DEPLOY_REF:-main}"

mkdir -p "$(dirname "$LOG")"

is_running() {
  [[ -f "$PID_FILE" ]] || return 1
  local pid
  pid="$(<"$PID_FILE")"
  [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}

case "${1:-start}" in
  status)
    if is_running; then
      echo "Bodrum import çalışıyor (pid $(<"$PID_FILE")). Log: $LOG"
    else
      echo "Bodrum import çalışmıyor."
      [[ -f "$LOG" ]] && tail -n 20 "$LOG" || true
    fi
    exit 0
    ;;
  tail)
    exec tail -n 80 -f "$LOG"
    ;;
  wait)
    while is_running; do sleep 5; done
    echo "Bodrum import tamamlandı."
    tail -n 40 "$LOG" || true
    exit 0
    ;;
  start)
    ;;
  *)
    echo "Kullanım: $0 [start|status|tail|wait]" >&2
    exit 2
    ;;
esac

if is_running; then
  echo "Zaten çalışıyor (pid $(<"$PID_FILE")). Log: $LOG"
  exit 1
fi

run='set -eo pipefail
cd "$APP_ROOT"
chmod +x deploy/deploy.sh deploy/scripts/import-bodrum-tatilbudur-drafts.sh
DEPLOY_REF="$DEPLOY_REF" bash deploy/deploy.sh
bash deploy/scripts/import-bodrum-tatilbudur-drafts.sh'

{
  echo "========================================"
  echo "[bodrum-tatilbudur] başladı: $(date -Is)"
  echo "[bodrum-tatilbudur] ref=$DEPLOY_REF cwd=$APP_ROOT"
  echo "========================================"
} >>"$LOG"

export APP_ROOT DEPLOY_REF
if command -v setsid >/dev/null 2>&1; then
  setsid bash -c "$run" >>"$LOG" 2>&1 &
else
  nohup bash -c "$run" >>"$LOG" 2>&1 &
fi
echo $! >"$PID_FILE"
disown "$!" 2>/dev/null || true

echo "Arka planda başladı (pid $(<"$PID_FILE"))."
echo "Durum: $0 status"
echo "Log:   $0 tail"
