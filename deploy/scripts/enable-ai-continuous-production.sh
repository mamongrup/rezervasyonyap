#!/usr/bin/env bash
# Sürekli AI üretim modu — güvenli içerik işçilerini açar, autopilot + timer’ı hızlandırır.
#
# Para / fiyat / iade / sözleşme / dış yayın otomatikleri KAPALI kalır.
#
# Kullanım (sunucu, repo kökü):
#   chmod +x deploy/scripts/enable-ai-continuous-production.sh
#   ./deploy/scripts/enable-ai-continuous-production.sh
#
# Ortam:
#   SKIP_SQL=1     — yalnız timer/tetik (SQL zaten uygulandıysa)
#   SKIP_KICK=1    — anlık worker tetikleme yok
#   WORKER_LOOPS   — varsayılan 15 (API tavanı)
#   AI_CONTENT_SEED_LIMIT — varsayılan 80
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$APP_ROOT"

log() { echo "[ai-continuous] $*"; }
ok() { echo "[ai-continuous][OK] $*"; }
warn() { echo "[ai-continuous][WARN] $*" >&2; }

SKIP_SQL="${SKIP_SQL:-0}"
SKIP_KICK="${SKIP_KICK:-0}"
WORKER_LOOPS="${WORKER_LOOPS:-15}"
AI_CONTENT_SEED_LIMIT="${AI_CONTENT_SEED_LIMIT:-80}"
SQL_MODULE="$APP_ROOT/backend/priv/sql/modules/407_ai_continuous_seo_listing_seed.sql"
SQL_MODULE_LEGACY="$APP_ROOT/backend/priv/sql/modules/376_ai_continuous_production.sql"

chmod +x \
  "$APP_ROOT/deploy/scripts/ai-worker-run-steps.sh" \
  "$APP_ROOT/deploy/scripts/seed-ai-content-queues.sh" \
  "$APP_ROOT/deploy/scripts/ensure-ai-social-workers.sh" \
  "$APP_ROOT/deploy/apply-sql.sh" \
  2>/dev/null || true

if [[ "$SKIP_SQL" != "1" ]]; then
  if [[ -f "$SQL_MODULE" ]]; then
    log "SQL: 407_ai_continuous_seo_listing_seed.sql"
    if [[ -x "$APP_ROOT/deploy/apply-sql.sh" ]]; then
      "$APP_ROOT/deploy/apply-sql.sh" "$SQL_MODULE"
    else
      # shellcheck source=deploy/scripts/lib/psql-env.sh
      source "$APP_ROOT/deploy/scripts/lib/psql-env.sh"
      psql_travel -v ON_ERROR_STOP=1 -f "$SQL_MODULE"
    fi
    ok "sürekli SEO/i18n seed + autopilot güncellendi"
  elif [[ -f "$SQL_MODULE_LEGACY" ]]; then
    log "SQL: 376_ai_continuous_production.sql (legacy)"
    if [[ -x "$APP_ROOT/deploy/apply-sql.sh" ]]; then
      "$APP_ROOT/deploy/apply-sql.sh" "$SQL_MODULE_LEGACY"
    else
      source "$APP_ROOT/deploy/scripts/lib/psql-env.sh"
      psql_travel -v ON_ERROR_STOP=1 -f "$SQL_MODULE_LEGACY"
    fi
    ok "kadrosu + autopilot güncellendi"
  else
    echo "[FAIL] SQL yok: $SQL_MODULE" >&2
    exit 1
  fi
else
  warn "SKIP_SQL=1 — DB aktivasyonu atlandı"
fi

# Daha sık üretim: 3 dk timer, yüksek loop/seed
if [[ -f "$APP_ROOT/deploy/systemd/travel-ai-worker.service" && -f "$APP_ROOT/deploy/systemd/travel-ai-worker.timer" ]]; then
  cp -f "$APP_ROOT/deploy/systemd/travel-ai-worker.service" /etc/systemd/system/
  cp -f "$APP_ROOT/deploy/systemd/travel-ai-worker.timer" /etc/systemd/system/
  systemctl daemon-reload
  systemctl enable --now travel-ai-worker.timer
  ok "travel-ai-worker.timer etkin (3 dk)"
else
  warn "systemd unit dosyaları bulunamadı"
fi

if [[ -f "$APP_ROOT/deploy/systemd/travel-social-worker.timer" ]]; then
  cp -f "$APP_ROOT/deploy/systemd/travel-social-worker.service" /etc/systemd/system/ 2>/dev/null || true
  cp -f "$APP_ROOT/deploy/systemd/travel-social-worker.timer" /etc/systemd/system/
  systemctl daemon-reload
  systemctl enable --now travel-social-worker.timer || warn "sosyal timer açılamadı"
fi

BACKEND_ENV="${TRAVEL_DB_ENV:-/etc/rezervasyonyap/backend.env}"
if [[ -f "$BACKEND_ENV" ]]; then
  # shellcheck disable=SC1090
  set -a; source "$BACKEND_ENV"; set +a
fi
if [[ -z "${TRAVEL_AI_WORKER_SECRET:-}" ]]; then
  warn "TRAVEL_AI_WORKER_SECRET yok ($BACKEND_ENV) — worker [SKIP] eder"
  warn "  Ekleyin, sonra: systemctl restart travel-api.service"
else
  ok "TRAVEL_AI_WORKER_SECRET tanımlı"
fi

if [[ "$SKIP_KICK" == "1" ]]; then
  log "SKIP_KICK=1 — anlık tetik atlandı"
  exit 0
fi

sleep "${WORKER_READY_SLEEP:-3}"
log "İlk üretim turu (WORKER_LOOPS=$WORKER_LOOPS, SEED=$AI_CONTENT_SEED_LIMIT)"
export WORKER_LOOPS AI_CONTENT_SEED_LIMIT AI_CONTENT_AUTO_SEED=1
if bash "$APP_ROOT/deploy/scripts/ai-worker-run-steps.sh"; then
  ok "worker tetiklendi — sürekli üretim timer ile devam eder"
else
  warn "anlık tetik başarısız; timer yine de kuruluysa arka planda deneyecek"
  exit 1
fi

log "Durum:"
systemctl list-timers --all 'travel-ai-worker.timer' 'travel-social-worker.timer' --no-pager 2>/dev/null || true
ok "bitti — panel: /manage/ai/control-center"
