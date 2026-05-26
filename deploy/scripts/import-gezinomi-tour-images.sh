#!/usr/bin/env bash
# Wtatil turları — Gezinomi galeriden ek fotoğraflar (varsayılan: HTTP fetch, Playwright gerekmez)
#
# AlmaLinux / Plesk sunucuda apt-get yok — fetch modu yeterli.
# İsteğe bağlı tarayıcı: --playwright (Debian/Ubuntu + playwright install-deps)
#
# Kullanım:
#   chmod +x deploy/scripts/import-gezinomi-tour-images.sh
#   ./deploy/scripts/import-gezinomi-tour-images.sh --dry-run --limit 3
#   ./deploy/scripts/import-gezinomi-tour-images.sh --few-only --skip-existing
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
  echo "→ HTTP fetch modu (Playwright gerekmez)…"
fi

echo "→ Gezinomi galeri import…"
node scripts/import-gezinomi-tour-images.mjs "$@"
