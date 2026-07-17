#!/usr/bin/env bash
# Günlük: AI / outbox / bildirim log temizliği + şişmiş app/import log dosyaları.
#
# Elle:
#   cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
#   ./deploy/scripts/purge-old-logs.sh
#
# Otomatik: deploy/systemd/travel-purge-old-logs.timer
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKUPS="$APP_ROOT/backups"

echo "[purge-old-logs] $(date -u +%Y-%m-%dT%H:%M:%SZ) start"

"$APP_ROOT/deploy/apply-sql.sh" backend/priv/sql/maintenance/purge_old_logs.sql

rotate_if_huge() {
  local f="$1"
  local max="${2:-$((100 * 1024 * 1024))}"
  local keep="${3:-$((20 * 1024 * 1024))}"
  if [[ -f "$f" ]]; then
    local sz
    sz=$(stat -c%s "$f" 2>/dev/null || echo 0)
    if [[ "$sz" -gt "$max" ]]; then
      echo "[purge-old-logs] truncate $f size=$sz -> keep ${keep}B"
      tail -c "$keep" "$f" > "${f}.tmp" && mv "${f}.tmp" "$f" || true
    fi
  fi
}

rotate_if_huge /var/log/travel-api.log
rotate_if_huge /var/log/travel-web.log

# Import / audit logları (backups/)
if [[ -d "$BACKUPS" ]]; then
  for f in \
    "$BACKUPS/travelrobot-hotel-import.log" \
    "$BACKUPS/tatilsepeti-hotel-import.log" \
    "$BACKUPS/tatilbudur-hotel-import.log"
  do
    rotate_if_huge "$f" $((20 * 1024 * 1024)) $((5 * 1024 * 1024))
  done

  # Eski medya integrity raporları
  find "$BACKUPS" -maxdepth 1 -type f -name 'listing-media-integrity-*.json' -mtime +3 -delete 2>/dev/null || true

  # Import çalışmıyorsa ve state "done" ise büyük katalog JSON'unu kaldır
  if ! pgrep -f 'import-travelrobot|import-tatilsepeti|travelrobot-hotel' >/dev/null 2>&1; then
    for state_catalog in \
      "travelrobot-hotel-import-state.json:travelrobot-hotel-catalog.json" \
      "tatilsepeti-hotel-import-state.json:tatilsepeti-hotel-catalog.json"
    do
      state="${state_catalog%%:*}"
      catalog="${state_catalog##*:}"
      sp="$BACKUPS/$state"
      cp="$BACKUPS/$catalog"
      if [[ -f "$sp" && -f "$cp" ]]; then
        done_flag="$(node -e "
          try {
            const s=require('$sp');
            const c=require('$cp');
            const n=Array.isArray(c.hotels)?c.hotels.length:(Array.isArray(c)?c.length:0);
            const i=Number(s.nextIndex||0);
            console.log(n>0 && i>=n ? 'done' : 'busy');
          } catch (e) { console.log('busy'); }
        " 2>/dev/null || echo busy)"
        if [[ "$done_flag" == "done" ]]; then
          echo "[purge-old-logs] remove finished catalog $catalog"
          rm -f "$cp"
        fi
      fi
    done
  fi

  # Yanlışlıkla oluşmuş uploads kopyası
  if [[ -d "$BACKUPS/uploads" ]]; then
    echo "[purge-old-logs] remove backups/uploads duplicate"
    rm -rf "$BACKUPS/uploads"
  fi
fi

# Domain home eski plesk httpdocs kopyaları (canlı httpdocs değil)
find /var/www/vhosts/rezervasyonyap.tr -maxdepth 1 -type d -name 'httpdocs.plesk-backup-*' -mtime +3 -exec rm -rf {} + 2>/dev/null || true

# Domain log rotasyonu
find /var/www/vhosts/rezervasyonyap.tr/logs -type f \( -name '*.log' -mtime +14 -o -name '*.gz' -mtime +7 \) -delete 2>/dev/null || true

# journald birikimi — 7 gün
if command -v journalctl >/dev/null 2>&1; then
  journalctl --vacuum-time=7d >/dev/null 2>&1 || true
fi

echo "[purge-old-logs] $(date -u +%Y-%m-%dT%H:%M:%SZ) done"
