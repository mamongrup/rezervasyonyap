#!/usr/bin/env bash
# Üretim güvenlik env — CORS + CSP (idempotent).
set -euo pipefail

patch_env() {
  local file="$1"
  local key="$2"
  local value="$3"
  touch "$file"
  if grep -q "^${key}=" "$file" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$file"
  else
    echo "${key}=${value}" >> "$file"
  fi
}

patch_env /etc/rezervasyonyap/backend.env CORS_ALLOWED_ORIGINS \
  "https://rezervasyonyap.tr,https://www.rezervasyonyap.tr,https://rezervasyonyap.com.tr,https://www.rezervasyonyap.com.tr,https://reservationinturkey.com,https://www.reservationinturkey.com,https://tatil-evi.com,https://www.tatil-evi.com"
patch_env /etc/rezervasyonyap/frontend.env CSP_MODE enforce

echo "[OK] backend.env:"
grep '^CORS_ALLOWED_ORIGINS=' /etc/rezervasyonyap/backend.env
echo "[OK] frontend.env:"
grep -E '^(CSP_MODE|ALLOWED_HOSTS)=' /etc/rezervasyonyap/frontend.env
