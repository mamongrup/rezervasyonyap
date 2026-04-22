#!/usr/bin/env bash
# VPS tek komut deploy. İlk kurulumda: chmod +x deploy/deploy.sh
# Kullanım: cd /opt/rezervasyonyap && ./deploy/deploy.sh
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_ROOT"

git pull

(cd "$APP_ROOT/backend" && gleam build)

(cd "$APP_ROOT/frontend" && npm ci && npm run build)

# root değilsen: sudo systemctl restart travel-api travel-web
systemctl restart travel-api travel-web

echo "OK: travel-api + travel-web yeniden başlatıldı."
