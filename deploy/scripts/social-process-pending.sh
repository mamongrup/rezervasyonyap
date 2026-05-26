#!/usr/bin/env bash
# Sosyal paylaşım worker: POST /api/social/worker-process (Facebook / Instagram / Pinterest).
#
# Gerekli: /etc/rezervasyonyap/frontend.env içinde TRAVEL_SOCIAL_WORKER_SECRET (veya ortamda export).
#
# Kullanım:
#   chmod +x deploy/scripts/social-process-pending.sh
#   ./deploy/scripts/social-process-pending.sh
#   ./deploy/scripts/social-process-pending.sh 10
#   WEB_ORIGIN=http://127.0.0.1:3000 ./deploy/scripts/social-process-pending.sh
set -euo pipefail

FRONTEND_ENV_FILE="${FRONTEND_ENV_FILE:-/etc/rezervasyonyap/frontend.env}"
WEB_ORIGIN="${WEB_ORIGIN:-http://127.0.0.1:3000}"
WORKER_PATH="${WORKER_PATH:-/api/social/worker-process}"
LIMIT="${1:-${SOCIAL_WORKER_LIMIT:-5}}"

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

URL="${WEB_ORIGIN%/}${WORKER_PATH}?limit=${LIMIT}"
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

code="$(curl -sS -o "$TMP" -w "%{http_code}" \
  -X POST \
  -H "x-travel-social-worker-secret: ${SECRET}" \
  -H "Accept: application/json" \
  "$URL")"

if [[ "$code" =~ ^2 ]]; then
  echo "[OK] social-process-pending HTTP ${code}"
  if [[ "${WORKER_VERBOSE:-0}" == "1" ]]; then
    cat "$TMP"
    echo
  fi
  exit 0
fi

echo "[FAIL] social-process-pending HTTP ${code}" >&2
head -c 2000 "$TMP" >&2 || true
echo >&2
exit 1
