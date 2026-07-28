#!/usr/bin/env bash
# Gülbay Villa: Kalkan Kışla içerik + sezon fiyatları (migration 392)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
chmod +x deploy/apply-sql.sh
./deploy/apply-sql.sh backend/priv/sql/modules/392_repair_gulbay_villa_force_content_prices.sql
echo "[ok] gulbay-villa content + 4 seasonal price bands applied"
echo "[hint] Canlı kaynaktan yeniden çekmek için (opsiyonel):"
echo "  node scripts/repair-akdenizvillam-villa-content.mjs gulbay-villa"
