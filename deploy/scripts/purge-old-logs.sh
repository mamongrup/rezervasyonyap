#!/usr/bin/env bash
# Günlük: AI / outbox / bildirim log temizliği + şişmiş app log dosyaları.
#
# Elle:
#   cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
#   ./deploy/scripts/purge-old-logs.sh
#
# Otomatik: deploy/systemd/travel-purge-old-logs.timer
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "[purge-old-logs] $(date -u +%Y-%m-%dT%H:%M:%SZ) start"

"$APP_ROOT/deploy/apply-sql.sh" backend/priv/sql/maintenance/purge_old_logs.sql

# Uygulama log dosyaları > 100MB ise son 20MB bırak (disk I/O / disk doluluk)
rotate_if_huge() {
  local f="$1"
  local max=$((100 * 1024 * 1024))
  local keep=$((20 * 1024 * 1024))
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

# journald birikimi (varsa) — 7 gün
if command -v journalctl >/dev/null 2>&1; then
  journalctl --vacuum-time=7d >/dev/null 2>&1 || true
fi

echo "[purge-old-logs] $(date -u +%Y-%m-%dT%H:%M:%SZ) done"
