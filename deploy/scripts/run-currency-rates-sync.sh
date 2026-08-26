#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/vhosts/rezervasyonyap.tr/httpdocs}"
SYNC_SCRIPT="$APP_ROOT/scripts/sync-tcmb-currency-rates.mjs"

[[ -f "$SYNC_SCRIPT" ]] || { echo "[tcmb-sync] Script bulunamadı: $SYNC_SCRIPT" >&2; exit 1; }

if command -v node >/dev/null 2>&1; then
  exec "$(command -v node)" "$SYNC_SCRIPT"
fi

for candidate in \
  /opt/plesk/node/25/bin/node \
  /opt/plesk/node/24/bin/node \
  /opt/plesk/node/22/bin/node \
  /usr/local/bin/node \
  /usr/bin/node
do
  if [[ -x "$candidate" ]]; then
    exec "$candidate" "$SYNC_SCRIPT"
  fi
done

echo "[tcmb-sync] Node.js bulunamadı." >&2
exit 127
