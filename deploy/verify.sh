#!/usr/bin/env bash
# Post-deploy quick verification for travel-web + travel-api.
# Usage:
#   chmod +x deploy/verify.sh
#   ./deploy/verify.sh
# Optional:
#   API_ORIGIN=http://127.0.0.1:8080 WEB_ORIGIN=http://127.0.0.1:3000 ./deploy/verify.sh

set -euo pipefail

WEB_SERVICE="${WEB_SERVICE:-travel-web.service}"
API_SERVICE="${API_SERVICE:-travel-api.service}"
API_ORIGIN="${API_ORIGIN:-http://127.0.0.1:8080}"
WEB_ORIGIN="${WEB_ORIGIN:-http://127.0.0.1:3000}"

ok() { echo "[OK] $*"; }
warn() { echo "[WARN] $*"; }
fail() { echo "[FAIL] $*" >&2; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

check_service_active() {
  local svc="$1"
  systemctl is-active --quiet "$svc" || fail "$svc is not active"
  ok "$svc is active"
}

check_working_directory() {
  local wd
  wd="$(systemctl show "$WEB_SERVICE" -p WorkingDirectory --value)"
  [[ -n "$wd" ]] || fail "$WEB_SERVICE WorkingDirectory is empty"
  [[ -f "$wd/package.json" ]] || fail "package.json not found under WorkingDirectory: $wd"
  ok "$WEB_SERVICE WorkingDirectory has package.json: $wd"
}

check_env() {
  local env
  env="$(systemctl show "$WEB_SERVICE" -p Environment --value)"
  [[ "$env" == *"NEXT_PUBLIC_API_URL="* ]] || fail "NEXT_PUBLIC_API_URL missing in $WEB_SERVICE environment"
  [[ "$env" == *"INTERNAL_API_ORIGIN="* ]] || fail "INTERNAL_API_ORIGIN missing in $WEB_SERVICE environment"
  [[ "$env" == *"INTERNAL_MIDDLEWARE_REWRITE_ORIGIN="* ]] || warn "INTERNAL_MIDDLEWARE_REWRITE_ORIGIN missing, recommended"
  ok "$WEB_SERVICE required env keys look present"
}

http_status() {
  local url="$1"
  curl -sS -o /dev/null -w "%{http_code}" "$url"
}

wait_http_status() {
  local url="$1"
  local max_attempts="${2:-10}"
  local sleep_seconds="${3:-2}"
  local i=1 status
  while [[ "$i" -le "$max_attempts" ]]; do
    status="$(http_status "$url" || true)"
    if [[ -n "$status" ]]; then
      echo "$status"
      return 0
    fi
    i=$((i + 1))
    sleep "$sleep_seconds"
  done
  echo ""
}

check_next_static_chunk() {
  local wd sample url status rel url_path
  wd="$(systemctl show "$WEB_SERVICE" -p WorkingDirectory --value)"
  [[ -d "$wd/.next/static/chunks" ]] || fail "Missing $wd/.next/static/chunks — build or run wrong directory"
  sample="$(find "$wd/.next/static/chunks" -maxdepth 1 -type f -name '*.js' | head -1)"
  [[ -n "$sample" ]] || fail "No *.js in $wd/.next/static/chunks"
  url="$WEB_ORIGIN/_next/static/chunks/$(basename "$sample")"
  status="$(http_status "$url" || true)"
  [[ "$status" == "200" ]] || fail "Next static chunk must be 200: $url -> $status — check Apache or ModSecurity proxy"
  ok "Next static chunk OK, HTTP 200, file $(basename "$sample")"

  # [locale] yolu — Plesk ModSecurity/Imunify bazen koseli parantez iceren URL'yi 500'e dusurur
  sample="$(find "$wd/.next/static/chunks/app" -type f -name 'layout-*.js' 2>/dev/null | head -1 || true)"
  if [[ -n "${sample:-}" ]]; then
    command -v python3 >/dev/null 2>&1 || {
      warn "python3 yok; app layout chunk URL testi atlandi"
      return 0
    }
    rel="${sample#"$wd/.next/static/}"
    url_path="$(
      VERIFY_REL="$rel" python3 - <<'PY'
import os, urllib.parse
rel = os.environ["VERIFY_REL"]
parts = rel.split("/")
enc = "/".join(urllib.parse.quote(p, safe="") for p in parts)
print("/_next/static/" + enc, end="")
PY
    )"
    status="$(http_status "$WEB_ORIGIN$url_path" || true)"
    [[ "$status" == "200" ]] || fail "Next app chunk must be 200: $WEB_ORIGIN$url_path -> $status — WAF: whitelist /_next/static or disable rule"
    ok "Next app layout chunk OK, HTTP 200"
  fi
}

check_endpoints() {
  local auth_status hero_status
  auth_status="$(wait_http_status "$API_ORIGIN/api/v1/auth/me" 12 2)"
  if [[ -z "$auth_status" ]]; then
    fail "auth/me unreachable after retries: ${API_ORIGIN}/api/v1/auth/me"
  elif [[ "$auth_status" == "200" ]] || [[ "$auth_status" == "401" ]]; then
    ok "auth/me reachable: ${auth_status}"
  else
    fail "auth/me unexpected status: ${auth_status} at ${API_ORIGIN}/api/v1/auth/me"
  fi

  hero_status="$(wait_http_status "$WEB_ORIGIN/api/hero-tabs" 8 2)"
  [[ "$hero_status" == "200" ]] || fail "hero-tabs unexpected status: ${hero_status} at ${WEB_ORIGIN}/api/hero-tabs"
  ok "hero-tabs reachable, HTTP 200"
}

main() {
  require_cmd systemctl
  require_cmd curl

  check_service_active "$WEB_SERVICE"
  check_service_active "$API_SERVICE"
  check_working_directory
  check_env
  check_next_static_chunk
  check_endpoints

  ok "Deploy verification completed successfully"
}

main "$@"
