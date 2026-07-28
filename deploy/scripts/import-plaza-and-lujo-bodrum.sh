#!/usr/bin/env bash
# Bodrum paket: The Plaza Bodrum (Torba) + Lujo Bodrum (Güvercinlik).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$APP_ROOT"
chmod +x "$APP_ROOT/deploy/scripts/import-the-plaza-bodrum.sh" "$APP_ROOT/deploy/scripts/import-lujo-bodrum.sh"
"$APP_ROOT/deploy/scripts/import-the-plaza-bodrum.sh"
"$APP_ROOT/deploy/scripts/import-lujo-bodrum.sh"
echo "[OK] Her iki Bodrum oteli aktarıldı: the-plaza-bodrum + lujo-bodrum"
