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
  [[ "$env" == *"INTERNAL_MIDDLEWARE_REWRITE_ORIGIN="* ]] || warn "INTERNAL_MIDDLEWARE_REWRITE_ORIGIN missing (recommended)"
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
  local i status
  for ((i=1; i<=max_attempts; i++)); do
    status="$(http_status "$url" || true)"
    if [[ -n "$status" ]]; then
      echo "$status"
      return 0
    fi
    sleep "$sleep_seconds"
  done
  echo ""
}

check_next_static_chunk() {
  local wd sample url status rel url_path
  wd="$(systemctl show "$WEB_SERVICE" -p WorkingDirectory --value)"
  [[ -d "$wd/.next/static/chunks" ]] || fail "Missing $wd/.next/static/chunks (build/run wrong directory?)"
  sample="$(find "$wd/.next/static/chunks" -maxdepth 1 -type f -name '*.js' | head -1)"
  [[ -n "$sample" ]] || fail "No *.js in $wd/.next/static/chunks"
  url="$WEB_ORIGIN/_next/static/chunks/$(basename "$sample")"
  status="$(http_status "$url" || true)"
  [[ "$status" == "200" ]] || fail "Next static chunk must be 200: $url -> $status (check Apache/ModSecurity proxy)"
  ok "Next static chunk OK (200): $(basename "$sample")"

  # [locale] yolu — Plesk ModSecurity/Imunify bazen koseli parantez iceren URL'yi 500'e dusurur
  sample="$(find "$wd/.next/static/chunks/app" -type f -name 'layout-*.js' 2>/dev/null | head -1 || true)"
  if [[ -n "${sample:-}" ]]; then
    command -v python3 >/dev/null 2>&1 || {
      warn "python3 yok; app layout chunk URL testi atlandi"
      return 0
    }
    rel="${sample#"$wd/.next/static/}"
    url_path="$(VERIFY_REL="$rel" python3 -c "import os,urllib.parse; r=os.environ['VERIFY_REL']; print('/_next/static/'+ '/'.join(urllib.parse.quote(s, safe='') for s in r.split('/')))")"
    status="$(http_status "$WEB_ORIGIN$url_path" || true)"
    [[ "$status" == "200" ]] || fail "Next app chunk must be 200: $WEB_ORIGIN$url_path -> $status (WAF: whitelist /_next/static veya kural devre disi)"
    ok "Next app layout chunk OK (200)"
  fi
}

check_endpoints() {
  local auth_status hero_status
  auth_status="$(wait_http_status "$API_ORIGIN/api/v1/auth/me" 12 2)"
  case "$auth_status" in
    200|401) ok "auth/me reachable ($auth_status)";;
    "") fail "auth/me unreachable after retries ($API_ORIGIN/api/v1/auth/me)";;
    *) fail "auth/me unexpected status: $auth_status ($API_ORIGIN/api/v1/auth/me)";;
  esac

  hero_status="$(wait_http_status "$WEB_ORIGIN/api/hero-tabs" 8 2)"
  [[ "$hero_status" == "200" ]] || fail "hero-tabs unexpected status: $hero_status ($WEB_ORIGIN/api/hero-tabs)"
  ok "hero-tabs reachable (200)"
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
