#!/usr/bin/env bash
# Tatilsepeti otel import — tüm batch'ler bitene kadar arka planda döngü (nohup).
#
#   chmod +x deploy/scripts/run-tatilsepeti-hotels-background.sh
#   ./deploy/scripts/run-tatilsepeti-hotels-background.sh
#   ./deploy/scripts/run-tatilsepeti-hotels-background.sh --refresh-catalog
#
# Log: /var/log/tatilsepeti-hotel-import.log (veya TATILSEPETI_IMPORT_LOG)
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOG_FILE="${TATILSEPETI_IMPORT_LOG:-/var/log/tatilsepeti-hotel-import.log}"
PID_FILE="${TATILSEPETI_IMPORT_PID:-$APP_ROOT/backups/tatilsepeti-hotel-import.pid}"

cd "$APP_ROOT"
mkdir -p "$(dirname "$LOG_FILE")" "$(dirname "$PID_FILE")"
chmod +x "$APP_ROOT/deploy/scripts/import-tatilsepeti-hotels.sh" \
  "$APP_ROOT/deploy/scripts/run-tatilsepeti-hotels-background.sh" 2>/dev/null || true

if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "[FAIL] Import zaten çalışıyor (PID $(cat "$PID_FILE"))" >&2
  exit 1
fi

nohup bash -c "
  set -euo pipefail
  cd \"$APP_ROOT\"
  EXTRA_ARGS=($*)
  FAILURE_COUNT=0
  while true; do
    echo \"=== batch start \$(date -Iseconds) ===\" >> \"$LOG_FILE\"
    if ! ./deploy/scripts/import-tatilsepeti-hotels.sh \"\${EXTRA_ARGS[@]}\" >> \"$LOG_FILE\" 2>&1; then
      FAILURE_COUNT=\$((FAILURE_COUNT + 1))
      BASE_COOLDOWN=\"\${TATILSEPETI_FAILURE_COOLDOWN_SECONDS:-900}\"
      MAX_COOLDOWN=\"\${TATILSEPETI_MAX_FAILURE_COOLDOWN_SECONDS:-21600}\"
      SHIFT=\$((FAILURE_COUNT - 1))
      if [[ \"\$SHIFT\" -gt 4 ]]; then SHIFT=4; fi
      COOLDOWN=\$((BASE_COOLDOWN * (1 << SHIFT)))
      if [[ \"\$COOLDOWN\" -gt \"\$MAX_COOLDOWN\" ]]; then COOLDOWN=\"\$MAX_COOLDOWN\"; fi
      echo \"=== sağlayıcı/ağ hatası #\${FAILURE_COUNT}; \${COOLDOWN} sn beklenecek \$(date -Iseconds) ===\" >> \"$LOG_FILE\"
      sleep \"\$COOLDOWN\"
      continue
    fi
    FAILURE_COUNT=0
    DONE=\$(node -e \"
      const fs=require('fs');
      const s=JSON.parse(fs.readFileSync('$APP_ROOT/backups/tatilsepeti-hotel-import-state.json','utf8'));
      const c=JSON.parse(fs.readFileSync('$APP_ROOT/backups/tatilsepeti-hotel-catalog.json','utf8'));
      process.exit(s.nextIndex>=c.hotels.length?0:1);
    \" 2>/dev/null; echo \$?)
    if [[ \"\$DONE\" == \"0\" ]]; then
      echo \"=== tamamlandı \$(date -Iseconds) ===\" >> \"$LOG_FILE\"
      break
    fi
    sleep 15
  done
  rm -f \"$PID_FILE\"
" "$@" >> "$LOG_FILE" 2>&1 &

echo $! > "$PID_FILE"
echo "[OK] Arka plan import başlatıldı PID=$(cat "$PID_FILE")"
echo "     tail -f $LOG_FILE"
