#!/usr/bin/env bash
# SSH baglantisi kopsa bile deploy devam etsin (nohup + setsid).
#
# Kullanim (sunucuda, httpdocs kokunden):
#   chmod +x deploy/deploy-detached.sh deploy/deploy.sh deploy/verify.sh
#   DEPLOY_REF=main ./deploy/deploy-detached.sh
#
# Durum / log:
#   ./deploy/deploy-detached.sh status
#   ./deploy/deploy-detached.sh tail
#   ./deploy/deploy-detached.sh wait          # bitene kadar bekle (opsiyonel)
#
# Ortam:
#   TRAVEL_DEPLOY_LOG       — log dosyasi (varsayilan: APP_ROOT/.deploy/travel-deploy.log)
#   TRAVEL_DEPLOY_PID_FILE  — pid dosyasi (varsayilan: APP_ROOT/.deploy/travel-deploy.pid)
#   DEPLOY_REF, SKIP_* vb.  — deploy.sh ile ayni (ornek: DEPLOY_REF=main)
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_SH="$APP_ROOT/deploy/deploy.sh"
LOG="${TRAVEL_DEPLOY_LOG:-$APP_ROOT/.deploy/travel-deploy.log}"
PID_FILE="${TRAVEL_DEPLOY_PID_FILE:-$APP_ROOT/.deploy/travel-deploy.pid}"
DEPLOY_REF="${DEPLOY_REF:-main}"

mkdir -p "$(dirname "$LOG")" "$(dirname "$PID_FILE")"

is_running() {
  [[ -f "$PID_FILE" ]] || return 1
  local pid
  pid="$(cat "$PID_FILE" 2>/dev/null || true)"
  [[ -n "$pid" ]] || return 1
  kill -0 "$pid" 2>/dev/null
}

cmd="${1:-start}"

case "$cmd" in
  status)
    if is_running; then
      echo "Deploy calisiyor (pid $(cat "$PID_FILE"))."
      echo "Log: $LOG"
      exit 0
    fi
    if [[ -f "$PID_FILE" ]]; then
      echo "Deploy bitti veya pid dosyasi eski (pid $(cat "$PID_FILE"))."
    else
      echo "Aktif deploy yok."
    fi
    if [[ -f "$LOG" ]]; then
      echo "--- son 15 satir ---"
      tail -n 15 "$LOG"
    fi
    exit 0
    ;;
  tail)
    [[ -f "$LOG" ]] || { echo "Log yok: $LOG"; exit 1; }
    exec tail -f "$LOG"
    ;;
  wait)
    if ! is_running; then
      echo "Calisan deploy yok."
      exit 1
    fi
    pid="$(cat "$PID_FILE")"
    echo "Bekleniyor (pid $pid) — log: $LOG"
    while kill -0 "$pid" 2>/dev/null; do
      sleep 5
    done
    echo "Deploy sureci sonlandi. Son satirlar:"
    tail -n 30 "$LOG"
    exit 0
    ;;
  start)
    ;;
  *)
    echo "Kullanim: $0 [start|status|tail|wait]" >&2
    exit 2
    ;;
esac

if is_running; then
  echo "[deploy-detached] Zaten calisiyor (pid $(cat "$PID_FILE"))." >&2
  echo "  tail -f $LOG" >&2
  exit 1
fi

[[ -x "$DEPLOY_SH" ]] || chmod +x "$DEPLOY_SH" 2>/dev/null || true

{
  echo "========================================"
  echo "[deploy-detached] basladi: $(date -Is 2>/dev/null || date)"
  echo "[deploy-detached] ref=$DEPLOY_REF cwd=$APP_ROOT"
  echo "========================================"
} >>"$LOG"

# setsid: yeni oturum — SIGHUP (SSH kopunca) deploy'a ulasmaz
export APP_ROOT DEPLOY_SH DEPLOY_REF
run_inner='set -eo pipefail; cd "$APP_ROOT"; exec "$DEPLOY_SH"'
if command -v setsid >/dev/null 2>&1; then
  setsid bash -c "$run_inner" >>"$LOG" 2>&1 &
else
  nohup bash -c "$run_inner" >>"$LOG" 2>&1 &
fi

child_pid=$!
echo "$child_pid" >"$PID_FILE"
disown "$child_pid" 2>/dev/null || true

echo "[deploy-detached] Arka planda baslatildi (pid $child_pid)."
echo "  Log:  tail -f $LOG"
echo "  Durum: ./deploy/deploy-detached.sh status"
echo "  SSH kapatabilirsiniz — deploy sunucuda devam eder."
