#!/usr/bin/env bash
# Runtime yükseltme: Node 25, PostgreSQL 18.4, Gleam 1.16, OTP 29
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
REBUILD="${REBUILD:-1}"
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
  [[ "$major" -ge 25 ]]
}

# Eski manuel kurulum: /usr/local/bin/node (v22) PATH'te /usr/bin/node (v25) önüne geçer.
fix_node_path_shadowing() {
  step "Node PATH düzeltme (/usr/local/bin gölgeleme)"
  local system_node=""
  for cand in /usr/bin/node /usr/bin/nodejs; do
    if [[ -x "$cand" ]]; then
      local maj
      maj="$("$cand" -v 2>/dev/null | sed 's/^v//' | cut -d. -f1)"
      if [[ "${maj:-0}" -ge 25 ]]; then
        system_node="$cand"
        break
      fi
    fi
  done
  if [[ -z "$system_node" ]]; then
    warn "/usr/bin/node Node 25+ degil — rpm kurulumu veya PATH kontrol edin"
    return 0
  fi
  local local_node="/usr/local/bin/node"
  if [[ -e "$local_node" || -L "$local_node" ]]; then
    local local_maj
    local_maj="$("$local_node" -v 2>/dev/null | sed 's/^v//' | cut -d. -f1)"
    if [[ "${local_maj:-0}" -lt 25 ]]; then
      local bak="${local_node}.bak.$(date +%Y%m%d%H%M%S)"
      mv "$local_node" "$bak" 2>/dev/null || rm -f "$local_node"
      ln -sf "$system_node" "$local_node"
      ok "Symlink: $local_node -> $system_node ($("$system_node" -v))"
    fi
  fi
  hash -r 2>/dev/null || true
  ok "Shell node: $(command -v node) $(node -v)"
  ok "travel-web ExecStart hedefi: /usr/bin/node $("/usr/bin/node" -v 2>/dev/null || echo '?')"
}

upgrade_node() {
  step "Node.js 25"
  if node_version_ok; then
    fix_node_path_shadowing
    ok "Node zaten uygun: $(node -v)"
    return 0
  fi
  # Plesk Alma/RHEL/CentOS: dnf/yum — deb script kullanmayin
  if command -v dnf >/dev/null 2>&1; then
    curl -fsSL https://rpm.nodesource.com/setup_25.x | bash -
    dnf install -y nodejs
  elif command -v yum >/dev/null 2>&1; then
    curl -fsSL https://rpm.nodesource.com/setup_25.x | bash -
    yum install -y nodejs
  elif command -v apt-get >/dev/null 2>&1; then
    curl -fsSL https://deb.nodesource.com/setup_25.x | bash -
    apt-get install -y nodejs
  else
    fail "Desteklenmeyen paket yöneticisi — Node 25'i elle kurun (dnf/yum/apt)"
  fi
  fix_node_path_shadowing
  if ! node_version_ok; then
    warn "PATH hâlâ eski node gösteriyor olabilir: which -a node; /usr/bin/node -v"
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
  elif command -v dnf >/dev/null 2>&1; then
    dnf install -y erlang || true
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
  if [[ "$REBUILD" != "1" ]]; then
    warn "REBUILD=0 — deploy atlandı"
    return 0
  fi
  step "Deploy (git pull + build)"
  cd "$APP_ROOT"
  chmod +x deploy/deploy.sh deploy/verify.sh 2>/dev/null || true
  ./deploy/deploy.sh
}

main() {
  require_root
  echo "APP_ROOT=$APP_ROOT"

  if [[ -d "$APP_ROOT/.git" ]]; then
    step "Git pull ($APP_ROOT)"
    git -C "$APP_ROOT" fetch origin main
    git -C "$APP_ROOT" pull --ff-only origin main || warn "git pull atlandi — elle kontrol edin"
  fi

  if command -v plesk >/dev/null 2>&1 && [[ "${UPGRADE_PG}" == "1" ]]; then
    warn "Plesk tespit edildi — PostgreSQL yukseltmesi Plesk panelinden yapilmali."
    warn "Devam icin: UPGRADE_PG=0 ./deploy/scripts/upgrade-runtime.sh"
    UPGRADE_PG=0
  fi

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
