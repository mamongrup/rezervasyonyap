#!/usr/bin/env bash
set -uo pipefail

REPO_ROOT="${REPO_ROOT:-/var/www/vhosts/rezervasyonyap.tr/httpdocs}"
LOG_DIR="$REPO_ROOT/var/log"
STATE_DIR="$REPO_ROOT/var/image-sort-state"
LOG_FILE="$LOG_DIR/image-sort-gemini.log"
LOCK_FILE="$STATE_DIR/worker.lock"

mkdir -p "$LOG_DIR" "$STATE_DIR"
exec 9>"$LOCK_FILE"
flock -n 9 || exit 0
cd "$REPO_ROOT"

echo "[$(date -Is)] güvenli görsel sıralama worker başladı" >> "$LOG_FILE"

while true; do
  load_one="$(cut -d' ' -f1 /proc/loadavg)"
  if awk -v load="$load_one" 'BEGIN { exit !(load > 3.00) }'; then
    echo "[$(date -Is)] yük yüksek ($load_one); 120 saniye bekleniyor" >> "$LOG_FILE"
    sleep 120
    continue
  fi

  worked=0
  for category in hotel holiday_home; do
    done_file="$STATE_DIR/$category.done"
    [[ -f "$done_file" ]] && continue

    batch_log="$(mktemp "$STATE_DIR/$category.XXXXXX.log")"
    nice -n 15 ionice -c 3 timeout 1800 \
      node scripts/auto-classify-listing-images-ai.mjs \
        --category "$category" --provider gemini --local-only --limit 1 \
      > "$batch_log" 2>&1
    status=$?
    cat "$batch_log" >> "$LOG_FILE"

    if grep -q "0 adet ilan" "$batch_log"; then
      touch "$done_file"
      echo "[$(date -Is)] $category tamamlandı" >> "$LOG_FILE"
    elif [[ $status -eq 0 ]]; then
      worked=1
    else
      echo "[$(date -Is)] $category batch hata kodu: $status; worker güvenlik için durdu" >> "$LOG_FILE"
      rm -f "$batch_log"
      exit "$status"
    fi
    rm -f "$batch_log"
    sleep 60
  done

  if [[ -f "$STATE_DIR/hotel.done" && -f "$STATE_DIR/holiday_home.done" ]]; then
    echo "[$(date -Is)] tüm konaklama galerileri tamamlandı" >> "$LOG_FILE"
    exit 0
  fi

  [[ $worked -eq 0 ]] && sleep 300
done
