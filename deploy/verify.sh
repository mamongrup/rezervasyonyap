#!/usr/bin/env bash
# Post-deploy quick verification for travel-web + travel-api.
# Usage:
#   chmod +x deploy/verify.sh
#   ./deploy/verify.sh
# Optional:
#   API_ORIGIN=http://127.0.0.1:8080 WEB_ORIGIN=http://127.0.0.1:3000 ./deploy/verify.sh
#   WEB_READY_ATTEMPTS=60 WEB_READY_SLEEP=3 ./deploy/verify.sh  # travel-web yavas kalkiyorsa
#   CHUNK_VERIFY_ATTEMPTS=30 CHUNK_VERIFY_SLEEP=2 ./deploy/verify.sh  # _next/static bazen restart sonrasi gecikmeli

set -euo pipefail

WEB_SERVICE="${WEB_SERVICE:-travel-web.service}"
API_SERVICE="${API_SERVICE:-travel-api.service}"
API_ORIGIN="${API_ORIGIN:-http://127.0.0.1:8080}"
WEB_ORIGIN="${WEB_ORIGIN:-http://127.0.0.1:3000}"

ok() { echo "[OK] $*"; }
warn() { echo "[WARN] $*"; }
fail() { echo "[FAIL] $*" >&2; exit 1; }
step() { echo "==> verify: $*"; }

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
  if [[ -z "${ALLOWED_HOSTS:-}" ]]; then
    warn "ALLOWED_HOSTS boş — eski proxy build'inde tüm site 400 Bad Request verebilir. Örnek: ALLOWED_HOSTS=rezervasyonyap.tr,www.rezervasyonyap.tr,127.0.0.1,localhost"
  fi
  if [[ -z "${GOOGLE_MAPS_API_KEY:-}" ]] && [[ -z "${NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:-}" ]]; then
    maps_from_settings=""
    if [[ -n "${INTERNAL_API_ORIGIN:-}" ]]; then
      maps_from_settings="$(curl -sS --connect-timeout 3 --max-time 8 \
        "${INTERNAL_API_ORIGIN%/}/api/v1/site/public-config" 2>/dev/null \
        | sed -n 's/.*"google_maps_api_key"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' \
        | head -n1)"
    fi
    if [[ -n "$maps_from_settings" ]]; then
      ok "Google Maps anahtarı site ayarlarında (public-config); env opsiyonel"
    else
      warn "Google Maps: env boş ve public-config'te anahtar yok. Yönetim → Genel ayarlar (Harita) veya GOOGLE_MAPS_API_KEY env."
    fi
  fi
  ok "$WEB_SERVICE için gerekli env anahtarları tanımlı (frontend.env)"
}

check_backend_env() {
  local f="/etc/rezervasyonyap/backend.env"
  [[ -f "$f" ]] || warn "$f yok — CORS_ALLOWED_ORIGINS denetimi atlandı"
  if [[ -f "$f" ]]; then
    # shellcheck disable=SC1090
    set -a && source "$f" && set +a
    if [[ -z "${CORS_ALLOWED_ORIGINS:-}" ]]; then
      warn "CORS_ALLOWED_ORIGINS boş — üretimde yalnızca localhost origin'lerine credentials verilir. Örnek: CORS_ALLOWED_ORIGINS=https://rezervasyonyap.tr,https://www.rezervasyonyap.tr"
    else
      ok "CORS_ALLOWED_ORIGINS tanımlı (backend.env)"
    fi
  fi
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
  curl -sS -o /dev/null -w "%{http_code}" --connect-timeout 5 --max-time 25 "$url" 2>/dev/null || echo ""
}

# Yanlis pozitifleri engelle: yalnizca RFC benzeri 3 basamak kod (100-599).
is_valid_http_status() {
  local s="$1"
  [[ "$s" =~ ^[1-5][0-9]{2}$ ]]
}

wait_http_status() {
  local url="$1"
  local max_attempts="${2:-10}"
  local sleep_seconds="${3:-2}"
  local i=1 status
  while [[ "$i" -le "$max_attempts" ]]; do
    status="$(http_status "$url")"
    if is_valid_http_status "$status"; then
      echo "$status"
      return 0
    fi
    i=$((i + 1))
    sleep "$sleep_seconds"
  done
  echo ""
}

# deploy.sh restart sonrası Next bazen birkaç saniye içinde dinlemeye başlar; chunk testi önce bunu bekler.
wait_travel_web_listening() {
  local url="${WEB_ORIGIN}/"
  local max_attempts="${WEB_READY_ATTEMPTS:-45}"
  local sleep_seconds="${WEB_READY_SLEEP:-2}"
  local i=1 status
  echo "==> travel-web hazır ($WEB_ORIGIN, en fazla ~$((max_attempts * sleep_seconds)) sn) ..."
  while [[ "$i" -le "$max_attempts" ]]; do
    status="$(http_status "$url")"
    if is_valid_http_status "$status"; then
      ok "travel-web yanıt verdi (HTTP $status): $url"
      return 0
    fi
    echo "   bekleme $i/$max_attempts..."
    i=$((i + 1))
    sleep "$sleep_seconds"
  done
  fail "travel-web $WEB_ORIGIN üzerinde yanıt yok (connection refused?). Komutlar: journalctl -u travel-web.service -n 120 --no-pager; ss -tlnp | grep 3000 || true; systemctl status travel-web.service --no-pager"
}

check_next_static_chunk() {
  local wd sample url status rel url_path chunk_base attempts si j
  wd="$(systemctl show "$WEB_SERVICE" -p WorkingDirectory --value)"
  [[ -d "$wd/.next/static/chunks" ]] || fail "Missing $wd/.next/static/chunks - build or run wrong directory"
  sample="$(find "$wd/.next/static/chunks" -maxdepth 1 -type f -name '*.js' | sort | head -1)"
  [[ -n "$sample" ]] || fail "No *.js in $wd/.next/static/chunks"
  chunk_base="$(basename "$sample")"
  url="$WEB_ORIGIN/_next/static/chunks/$chunk_base"
  attempts="${CHUNK_VERIFY_ATTEMPTS:-25}"
  si="${CHUNK_VERIFY_SLEEP:-2}"
  j=1
  status=""
  while [[ "$j" -le "$attempts" ]]; do
    status="$(http_status "$url")"
    [[ "$status" == "200" ]] && break
    echo "   chunk bekleniyor $j/$attempts (${chunk_base}) HTTP=${status:-bos} ..."
    j=$((j + 1))
    sleep "$si"
  done
  [[ "$status" == "200" ]] || fail "Next static chunk must be 200: $url -> ${status:-bos} - Next henuz hazir degil (beklemeyi artirin: CHUNK_VERIFY_ATTEMPTS) veya cerceve/WAF"
  ok "Next static chunk OK, HTTP 200, file ${chunk_base}"

  # [locale] yolu - Plesk ModSecurity/Imunify bazen koseli parantez iceren URL 500 donebilir
  sample="$(find "$wd/.next/static/chunks/app" -type f -name 'layout-*.js' 2>/dev/null | sort | head -1 || true)"
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
    j=1
    status=""
    while [[ "$j" -le "$attempts" ]]; do
      status="$(http_status "$WEB_ORIGIN$url_path")"
      [[ "$status" == "200" ]] && break
      echo "   app chunk bekleniyor $j/$attempts HTTP=${status:-bos} ..."
      j=$((j + 1))
      sleep "$si"
    done
    [[ "$status" == "200" ]] || fail "Next app chunk must be 200: $WEB_ORIGIN$url_path -> ${status:-bos} - WAF: whitelist /_next/static or disable rule"
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
  step "komutlar kontrol ediliyor"
  require_cmd systemctl
  require_cmd curl

  step "servis durumlari"
  check_service_active "$WEB_SERVICE"
  check_service_active "$API_SERVICE"
  step "travel-web WorkingDirectory"
  check_working_directory
  step "frontend env"
  check_env
  step "backend env"
  check_backend_env
  step "deploy dizini ile systemd dizini"
  check_workdir_matches_deploy_root
  step "travel-web HTTP hazirlik"
  wait_travel_web_listening
  step "Next static chunk"
  check_next_static_chunk
  step "API ve Next endpointleri"
  check_endpoints

  ok "Deploy verification completed successfully"
}

main "$@"
