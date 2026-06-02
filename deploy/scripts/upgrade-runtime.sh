#!/usr/bin/env bash
# Runtime yükseltme: Node 24, PostgreSQL 18.4, Gleam 1.16, OTP 29
# root veya sudo ile çalıştırın.
#
#   chmod +x deploy/scripts/upgrade-runtime.sh
#   sudo ./deploy/scripts/upgrade-runtime.sh
#
# Opsiyonel: UPGRADE_NODE=0 UPGRADE_PG=0 (sadece Gleam/OTP)
set -euo pipefail

UPGRADE_NODE="${UPGRADE_NODE:-1}"
UPGRADE_PG="${UPGRADE_PG:-1}"
UPGRADE_GLEAM="${UPGRADE_GLEAM:-1}"
APP_ROOT="${APP_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"

ok() { echo "[OK] $*"; }
step() { echo; echo "==> $*"; }
warn() { echo "[WARN] $*" >&2; }
fail() { echo "[FAIL] $*" >&2; exit 1; }

require_root() {
  if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
    fail "root veya sudo gerekli"
  fi
}

node_version_ok() {
  local v
  v="$(node -v 2>/dev/null | sed 's/^v//')"
  [[ -n "$v" ]] || return 1
  local major minor patch
  major="${v%%.*}"
  minor="$(echo "$v" | cut -d. -f2)"
  patch="$(echo "$v" | cut -d. -f3)"
  [[ "$major" -ge 24 ]] && [[ "$minor" -ge 14 || "$major" -gt 24 ]]
}

upgrade_node() {
  step "Node.js 24 LTS"
  if node_version_ok; then
    ok "Node zaten uygun: $(node -v)"
    return 0
  fi
  if command -v apt-get >/dev/null 2>&1; then
    curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
    apt-get install -y nodejs
  elif command -v dnf >/dev/null 2>&1; then
    curl -fsSL https://rpm.nodesource.com/setup_24.x | bash -
    dnf install -y nodejs
  else
    fail "Desteklenmeyen paket yöneticisi — Node 24'ü elle kurun"
  fi
  ok "Node: $(node -v) npm: $(npm -v)"
}

pg_version_ok() {
  local v
  v="$(psql --version 2>/dev/null | awk '{print $3}' || true)"
  [[ "$v" == 18.* ]] || return 1
  local minor
  minor="$(echo "$v" | cut -d. -f2)"
  [[ "$minor" -ge 4 ]]
}

upgrade_postgresql() {
  step "PostgreSQL 18.4 (minor upgrade)"
  if pg_version_ok; then
    ok "PostgreSQL zaten uygun: $(psql --version)"
    return 0
  fi
  warn "Major upgrade gerekebilir — önce pg_dump alın"
  if command -v apt-get >/dev/null 2>&1; then
    apt-get update
    apt-get install -y postgresql-18 postgresql-client-18 || apt-get install -y postgresql postgresql-client
  elif command -v dnf >/dev/null 2>&1; then
    dnf install -y postgresql18-server postgresql18 || dnf install -y postgresql-server postgresql
  else
    fail "PostgreSQL upgrade — Plesk panel veya distro dokümantasyonunu kullanın"
  fi
  systemctl restart postgresql 2>/dev/null || systemctl restart postgresql-18 2>/dev/null || true
  ok "PostgreSQL: $(psql --version 2>/dev/null || echo 'psql bulunamadı — PATH kontrol edin')"
}

gleam_version_ok() {
  local v
  v="$(gleam --version 2>/dev/null | awk '{print $2}' || true)"
  [[ -n "$v" ]] || return 1
  local major minor
  major="${v%%.*}"
  minor="$(echo "$v" | cut -d. -f2)"
  [[ "$major" -ge 1 && "$minor" -ge 16 ]]
}

otp_version_ok() {
  local rel
  rel="$(erl -eval 'erlang:display(erlang:system_info(otp_release)), halt().' -noshell 2>/dev/null | tr -d '"')"
  [[ -n "$rel" ]] && [[ "$rel" -ge 28 ]]
}

upgrade_gleam_otp() {
  step "Gleam 1.16 + Erlang OTP 29"
  if gleam_version_ok && otp_version_ok; then
    ok "Gleam: $(gleam --version) OTP: $(erl -eval 'erlang:display(erlang:system_info(otp_release)), halt().' -noshell 2>/dev/null | tr -d '"')"
    return 0
  fi
  if command -v apt-get >/dev/null 2>&1; then
    apt-get update
    apt-get install -y erlang-nox erlang-dev || apt-get install -y erlang
    if ! command -v gleam >/dev/null 2>&1 || ! gleam_version_ok; then
      GLEAM_VERSION="1.16.0"
      tmp="$(mktemp -d)"
      curl -fsSL "https://github.com/gleam-lang/gleam/releases/download/v${GLEAM_VERSION}/gleam-${GLEAM_VERSION}-x86_64-unknown-linux-musl.tar.gz" \
        | tar -xz -C "$tmp"
      install -m 755 "$tmp/gleam" /usr/local/bin/gleam
      rm -rf "$tmp"
    fi
  else
    warn "Gleam/OTP — asdf, kerl veya distro paketleriyle kurun (hedef: Gleam 1.16, OTP 29)"
  fi
  ok "Gleam: $(gleam --version 2>/dev/null || echo '?') OTP: $(erl -eval 'erlang:display(erlang:system_info(otp_release)), halt().' -noshell 2>/dev/null | tr -d '"' || echo '?')"
}

rebuild_app() {
  step "Deploy (git pull + build)"
  cd "$APP_ROOT"
  chmod +x deploy/deploy.sh deploy/verify.sh 2>/dev/null || true
  ./deploy/deploy.sh
}

main() {
  require_root
  echo "APP_ROOT=$APP_ROOT"
  [[ "$UPGRADE_NODE" == "1" ]] && upgrade_node
  [[ "$UPGRADE_PG" == "1" ]] && upgrade_postgresql
  [[ "$UPGRADE_GLEAM" == "1" ]] && upgrade_gleam_otp
  rebuild_app
  step "Doğrulama"
  node -v
  psql --version 2>/dev/null || true
  gleam --version 2>/dev/null || true
  erl -eval 'erlang:display(erlang:system_info(otp_release)), halt().' -noshell 2>/dev/null || true
  ok "Runtime upgrade tamamlandı"
}

main "$@"
