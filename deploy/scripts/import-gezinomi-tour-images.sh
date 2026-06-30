#!/usr/bin/env bash
# Wtatil turları — Gezinomi galeriden yüksek kaliteli fotoğraflar (varsayılan: HTTP API, Playwright gerekmez)
#
# Tur kodu (productId) ile eşleştirme; isteğe bağlı dönem karşılaştırması (--compare-periods).
# Sadece dönem denetimi: node scripts/audit-gezinomi-wtatil-periods.mjs
#
# Kullanım:
#   chmod +x deploy/scripts/import-gezinomi-tour-images.sh
#   ./deploy/scripts/import-gezinomi-tour-images.sh --dry-run --limit 3
#   ./deploy/scripts/import-gezinomi-tour-images.sh --few-only --skip-existing --compare-periods
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_ENV="${TRAVEL_DB_ENV:-/etc/rezervasyonyap/backend.env}"

if [[ -f "$BACKEND_ENV" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$BACKEND_ENV"
  set +a
fi

cd "$APP_ROOT"

if ! grep -q 'IMPORT_VERSION.*api-v6' "$APP_ROOT/scripts/import-gezinomi-tour-images.mjs" 2>/dev/null; then
  echo "[FAIL] Eski kod — şunu çalıştırın:" >&2
  echo "  cd $APP_ROOT && git fetch origin main && git reset --hard origin/main" >&2
  exit 1
fi

echo "→ git $(git -C "$APP_ROOT" rev-parse --short HEAD 2>/dev/null || echo '?')"
echo "→ PostgreSQL bağlantı testi…"
node scripts/test-pg-env.mjs || exit 1

if [[ " $* " == *" --playwright "* ]]; then
  if [[ ! -d "$APP_ROOT/frontend/node_modules/playwright" ]]; then
    echo "[FAIL] --playwright için: cd frontend && npm install && npx playwright install chromium" >&2
    exit 1
  fi
  echo "→ Playwright modu (Chromium smoke test)…"
  if ! (
    cd "$APP_ROOT/frontend"
    node -e "const {chromium}=require('playwright');(async()=>{const b=await chromium.launch({headless:true});await b.close();})().catch(e=>{console.error(e.message||e);process.exit(1)})"
  ); then
    echo "[FAIL] Chromium başlatılamadı. Fetch modunu kullanın (--playwright olmadan)." >&2
    exit 1
  fi
else
  echo "→ Gezinomi TourDetail API (Playwright gerekmez)…"
fi

echo "→ Gezinomi galeri import…"
node scripts/import-gezinomi-tour-images.mjs "$@"
