#!/usr/bin/env bash
# Ortak uygulamaya bağlı marka domainlerini frontend host güvenliği ve
# uluslararası dil yönlendirmesi için production env dosyasına güvenle ekler.
set -euo pipefail

ENV_FILE="${FRONTEND_ENV_FILE:-/etc/rezervasyonyap/frontend.env}"
REQUIRED_ALLOWED_HOSTS="rezervasyonyap.tr,www.rezervasyonyap.tr,rezervasyonyap.com.tr,www.rezervasyonyap.com.tr,reservationinturkey.com,www.reservationinturkey.com,127.0.0.1,localhost"
REQUIRED_INTERNATIONAL_HOSTS="reservationinturkey.com,www.reservationinturkey.com"

env_value() {
  local key="$1"
  awk -v key="$key" '
    index($0, key "=") == 1 {
      sub("^[^=]*=", "", $0)
      print $0
      exit
    }
  ' "$ENV_FILE"
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
  local key="$1"
  local value="$2"
  local tmp
  tmp="$(mktemp "${ENV_FILE}.tmp.XXXXXX")"
  awk -v key="$key" -v value="$value" '
    BEGIN { written = 0 }
    index($0, key "=") == 1 {
      if (!written) print key "=" value
      written = 1
      next
    }
    { print }
    END { if (!written) print key "=" value }
  ' "$ENV_FILE" > "$tmp"
  chmod --reference="$ENV_FILE" "$tmp" 2>/dev/null || chmod 600 "$tmp"
  chown --reference="$ENV_FILE" "$tmp" 2>/dev/null || true
  mv -f "$tmp" "$ENV_FILE"
}

mkdir -p "$(dirname "$ENV_FILE")"
if [[ ! -f "$ENV_FILE" ]]; then
  touch "$ENV_FILE"
  chmod 600 "$ENV_FILE"
fi

allowed="$(merge_csv "$(env_value ALLOWED_HOSTS)" "$REQUIRED_ALLOWED_HOSTS")"
international="$(merge_csv "$(env_value INTERNATIONAL_SITE_HOSTS)" "$REQUIRED_INTERNATIONAL_HOSTS")"
upsert_env ALLOWED_HOSTS "$allowed"
upsert_env INTERNATIONAL_SITE_HOSTS "$international"

echo "[OK] Çoklu domain frontend env ayarları hazır: $ENV_FILE"
