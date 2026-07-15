#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
tmp="$(mktemp)"
missing="${tmp}.new"
backend="${tmp}.backend"
backend_missing="${tmp}.backend-new"
trap 'rm -f "$tmp" "$missing" "$backend" "$backend_missing"' EXIT

printf '%s\n' \
  'SECRET_TOKEN=keep-me' \
  'ALLOWED_HOSTS=custom.example,rezervasyonyap.tr' \
  'INTERNATIONAL_SITE_HOSTS=legacy.example' \
  'ALLOWED_HOSTS=duplicate.example' > "$tmp"
printf '%s\n' \
  'DATABASE_URL=keep-me' \
  'CORS_ALLOWED_ORIGINS=https://custom.example' > "$backend"

FRONTEND_ENV_FILE="$tmp" BACKEND_ENV_FILE="$backend" bash "$SCRIPT_DIR/ensure-multidomain-frontend-env.sh"
first="$(cat "$tmp")"
backend_first="$(cat "$backend")"
FRONTEND_ENV_FILE="$tmp" BACKEND_ENV_FILE="$backend" bash "$SCRIPT_DIR/ensure-multidomain-frontend-env.sh"
second="$(cat "$tmp")"
backend_second="$(cat "$backend")"

[[ "$first" == "$second" ]]
[[ "$backend_first" == "$backend_second" ]]
[[ "$(grep -c '^ALLOWED_HOSTS=' "$tmp")" == 1 ]]
[[ "$(grep -c '^INTERNATIONAL_SITE_HOSTS=' "$tmp")" == 1 ]]
[[ "$(grep -c '^CORS_ALLOWED_ORIGINS=' "$backend")" == 1 ]]
grep -q '^SECRET_TOKEN=keep-me$' "$tmp"
grep -q '^DATABASE_URL=keep-me$' "$backend"
grep -q 'custom.example' "$tmp"
grep -q 'reservationinturkey.com' "$tmp"
grep -q 'rezervasyonyap.com.tr' "$tmp"
grep -q 'tatil-evi.com' "$tmp"
grep -q 'legacy.example' "$tmp"
grep -q 'https://custom.example' "$backend"
grep -q 'https://tatil-evi.com' "$backend"
! grep '^INTERNATIONAL_SITE_HOSTS=' "$tmp" | grep -q 'tatil-evi.com'

FRONTEND_ENV_FILE="$missing" BACKEND_ENV_FILE="$backend_missing" bash "$SCRIPT_DIR/ensure-multidomain-frontend-env.sh"
grep -q '^ALLOWED_HOSTS=' "$missing"
grep -q '^INTERNATIONAL_SITE_HOSTS=' "$missing"
grep -q '^CORS_ALLOWED_ORIGINS=' "$backend_missing"

echo "Multidomain frontend env tests passed."
