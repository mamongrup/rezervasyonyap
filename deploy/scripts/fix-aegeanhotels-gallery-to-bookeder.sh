#!/usr/bin/env bash
# AegeanHotels galeri URL → Bookeder (hotlink 403 onarımı) + Next cache purge
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

SQL="$ROOT/deploy/scripts/sql/fix-aegeanhotels-gallery-to-bookeder.sql"
if [[ ! -f "$SQL" ]]; then
  echo "missing $SQL" >&2
  exit 1
fi

if [[ -x "$ROOT/deploy/apply-sql.sh" ]]; then
  "$ROOT/deploy/apply-sql.sh" "$SQL"
elif command -v psql >/dev/null 2>&1; then
  # shellcheck disable=SC1091
  [[ -f /etc/rezervasyonyap/backend.env ]] && set -a && . /etc/rezervasyonyap/backend.env && set +a
  psql "${DATABASE_URL:-}" -v ON_ERROR_STOP=1 -f "$SQL"
else
  echo "apply-sql.sh veya psql gerekli" >&2
  exit 1
fi

echo "SQL ok — aegeanhotels → bookeder"

# Kart/detay ISR cache
if [[ -d "$ROOT/frontend/.next/cache" ]]; then
  rm -rf "$ROOT/frontend/.next/cache/fetch-cache" 2>/dev/null || true
  echo "Next fetch-cache purged"
fi
if systemctl is-active --quiet travel-web.service 2>/dev/null; then
  systemctl restart travel-web.service
  echo "travel-web restarted"
fi

echo "Done. Hard-refresh /otel/liberty-signa"
