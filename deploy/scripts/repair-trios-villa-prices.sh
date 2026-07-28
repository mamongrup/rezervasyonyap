#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
chmod +x deploy/apply-sql.sh
./deploy/apply-sql.sh backend/priv/sql/modules/394_repair_trios_villa_seasonal_prices.sql
echo "[ok] trios-villa: 5 seasonal price bands applied"
echo "[hint] live refresh: node scripts/repair-akdenizvillam-villa-content.mjs trios-villa"
