#!/usr/bin/env bash
# Wtatil turları — Gezinomi galeriden ek fotoğraflar (Playwright + AVIF)
#
# Önkoşul (bir kez, repo kökünden):
#   cd frontend && npm install && npx playwright install chromium
#   # Linux sunucuda ek paket gerekebilir: npx playwright install-deps chromium
#
# Kullanım:
#   chmod +x deploy/scripts/import-gezinomi-tour-images.sh
#   ./deploy/scripts/import-gezinomi-tour-images.sh --dry-run --limit 3
#   ./deploy/scripts/import-gezinomi-tour-images.sh --few-only --skip-existing --limit 50
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

if [[ ! -d "$APP_ROOT/frontend/node_modules/playwright" ]]; then
  echo "[FAIL] Playwright yüklü değil. Bir kez çalıştırın:" >&2
  echo "  ./deploy/scripts/playwright-server-setup.sh" >&2
  exit 1
fi

echo "→ Playwright Chromium smoke test…"
if ! (
  cd "$APP_ROOT/frontend"
  node -e "const {chromium}=require('playwright');(async()=>{const b=await chromium.launch({headless:true});await b.close();})().catch(e=>{console.error(e.message||e);process.exit(1)})"
); then
  echo "" >&2
  echo "[FAIL] Chromium başlatılamadı — sistem kütüphaneleri eksik." >&2
  echo "  root ile: ./deploy/scripts/playwright-server-setup.sh" >&2
  echo "  veya: cd frontend && npx playwright install-deps chromium" >&2
  exit 1
fi

echo "→ Gezinomi galeri import…"
node scripts/import-gezinomi-tour-images.mjs "$@"
