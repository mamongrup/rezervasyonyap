#!/usr/bin/env bash
# Tum ilan medya kalite denetimini SSH kopmasindan etkilenmeden, dusuk oncelikle calistirir.
#
#   ./deploy/scripts/run-listing-media-integrity-audit-background.sh --hash-files --repair-safe
#   tail -f /var/log/listing-media-integrity-audit.log
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOG_FILE="${LISTING_MEDIA_AUDIT_LOG:-/var/log/listing-media-integrity-audit.log}"
PID_FILE="${LISTING_MEDIA_AUDIT_PID:-$APP_ROOT/backups/listing-media-integrity-audit.pid}"

cd "$APP_ROOT"
mkdir -p "$(dirname "$LOG_FILE")" "$(dirname "$PID_FILE")"

if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "[FAIL] Denetim zaten calisiyor (PID $(cat "$PID_FILE"))" >&2
  exit 1
fi

RUNNER=(node scripts/audit-listing-media-integrity.mjs "$@")
if command -v ionice >/dev/null 2>&1; then
  RUNNER=(ionice -c3 nice -n 15 "${RUNNER[@]}")
elif command -v nice >/dev/null 2>&1; then
  RUNNER=(nice -n 15 "${RUNNER[@]}")
fi

nohup "${RUNNER[@]}" > "$LOG_FILE" 2>&1 < /dev/null &
echo $! > "$PID_FILE"
echo "[OK] Medya denetimi baslatildi PID=$(cat "$PID_FILE")"
echo "     tail -f $LOG_FILE"

