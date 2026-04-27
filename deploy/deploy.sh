#!/usr/bin/env bash
# Production-safe tek komut deploy.
# Ilk kurulum:
#   chmod +x deploy/deploy.sh deploy/verify.sh
# Kullanim:
#   cd /opt/rezervasyonyap && ./deploy/deploy.sh
# Opsiyonel:
#   DEPLOY_REF=stable/b92d735 ./deploy/deploy.sh
#   DEPLOY_REF=main RESTART_API=0 ./deploy/deploy.sh
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_REF="${DEPLOY_REF:-stable/b92d735}"
RESTART_WEB="${RESTART_WEB:-1}"
RESTART_API="${RESTART_API:-1}"

ok() { echo "[OK] $*"; }
step() { echo; echo "==> $*"; }
fail() { echo "[FAIL] $*" >&2; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Eksik komut: $1"
}

git_sync_ref() {
  local ref="$1"
  git fetch origin "$ref"
  if git show-ref --verify --quiet "refs/remotes/origin/$ref"; then
    git checkout -B "$ref" "origin/$ref"
    git reset --hard "origin/$ref"
  else
    # tag / detached ref fallback
    git checkout --detach "$ref"
  fi
  # Sunucuda yanlislikla kalan lokal dosyalar pull/build bloklamasin.
  git clean -fd
}

main() {
  require_cmd git
  require_cmd npm
  require_cmd systemctl
  require_cmd curl

  cd "$APP_ROOT"

  step "Git ref senkronu ($DEPLOY_REF)"
  git_sync_ref "$DEPLOY_REF"
  ok "HEAD: $(git rev-parse --short HEAD)"

  step "Backend build"
  (cd "$APP_ROOT/backend" && gleam build)
  ok "backend build tamam"

  step "Frontend install + clean build"
  (cd "$APP_ROOT/frontend" && rm -rf .next && npm install && npm run build)
  ok "frontend build tamam"

  step "Servis restart"
  systemctl daemon-reload
  if [[ "$RESTART_API" == "1" ]]; then
    systemctl restart travel-api.service
  fi
  if [[ "$RESTART_WEB" == "1" ]]; then
    systemctl restart travel-web.service
  fi
  ok "servis restart tamam"

  step "Deploy dogrulama"
  bash "$APP_ROOT/deploy/verify.sh"
}

main "$@"
