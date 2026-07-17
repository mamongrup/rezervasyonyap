#!/usr/bin/env bash
# Tüm travel timer'larını etkinleştir + AI/social worker'ı hemen tetikle (stres testi).
#
# UYARI: Disk I/O zayıfken yükü yeniden yükseltebilir — bilinçli stres için.
#
#   cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
#   git fetch origin main && git reset --hard origin/main
#   ./deploy/scripts/enable-all-travel-timers-stress.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

log() { echo "[stress-enable] $*"; }

# Unit dosyalarını repodan kopyala (güncel olsun)
log "systemd unit'leri kopyalanıyor"
for pair in \
  travel-ai-worker \
  travel-social-worker \
  travel-warm-cache \
  travel-vitrin-price-refresh \
  travel-purge-old-logs \
  travel-purge-past-calendars \
  travel-vacuum-heavy \
  travel-import-scheduler \
  travel-wtatil-sync \
  travel-travelrobot-sync \
  travel-yolcu360-sync \
  travel-priceless-hotels-report \
  travel-db-guard
do
  if [[ -f "deploy/systemd/${pair}.service" ]]; then
    cp -f "deploy/systemd/${pair}.service" "/etc/systemd/system/${pair}.service"
  fi
  if [[ -f "deploy/systemd/${pair}.timer" ]]; then
    cp -f "deploy/systemd/${pair}.timer" "/etc/systemd/system/${pair}.timer"
  fi
done

# Deprecated çift Wtatil timer — bilerek KAPALI bırak (aynı scripti 2 kez tetikler)
if systemctl list-unit-files travel-wtatil-price-sync.timer &>/dev/null; then
  systemctl disable --now travel-wtatil-price-sync.timer 2>/dev/null || true
  log "travel-wtatil-price-sync.timer disabled (legacy duplicate)"
fi

systemctl daemon-reload

TIMERS=(
  travel-ai-worker.timer
  travel-social-worker.timer
  travel-warm-cache.timer
  travel-vitrin-price-refresh.timer
  travel-purge-old-logs.timer
  travel-purge-past-calendars.timer
  travel-vacuum-heavy.timer
  travel-import-scheduler.timer
  travel-wtatil-sync.timer
  travel-travelrobot-sync.timer
  travel-yolcu360-sync.timer
  travel-priceless-hotels-report.timer
  travel-db-guard.timer
)

log "timer'lar enable --now"
for t in "${TIMERS[@]}"; do
  if [[ -f "/etc/systemd/system/$t" ]] || systemctl cat "$t" &>/dev/null; then
    systemctl enable --now "$t" && log "  OK $t" || log "  FAIL $t"
  else
    log "  SKIP (yok) $t"
  fi
done

chmod +x \
  deploy/scripts/ai-worker-run-steps.sh \
  deploy/scripts/social-process-pending.sh \
  deploy/scripts/warm-cache.sh \
  deploy/scripts/refresh-vitrin-prices.sh \
  2>/dev/null || true

log "AI worker hemen tetikleniyor (3 loop)…"
WORKER_LOOPS=3 WORKER_VERBOSE=1 ./deploy/scripts/ai-worker-run-steps.sh 3 || log "AI worker tetik uyarısı (secret yoksa SKIP normal)"

log "Social worker hemen tetikleniyor…"
systemctl start travel-social-worker.service || log "social-worker start uyarısı"

log "Warm-cache hemen tetikleniyor…"
systemctl start travel-warm-cache.service || log "warm-cache start uyarısı"

echo
log "aktif travel-* timer'lar:"
systemctl list-timers 'travel-*' --all --no-pager

echo
log "anlık yük:"
uptime
echo
log "Bitti. İzleme: watch -n5 uptime   veya   ./deploy/scripts/health-check-now.sh"
log "AI log: journalctl -u travel-ai-worker.service -n 50 --no-pager"
log "Patlama olursa: systemctl stop travel-wtatil-sync.timer travel-import-scheduler.timer travel-ai-worker.timer"
