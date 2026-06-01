#!/usr/bin/env bash
# Wtatil tur fiyat zenginleştirmesi: dönem + search-tour cheapestPrice.
# WTATIL_AGENCY_ID gerekir (/etc/rezervasyonyap/wtatil.env).
#
#   chmod +x deploy/scripts/import-wtatil-tours-full.sh
#   nohup ./deploy/scripts/import-wtatil-tours-full.sh > /tmp/wtatil-tour-prices.log 2>&1 &
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
exec "$APP_ROOT/deploy/scripts/import-wtatil-published.sh" --enrich --full "$@"
