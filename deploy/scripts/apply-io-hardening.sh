#!/usr/bin/env bash
# I/O / bakım önerilerini sunucuya uygular (systemd timer + temizlik + Plesk yedek notu).
#
#   cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
#   git fetch origin main && git reset --hard origin/main
#   ./deploy/scripts/apply-io-hardening.sh
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$APP_ROOT"

log() { echo "[io-hardening] $*"; }

chmod +x \
  deploy/scripts/purge-old-logs.sh \
  deploy/scripts/purge-past-prices-calendars.sh \
  deploy/scripts/vacuum-heavy-tables.sh \
  deploy/scripts/warm-cache.sh \
  deploy/scripts/refresh-vitrin-prices.sh \
  deploy/scripts/apply-io-hardening.sh \
  2>/dev/null || true

log "systemd unit'leri kopyalanıyor"
cp -f deploy/systemd/travel-warm-cache.{service,timer} /etc/systemd/system/
cp -f deploy/systemd/travel-vitrin-price-refresh.{service,timer} /etc/systemd/system/
cp -f deploy/systemd/travel-purge-old-logs.{service,timer} /etc/systemd/system/
cp -f deploy/systemd/travel-purge-past-calendars.{service,timer} /etc/systemd/system/
cp -f deploy/systemd/travel-vacuum-heavy.{service,timer} /etc/systemd/system/
if [[ -f deploy/systemd/travel-ai-worker.timer ]]; then
  cp -f deploy/systemd/travel-ai-worker.{service,timer} /etc/systemd/system/
fi

systemctl daemon-reload

log "timer'lar etkinleştiriliyor"
systemctl enable --now travel-warm-cache.timer
systemctl enable --now travel-vitrin-price-refresh.timer
systemctl enable --now travel-purge-old-logs.timer
systemctl enable --now travel-purge-past-calendars.timer
systemctl enable --now travel-vacuum-heavy.timer
if [[ -f /etc/systemd/system/travel-ai-worker.timer ]]; then
  systemctl enable --now travel-ai-worker.timer
  systemctl restart travel-ai-worker.timer || true
fi
systemctl restart travel-warm-cache.timer || true

log "anlık log/yedek temizlik"
./deploy/scripts/purge-old-logs.sh || log "WARN purge-old-logs hata (devam)"

log "aktif timer'lar"
systemctl list-timers 'travel-*' --all --no-pager | head -40 || true

# Plesk scheduled backup — mümkünse CLI ile hafiflet
log "Plesk yedek ayarı deneniyor"
if command -v plesk >/dev/null 2>&1; then
  # Obsidian'da tam CLI değişkenlik gösterir; başarısız olursa manuel adım basılır.
  if plesk bin extension --list 2>/dev/null | grep -qi backup; then
    log "Plesk backup uzantısı var — zamanlamayı panelden doğrulayın"
  fi
  cat <<'EOF'

[MANUEL — Plesk Backup Manager]
  Tools & Settings → Backup Manager → Schedule
  - Full backup: Weekly (örn. Pazar 01:00)
  - Daily: Incremental
  - Retention / store: 7 days (veya max 3–4 full)
  - Exclude: mümkünse büyük uploads cache (opsiyonel)

EOF
else
  log "plesk CLI yok — Backup Manager'ı panelden güncelleyin"
fi

log "tamam — warm-cache=45dk, vitrin=günde2, purge günlük/aylık, vacuum=Pazar"
log "İsteğe bağlı şimdi VACUUM (uzun sürebilir): ./deploy/scripts/vacuum-heavy-tables.sh"
