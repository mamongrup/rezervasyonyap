#!/usr/bin/env bash
# Linux sunucuda Playwright (Gezinomi scrape) — bir kez çalıştırın (root).
#
#   cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
#   chmod +x deploy/scripts/playwright-server-setup.sh
#   ./deploy/scripts/playwright-server-setup.sh
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FRONTEND="$APP_ROOT/frontend"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "[FAIL] Eksik komut: $1" >&2
    exit 1
  }
}

require_cmd node
require_cmd npm

cd "$FRONTEND"
echo "→ npm install (playwright dahil)…"
npm install --no-audit --no-fund

echo "→ Chromium indir…"
npx playwright install chromium

echo "→ Sistem kütüphaneleri (install-deps)…"
if [[ "$(id -u)" -eq 0 ]]; then
  npx playwright install-deps chromium
else
  echo "[UYARI] root değilsiniz — install-deps atlanıyor."
  echo "  root ile: cd frontend && npx playwright install-deps chromium"
fi

echo "→ Chromium smoke test…"
node <<'NODE'
const { chromium } = require('playwright')
;(async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await page.goto('about:blank')
  await browser.close()
  console.log('[OK] Playwright Chromium çalışıyor.')
})().catch((e) => {
  console.error('[FAIL]', e.message || e)
  console.error('')
  console.error('Root ile deneyin:')
  console.error('  cd frontend && npx playwright install-deps chromium')
  console.error('veya apt:')
  console.error('  apt-get install -y libatk-bridge2.0-0 libatspi2.0-0 libgbm1 libasound2 \\')
  console.error('    libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libnss3 libpango-1.0-0 libcairo2')
  process.exit(1)
})
NODE

echo "→ Hazır. Gezinomi import:"
echo "  cd $APP_ROOT && ./deploy/scripts/import-gezinomi-tour-images.sh --dry-run --limit 3"
