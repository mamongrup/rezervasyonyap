#!/usr/bin/env bash
# AI işçisi: POST /api/v1/ai/worker/run-steps (ilçe DeepSeek + bölge batch + yer blog batch).
#
# Gerekli: /etc/rezervasyonyap/backend.env içinde TRAVEL_AI_WORKER_SECRET (veya ortamda export).
#
# Kullanım:
#   chmod +x deploy/scripts/ai-worker-run-steps.sh
#   ./deploy/scripts/ai-worker-run-steps.sh           # WORKER_LOOPS veya varsayılan 1
#   ./deploy/scripts/ai-worker-run-steps.sh 5
#   API_ORIGIN=http://127.0.0.1:8080 WORKER_LOOPS=2 ./deploy/scripts/ai-worker-run-steps.sh
#
# Ek sorgu (ör. yalnız ilçe kuyruğu): WORKER_QUERY=district=1&region=0&place=0
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_ENV_FILE="${BACKEND_ENV_FILE:-/etc/rezervasyonyap/backend.env}"
API_ORIGIN="${API_ORIGIN:-http://127.0.0.1:8080}"
WORKER_PATH="${WORKER_PATH:-/api/v1/ai/worker/run-steps}"
LOOPS="${1:-${WORKER_LOOPS:-1}}"
EXTRA_QUERY="${WORKER_QUERY:-}"
LOCK_FILE="${WORKER_LOCK_FILE:-/tmp/travel-ai-worker-run-steps.lock}"
CURL_MAX_TIME="${WORKER_CURL_MAX_TIME:-1800}"

if command -v flock >/dev/null 2>&1; then
  exec 9>"$LOCK_FILE"
  if ! flock -n 9; then
    echo "[SKIP] ai-worker zaten calisiyor ($LOCK_FILE)" >&2
    exit 0
  fi
fi

if [[ -f "$BACKEND_ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$BACKEND_ENV_FILE"
  set +a
fi

SECRET="${TRAVEL_AI_WORKER_SECRET:-}"
if [[ -z "${SECRET// /}" ]]; then
  echo "[SKIP] TRAVEL_AI_WORKER_SECRET tanimli degil — tetik atlandi ($BACKEND_ENV_FILE)" >&2
  exit 0
fi

# Panel açık olmasa da eksik bölge/blog/mekan kuyruklarını küçük batch'lerle
# besle. Hata mevcut işleri durdurmaz; worker bekleyen kayıtları işlemeye devam eder.
if [[ "${AI_CONTENT_AUTO_SEED:-1}" != "0" ]]; then
  SEED_SCRIPT="$SCRIPT_DIR/seed-ai-content-queues.sh"
  if [[ -f "$SEED_SCRIPT" ]]; then
    /bin/bash "$SEED_SCRIPT" || echo "[WARN] AI içerik kuyruğu beslenemedi" >&2
  fi
fi

URL="${API_ORIGIN%/}${WORKER_PATH}?loops=${LOOPS}"
if [[ -n "$EXTRA_QUERY" ]]; then
  URL="${URL}&${EXTRA_QUERY}"
fi

TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

if [[ "${WORKER_VERBOSE:-0}" == "1" ]]; then
  code="$(curl -sS -o "$TMP" -w "%{http_code}" \
    --max-time "$CURL_MAX_TIME" \
    -X POST \
    -H "x-travel-ai-worker-secret: ${SECRET}" \
    -H "Accept: application/json" \
    "$URL")"
  cat "$TMP"
  echo
else
  code="$(curl -sS -o "$TMP" -w "%{http_code}" \
    --max-time "$CURL_MAX_TIME" \
    -X POST \
    -H "x-travel-ai-worker-secret: ${SECRET}" \
    -H "Accept: application/json" \
    "$URL")"
fi

if [[ "$code" =~ ^2 ]]; then
  echo "[OK] ai-worker-run-steps HTTP ${code}"
  RECONCILE_SCRIPT="$SCRIPT_DIR/reconcile-core-listings.sh"
  if [[ "${CORE_LISTING_RECONCILE:-1}" != "0" && -f "$RECONCILE_SCRIPT" ]]; then
    /bin/bash "$RECONCILE_SCRIPT" || echo "[WARN] Çekirdek ilan kalite/yayın uzlaştırması çalışmadı" >&2
  fi
  exit 0
fi

echo "[FAIL] ai-worker-run-steps HTTP ${code}" >&2
if [[ "${WORKER_VERBOSE:-0}" != "1" ]]; then
  head -c 2000 "$TMP" >&2 || true
  echo >&2
fi
exit 1
