#!/usr/bin/env bash
# Bravo aktivite Türkçe karakter onarımı (Ölüdeniz, Kaş, Çalış, …)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

SQL="$ROOT/deploy/scripts/sql/fix-bravo-activity-turkish-chars.sql"
if [[ ! -f "$SQL" ]]; then
  echo "SQL yok — üretiliyor..."
  node "$ROOT/scripts/repair-bravo-turkish-encoding.mjs" --json-only --write-sql
fi

if [[ -x "$ROOT/deploy/apply-sql.sh" ]]; then
  "$ROOT/deploy/apply-sql.sh" "$SQL"
else
  # shellcheck disable=SC1091
  source "$ROOT/deploy/scripts/lib/psql-env.sh"
  require_travel_db_env
  psql_travel -v ON_ERROR_STOP=1 -f "$SQL"
fi

# Featured listings paneli Next fetch-cache kullanır
if [[ -d "$ROOT/frontend/.next/cache" ]]; then
  rm -rf "$ROOT/frontend/.next/cache/fetch-cache" 2>/dev/null || true
fi
if systemctl is-active --quiet travel-web.service 2>/dev/null; then
  systemctl restart travel-web.service || true
fi

echo "[OK] Bravo aktivite Türkçe karakterler onarıldı."
echo "     Ctrl+Shift+R → /manage/content/featured-listings?category=aktiviteler"
