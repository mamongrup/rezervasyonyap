#!/usr/bin/env bash
# Deploy sonrası AI + sosyal medya worker timer'larını kurar, secret kontrol eder
# ve hemen bir tur tetikler (10 dk beklemeye gerek kalmaz).
#
#   ./deploy/scripts/ensure-ai-social-workers.sh
#   SKIP_KICK=1 ./deploy/scripts/ensure-ai-social-workers.sh   # yalnız timer kur
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_ENV="${TRAVEL_DB_ENV:-/etc/rezervasyonyap/backend.env}"
FRONTEND_ENV="${FRONTEND_ENV_FILE:-/etc/rezervasyonyap/frontend.env}"
SKIP_KICK="${SKIP_KICK:-0}"

log() { echo "[ai-social] $*"; }
warn() { echo "[ai-social][WARN] $*" >&2; }
ok() { echo "[ai-social][OK] $*"; }

cd "$APP_ROOT"

chmod +x \
  "$APP_ROOT/deploy/scripts/ai-worker-run-steps.sh" \
  "$APP_ROOT/deploy/scripts/social-process-pending.sh" \
  "$APP_ROOT/deploy/scripts/seed-ai-content-queues.sh" \
  2>/dev/null || true

if [[ -f "$APP_ROOT/deploy/systemd/travel-ai-worker.service" && -f "$APP_ROOT/deploy/systemd/travel-ai-worker.timer" ]]; then
  cp -f "$APP_ROOT/deploy/systemd/travel-ai-worker.service" /etc/systemd/system/
  cp -f "$APP_ROOT/deploy/systemd/travel-ai-worker.timer" /etc/systemd/system/
  ok "travel-ai-worker unit kopyalandı"
else
  warn "travel-ai-worker systemd dosyaları yok"
fi

if [[ -f "$APP_ROOT/deploy/systemd/travel-social-worker.service" && -f "$APP_ROOT/deploy/systemd/travel-social-worker.timer" ]]; then
  cp -f "$APP_ROOT/deploy/systemd/travel-social-worker.service" /etc/systemd/system/
  cp -f "$APP_ROOT/deploy/systemd/travel-social-worker.timer" /etc/systemd/system/
  ok "travel-social-worker unit kopyalandı"
else
  warn "travel-social-worker systemd dosyaları yok"
fi

systemctl daemon-reload

if [[ -f /etc/systemd/system/travel-ai-worker.timer ]]; then
  systemctl enable --now travel-ai-worker.timer
  ok "travel-ai-worker.timer etkin"
fi
if [[ -f /etc/systemd/system/travel-social-worker.timer ]]; then
  systemctl enable --now travel-social-worker.timer
  ok "travel-social-worker.timer etkin"
fi

# Secret kontrol (SKIP sessizce kuyruğu öldürür)
ai_secret=""
social_secret_be=""
social_secret_fe=""
if [[ -f "$BACKEND_ENV" ]]; then
  # shellcheck disable=SC1090
  set -a; source "$BACKEND_ENV"; set +a
  ai_secret="${TRAVEL_AI_WORKER_SECRET:-}"
  social_secret_be="${TRAVEL_SOCIAL_WORKER_SECRET:-}"
fi
if [[ -f "$FRONTEND_ENV" ]]; then
  # shellcheck disable=SC1090
  set -a; source "$FRONTEND_ENV"; set +a
  social_secret_fe="${TRAVEL_SOCIAL_WORKER_SECRET:-}"
fi

if [[ -z "${ai_secret// /}" ]]; then
  warn "TRAVEL_AI_WORKER_SECRET yok ($BACKEND_ENV) — AI worker [SKIP] eder"
  warn "  Ekleyin: TRAVEL_AI_WORKER_SECRET=<uzun-rastgele>  sonra: systemctl restart travel-api"
else
  ok "TRAVEL_AI_WORKER_SECRET tanımlı"
fi

if [[ -z "${social_secret_fe// /}" ]]; then
  warn "TRAVEL_SOCIAL_WORKER_SECRET yok ($FRONTEND_ENV) — sosyal worker [SKIP] eder"
  warn "  Ekleyin (frontend.env + backend.env AYNI değer) sonra: systemctl restart travel-web travel-api"
else
  ok "TRAVEL_SOCIAL_WORKER_SECRET (frontend) tanımlı"
fi

if [[ -n "${social_secret_fe// /}" && -n "${social_secret_be// /}" && "$social_secret_fe" != "$social_secret_be" ]]; then
  warn "TRAVEL_SOCIAL_WORKER_SECRET frontend.env ≠ backend.env — sosyal API 401 verebilir"
elif [[ -n "${social_secret_fe// /}" && -z "${social_secret_be// /}" ]]; then
  warn "TRAVEL_SOCIAL_WORKER_SECRET backend.env'de yok — Gleam sosyal uçları reddedebilir"
fi

if [[ "$SKIP_KICK" == "1" ]]; then
  log "SKIP_KICK=1 — anlık tetik atlandı"
  exit 0
fi

# API/web ayağa kalkmış olsun
sleep "${WORKER_READY_SLEEP:-4}"

log "AI worker anlık tetik (WORKER_LOOPS=${WORKER_LOOPS:-3})"
if WORKER_LOOPS="${WORKER_LOOPS:-3}" WORKER_VERBOSE="${WORKER_VERBOSE:-0}" \
  bash "$APP_ROOT/deploy/scripts/ai-worker-run-steps.sh"; then
  ok "AI worker tetiklendi"
else
  warn "AI worker tetik uyarısı — journalctl -u travel-ai-worker.service -n 40"
fi

log "Sosyal worker anlık tetik"
if systemctl start --no-block travel-social-worker.service; then
  ok "travel-social-worker.service kuyruğa alındı (deploy beklemez)"
else
  # systemd yoksa veya unit henüz yoksa doğrudan script
  LOOP_UNTIL_EMPTY=0 SOCIAL_WORKER_ROTATE="${SOCIAL_WORKER_ROTATE:-1}" \
    timeout "${SOCIAL_WORKER_FALLBACK_TIMEOUT:-180}" \
      bash "$APP_ROOT/deploy/scripts/social-process-pending.sh" \
    || warn "sosyal worker tetik uyarısı — journalctl -u travel-social-worker.service -n 40"
fi

log "timer durumu:"
systemctl list-timers 'travel-ai-worker.timer' 'travel-social-worker.timer' --no-pager 2>/dev/null || true
log "Son AI log: journalctl -u travel-ai-worker.service -n 20 --no-pager"
log "Son sosyal log: journalctl -u travel-social-worker.service -n 20 --no-pager"
log "Panel: Yönetim → Yapay zeka (DeepSeek/OpenAI) + Pazarlama → Sosyal Medya API"
