#!/usr/bin/env bash
# Sosyal paylaşım worker: POST /api/social/worker-process
#   1) villa/yat/aktivite döngü kuyruğu (enqueue-rotate)
#   2) bekleyen Facebook / Instagram / Pinterest paylaşımları
#
# Gerekli:
#   TRAVEL_SOCIAL_WORKER_SECRET — /etc/rezervasyonyap/frontend.env VE backend.env (aynı değer)
#   Meta/Pinterest API — Yönetim → Pazarlama → Sosyal Medya API
#
# Zamanlayıcı (önerilen): deploy/systemd/travel-social-worker.timer (10 dk)
#
# Kullanım:
#   chmod +x deploy/scripts/social-process-pending.sh
#   ./deploy/scripts/social-process-pending.sh
#   ./deploy/scripts/social-process-pending.sh
#   WEB_ORIGIN=http://127.0.0.1:3000 ./deploy/scripts/social-process-pending.sh
#   SOCIAL_WORKER_REQUEST_LIMIT=5 LOOP_UNTIL_EMPTY=0 ./deploy/scripts/social-process-pending.sh
set -euo pipefail

FRONTEND_ENV_FILE="${FRONTEND_ENV_FILE:-/etc/rezervasyonyap/frontend.env}"
WEB_ORIGIN="${WEB_ORIGIN:-http://127.0.0.1:3000}"
WORKER_PATH="${WORKER_PATH:-/api/social/worker-process}"
REQUEST_LIMIT="${SOCIAL_WORKER_REQUEST_LIMIT:-5}"
LOOP_UNTIL_EMPTY="${LOOP_UNTIL_EMPTY:-1}"

if [[ -f "$FRONTEND_ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$FRONTEND_ENV_FILE"
  set +a
fi

SECRET="${TRAVEL_SOCIAL_WORKER_SECRET:-}"
if [[ -z "${SECRET// /}" ]]; then
  echo "[SKIP] TRAVEL_SOCIAL_WORKER_SECRET tanimli degil — tetik atlandi ($FRONTEND_ENV_FILE)" >&2
  exit 0
fi

TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

batch=1
while true; do
  ROTATE_PARAM=""
  if [[ "$batch" -gt 1 ]]; then
    ROTATE_PARAM="&rotate=0"
  fi

  URL="${WEB_ORIGIN%/}${WORKER_PATH}?limit=${REQUEST_LIMIT}${ROTATE_PARAM}"
  code="$(curl -sS -o "$TMP" -w "%{http_code}" \
    -X POST \
    -H "x-travel-social-worker-secret: ${SECRET}" \
    -H "Accept: application/json" \
    "$URL")"

  if [[ ! "$code" =~ ^2 ]]; then
    echo "[FAIL] social-process-pending batch ${batch} HTTP ${code}" >&2
    head -c 2000 "$TMP" >&2 || true
    echo >&2
    exit 1
  fi

  processed="$(node -e "const fs=require('fs'); const p=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); console.log(Number(p.processed||0))" "$TMP" 2>/dev/null || echo 0)"
  posted="$(node -e "const fs=require('fs'); const p=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); console.log(Number(p.posted||0))" "$TMP" 2>/dev/null || echo 0)"
  failed="$(node -e "const fs=require('fs'); const p=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); console.log(Number(p.failed||0))" "$TMP" 2>/dev/null || echo 0)"
  echo "[OK] social-process-pending batch ${batch} HTTP ${code} processed=${processed} posted=${posted} failed=${failed}"

  if [[ "${WORKER_VERBOSE:-0}" == "1" ]]; then
    cat "$TMP"
    echo
  fi

  if [[ "$LOOP_UNTIL_EMPTY" != "1" || "$processed" -lt "$REQUEST_LIMIT" ]]; then
    exit 0
  fi
  batch=$((batch + 1))
done
