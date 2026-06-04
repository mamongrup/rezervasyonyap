#!/usr/bin/env bash
# Checkout "insert_line_failed" teşhisi: cart_lines şeması + canlı API satır ekleme.
#
# Kullanım (deploy kökü):
#   chmod +x deploy/scripts/verify-cart-checkout.sh
#   ./deploy/scripts/verify-cart-checkout.sh
#   LISTING_ID=4b9b7c11-5815-4e81-8c60-b6e4f29833a4 ./deploy/scripts/verify-cart-checkout.sh
#
# Opsiyonel: API_ORIGIN, TRAVEL_DB_ENV (apply-sql ile aynı backend.env)

set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${TRAVEL_DB_ENV:-/etc/rezervasyonyap/backend.env}"
API_ORIGIN="${API_ORIGIN:-http://127.0.0.1:8080}"
LISTING_ID="${LISTING_ID:-}"
STARTS_ON="${STARTS_ON:-2026-07-01}"
ENDS_ON="${ENDS_ON:-2026-07-08}"
UNIT_PRICE="${UNIT_PRICE:-100.00}"

ok() { echo "[OK] $*"; }
fail() { echo "[FAIL] $*" >&2; exit 1; }
warn() { echo "[WARN] $*"; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Eksik komut: $1"
}

require_cmd psql
require_cmd curl

# shellcheck source=deploy/scripts/lib/psql-env.sh
source "$APP_ROOT/deploy/scripts/lib/psql-env.sh"
export TRAVEL_DB_ENV="$ENV_FILE"
load_travel_db_env

echo "==> cart_lines kolonları (tax_amount, fee_amount, meta_json, flexible_dates)"
missing=""
for col in tax_amount fee_amount meta_json flexible_dates; do
  if ! psql_travel -tAc "SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='cart_lines' AND column_name='$col'" | grep -q 1; then
    missing="$missing $col"
  fi
done
if [[ -n "$missing" ]]; then
  fail "Eksik cart_lines kolonları:$missing — çalıştırın: ./deploy/apply-sql.sh backend/priv/sql/modules/305_cart_lines_schema_guard.sql"
fi
ok "cart_lines şema kolonları mevcut"

if [[ -z "$LISTING_ID" ]]; then
  LISTING_ID="$(psql_travel -tAc "SELECT id::text FROM listings WHERE status='published' ORDER BY created_at DESC LIMIT 1" | tr -d '[:space:]')"
fi
if [[ -z "$LISTING_ID" ]]; then
  warn "Yayın ilanı yok; API satır testi atlandı"
  exit 0
fi

echo "==> API ile test sepet satırı (listing=$LISTING_ID)"
cart_json="$(curl -sS -X POST "$API_ORIGIN/api/v1/carts" \
  -H 'Content-Type: application/json' \
  -d '{"currency_code":"TRY"}')"
cart_id="$(echo "$cart_json" | sed -n 's/.*"id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n1)"
[[ -n "$cart_id" ]] || fail "Sepet oluşturulamadı: $cart_json"

line_resp="$(curl -sS -w '\n%{http_code}' -X POST "$API_ORIGIN/api/v1/carts/$cart_id/lines" \
  -H 'Content-Type: application/json' \
  -d "{\"listing_id\":\"$LISTING_ID\",\"quantity\":1,\"starts_on\":\"$STARTS_ON\",\"ends_on\":\"$ENDS_ON\",\"unit_price\":\"$UNIT_PRICE\"}")"
line_body="$(echo "$line_resp" | sed '$d')"
line_status="$(echo "$line_resp" | tail -n1)"

if [[ "$line_status" == "201" ]]; then
  ok "POST /carts/.../lines → 201"
  echo "     Yanıt: $line_body"
  exit 0
fi

fail "POST /carts/.../lines → HTTP $line_status body=$line_body

Log: grep '\\[cart_line\\]' /var/log/travel-api.log | tail -5
Şema hatası ise: ./deploy/apply-sql.sh backend/priv/sql/modules/305_cart_lines_schema_guard.sql
Ardından: cd backend && gleam build && systemctl restart travel-api.service"
