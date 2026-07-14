#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
tmp="$(mktemp)"
missing="${tmp}.new"
trap 'rm -f "$tmp" "$missing"' EXIT

printf '%s\n' \
  'SECRET_TOKEN=keep-me' \
  'ALLOWED_HOSTS=custom.example,rezervasyonyap.tr' \
  'INTERNATIONAL_SITE_HOSTS=legacy.example' \
  'ALLOWED_HOSTS=duplicate.example' > "$tmp"

FRONTEND_ENV_FILE="$tmp" bash "$SCRIPT_DIR/ensure-multidomain-frontend-env.sh"
first="$(cat "$tmp")"
FRONTEND_ENV_FILE="$tmp" bash "$SCRIPT_DIR/ensure-multidomain-frontend-env.sh"
second="$(cat "$tmp")"

[[ "$first" == "$second" ]]
[[ "$(grep -c '^ALLOWED_HOSTS=' "$tmp")" == 1 ]]
[[ "$(grep -c '^INTERNATIONAL_SITE_HOSTS=' "$tmp")" == 1 ]]
grep -q '^SECRET_TOKEN=keep-me$' "$tmp"
grep -q 'custom.example' "$tmp"
grep -q 'reservationinturkey.com' "$tmp"
grep -q 'rezervasyonyap.com.tr' "$tmp"
grep -q 'legacy.example' "$tmp"

FRONTEND_ENV_FILE="$missing" bash "$SCRIPT_DIR/ensure-multidomain-frontend-env.sh"
grep -q '^ALLOWED_HOSTS=' "$missing"
grep -q '^INTERNATIONAL_SITE_HOSTS=' "$missing"

echo "Multidomain frontend env tests passed."
