#!/usr/bin/env bash
# Travelrobot (KPlus) otel import — tüm batch'ler bitene kadar arka planda döngü (nohup).
#
#   chmod +x deploy/scripts/run-travelrobot-hotels-background.sh
#   ./deploy/scripts/run-travelrobot-hotels-background.sh
#   ./deploy/scripts/run-travelrobot-hotels-background.sh --refresh-catalog
#
# Log: /var/log/travelrobot-hotel-import.log (veya TRAVELROBOT_IMPORT_LOG)
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOG_FILE="${TRAVELROBOT_IMPORT_LOG:-/var/log/travelrobot-hotel-import.log}"
PID_FILE="${TRAVELROBOT_IMPORT_PID:-$APP_ROOT/backups/travelrobot-hotel-import.pid}"

cd "$APP_ROOT"
mkdir -p "$(dirname "$LOG_FILE")" "$(dirname "$PID_FILE")"
chmod +x "$APP_ROOT/deploy/scripts/import-travelrobot-hotels-batch.sh" \
  "$APP_ROOT/deploy/scripts/run-travelrobot-hotels-background.sh" 2>/dev/null || true

if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "[FAIL] Import zaten çalışıyor (PID $(cat "$PID_FILE"))" >&2
  exit 1
fi

# --- Yük denetimi (site donmasını önlemek için) ---
# Batch başına otel sayısını küçük tut; her batch DB'ye yazma yükü bindirir.
# 2000 çok agresifti → varsayılan 500. Batch arası bekleme 15s → 60s (DB nefes alsın).
IMPORT_BATCH_SIZE="${IMPORT_BATCH_SIZE:-500}"
IMPORT_BATCH_SLEEP="${IMPORT_BATCH_SLEEP:-60}"

# Kullanıcı --batch-size vermediyse otomatik ekle.
USER_ARGS=("$@")
HAS_BATCH_SIZE=0
for a in "${USER_ARGS[@]}"; do
  [[ "$a" == "--batch-size" ]] && HAS_BATCH_SIZE=1
done
if [[ "$HAS_BATCH_SIZE" == "0" ]]; then
  USER_ARGS+=(--batch-size "$IMPORT_BATCH_SIZE")
fi

# CPU/disk önceliğini düşür: site istekleri her zaman öncelikli olsun.
NICE_PREFIX="nice -n ${IMPORT_NICE:-15}"
if command -v ionice >/dev/null 2>&1; then
  NICE_PREFIX="ionice -c3 $NICE_PREFIX"
fi

nohup bash -c "
  set -euo pipefail
  cd \"$APP_ROOT\"
  EXTRA_ARGS=(${USER_ARGS[*]@Q})
  while true; do
    echo \"=== batch start \$(date -Iseconds) ===\" >> \"$LOG_FILE\"
    $NICE_PREFIX ./deploy/scripts/import-travelrobot-hotels-batch.sh \"\${EXTRA_ARGS[@]}\" >> \"$LOG_FILE\" 2>&1 || true
    DONE=\$(node -e \"
      const fs=require('fs');
      const s=JSON.parse(fs.readFileSync('$APP_ROOT/backups/travelrobot-hotel-import-state.json','utf8'));
      const c=JSON.parse(fs.readFileSync('$APP_ROOT/backups/travelrobot-hotel-catalog.json','utf8'));
      process.exit(s.nextIndex>=c.hotels.length?0:1);
    \" 2>/dev/null; echo \$?)
    if [[ \"\$DONE\" == \"0\" ]]; then
      echo \"=== tamamlandı \$(date -Iseconds) ===\" >> \"$LOG_FILE\"
      break
    fi
    sleep $IMPORT_BATCH_SLEEP
  done
  rm -f \"$PID_FILE\"
" >> "$LOG_FILE" 2>&1 &

echo $! > "$PID_FILE"
echo "[OK] Arka plan import başlatıldı PID=$(cat "$PID_FILE")"
echo "     tail -f $LOG_FILE"
