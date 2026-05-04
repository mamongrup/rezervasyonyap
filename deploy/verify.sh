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
  local f="/etc/rezervasyonyap/frontend.env"
  [[ -f "$f" ]] || warn "$f yok — env yalnızca unit içindeyse bu denetim atlanmış olabilir"
  if [[ -f "$f" ]]; then
    # shellcheck disable=SC1090
    set -a && source "$f" && set +a
  fi
  [[ -n "${NEXT_PUBLIC_API_URL:-}" ]] ||
    fail "NEXT_PUBLIC_API_URL tanımlı değil ( $f içinde veya systemd Environment olmalı)"
  [[ -n "${INTERNAL_API_ORIGIN:-}" ]] ||
    fail "INTERNAL_API_ORIGIN tanımlı değil ( $f içinde veya systemd Environment olmalı)"
  [[ -n "${INTERNAL_MIDDLEWARE_REWRITE_ORIGIN:-}" ]] ||
    warn "INTERNAL_MIDDLEWARE_REWRITE_ORIGIN eksik (Next middleware önerilir)"
  case "${NEXT_PUBLIC_API_URL:-}" in
    *127.0.0.1*|*localhost*)
      warn "NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL — tarayıcı bu adresi kullanıcının bilgisayarında arar; uzaktan Yönetim/YZ çalışmaz. Örnek: https://rezervasyonyap.tr (INTERNAL_API_ORIGIN ayrıca 127.0.0.1:8080 kalabilir)."
      ;;
  esac
  ok "$WEB_SERVICE için gerekli env anahtarları tanımlı (frontend.env)"
}

check_workdir_matches_deploy_root() {
  local wd expected repo_root rwd eexp
  wd="$(systemctl show "$WEB_SERVICE" -p WorkingDirectory --value)"
  [[ -n "$wd" ]] || return 0
  repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  expected="${VERIFY_REPO_FRONTEND:-$repo_root/frontend}"
  rwd="$(readlink -f "$wd" 2>/dev/null || realpath "$wd" 2>/dev/null || echo "$wd")"
  eexp="$(readlink -f "$expected" 2>/dev/null || realpath "$expected" 2>/dev/null || echo "$expected")"
  if [[ "$rwd" != "$eexp" ]]; then
    warn "travel-web WorkingDirectory ($rwd) deploy'un beklediği frontend ($eexp) ile aynı değil. deploy.sh ile systemd aynı klasörü işaret etmeli; aksi halde yeni build servis edilmez."
  fi
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
  local wd sample url status rel url_path chunk_base
  wd="$(systemctl show "$WEB_SERVICE" -p WorkingDirectory --value)"
  [[ -d "$wd/.next/static/chunks" ]] || fail "Missing $wd/.next/static/chunks - build or run wrong directory"
  sample="$(find "$wd/.next/static/chunks" -maxdepth 1 -type f -name '*.js' | head -1)"
  [[ -n "$sample" ]] || fail "No *.js in $wd/.next/static/chunks"
  chunk_base="$(basename "$sample")"
  url="$WEB_ORIGIN/_next/static/chunks/$chunk_base"
  status="$(http_status "$url" || true)"
  [[ "$status" == "200" ]] || fail "Next static chunk must be 200: $url -> $status - check Apache or ModSecurity proxy"
  ok "Next static chunk OK, HTTP 200, file ${chunk_base}"

  # [locale] yolu - Plesk ModSecurity/Imunify bazen koseli parantez iceren URL 500 donebilir
  sample="$(find "$wd/.next/static/chunks/app" -type f -name 'layout-*.js' 2>/dev/null | head -1 || true)"
  if [[ -n "${sample:-}" ]]; then
    command -v python3 >/dev/null 2>&1 || {
      warn "python3 yok; app layout chunk URL testi atlandi"
      return 0
    }
    _strip="${wd}/.next/static/"
    rel="${sample#${_strip}}"
    # Heredoc nested in $() bazı bash sürümlerinde "syntax error near (" veriyor; -c kullan.
    export PYTHON_REL="$rel"
    url_path="$(python3 -c 'import os,urllib.parse as up; r=os.environ["PYTHON_REL"]; print("/_next/static/" + "/".join(up.quote(p, safe="") for p in r.split("/")), end="")')"
    status="$(http_status "$WEB_ORIGIN$url_path" || true)"
    [[ "$status" == "200" ]] || fail "Next app chunk must be 200: $WEB_ORIGIN$url_path -> $status - WAF: whitelist /_next/static or disable rule"
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
  check_workdir_matches_deploy_root
  check_next_static_chunk
  check_endpoints

  ok "Deploy verification completed successfully"
}

main "$@"
