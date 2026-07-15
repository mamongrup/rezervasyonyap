#!/usr/bin/env bash
# Ortak uygulamaya bağlı marka domainlerini frontend host güvenliği, backend
# CORS ve uluslararası dil yönlendirmesi için production env dosyalarına ekler.
set -euo pipefail

ENV_FILE="${FRONTEND_ENV_FILE:-/etc/rezervasyonyap/frontend.env}"
BACKEND_ENV_FILE="${BACKEND_ENV_FILE:-/etc/rezervasyonyap/backend.env}"
REQUIRED_ALLOWED_HOSTS="rezervasyonyap.tr,www.rezervasyonyap.tr,rezervasyonyap.com.tr,www.rezervasyonyap.com.tr,reservationinturkey.com,www.reservationinturkey.com,tatil-evi.com,www.tatil-evi.com,127.0.0.1,localhost"
REQUIRED_INTERNATIONAL_HOSTS="reservationinturkey.com,www.reservationinturkey.com"
REQUIRED_CORS_ORIGINS="https://rezervasyonyap.tr,https://www.rezervasyonyap.tr,https://rezervasyonyap.com.tr,https://www.rezervasyonyap.com.tr,https://reservationinturkey.com,https://www.reservationinturkey.com,https://tatil-evi.com,https://www.tatil-evi.com"

env_value() {
  local file="$1"
  local key="$2"
  awk -v key="$key" '
    index($0, key "=") == 1 {
      sub("^[^=]*=", "", $0)
      print $0
      exit
    }
  ' "$file"
}

merge_csv() {
  local current="$1"
  local required="$2"
  local item result=""
  declare -A seen=()
  IFS=',' read -r -a items <<< "${current},${required}"
  for item in "${items[@]}"; do
    item="${item//[[:space:]]/}"
    [[ -n "$item" ]] || continue
    [[ -z "${seen[$item]:-}" ]] || continue
    seen[$item]=1
    result="${result:+${result},}${item}"
  done
  printf '%s' "$result"
}

upsert_env() {
  local file="$1"
  local key="$2"
  local value="$3"
  local tmp
  tmp="$(mktemp "${file}.tmp.XXXXXX")"
  awk -v key="$key" -v value="$value" '
    BEGIN { written = 0 }
    index($0, key "=") == 1 {
      if (!written) print key "=" value
      written = 1
      next
    }
    { print }
    END { if (!written) print key "=" value }
  ' "$file" > "$tmp"
  chmod --reference="$file" "$tmp" 2>/dev/null || chmod 600 "$tmp"
  chown --reference="$file" "$tmp" 2>/dev/null || true
  mv -f "$tmp" "$file"
}

for file in "$ENV_FILE" "$BACKEND_ENV_FILE"; do
  mkdir -p "$(dirname "$file")"
  if [[ ! -f "$file" ]]; then
    touch "$file"
    chmod 600 "$file"
  fi
done

allowed="$(merge_csv "$(env_value "$ENV_FILE" ALLOWED_HOSTS)" "$REQUIRED_ALLOWED_HOSTS")"
international="$(merge_csv "$(env_value "$ENV_FILE" INTERNATIONAL_SITE_HOSTS)" "$REQUIRED_INTERNATIONAL_HOSTS")"
cors="$(merge_csv "$(env_value "$BACKEND_ENV_FILE" CORS_ALLOWED_ORIGINS)" "$REQUIRED_CORS_ORIGINS")"
upsert_env "$ENV_FILE" ALLOWED_HOSTS "$allowed"
upsert_env "$ENV_FILE" INTERNATIONAL_SITE_HOSTS "$international"
upsert_env "$BACKEND_ENV_FILE" CORS_ALLOWED_ORIGINS "$cors"

echo "[OK] Çoklu domain env ayarları hazır: $ENV_FILE, $BACKEND_ENV_FILE"
