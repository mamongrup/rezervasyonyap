#!/usr/bin/env bash
# Plesk vitrin: tek komut — repoyu main ile birebir eşitler, temiz kurulum + build, travel-web restart.
# Sunucuda bu repoyu BİR deploy kopyası olarak kullanın; bu dizinde elle dosya düzenlemeyin.
#
# Kullanım (repo kökü = httpdocs):
#   chmod +x deploy/plesk-vitrin-deploy.sh
#   sudo ./deploy/plesk-vitrin-deploy.sh
#
# İsteğe bağlı ortam değişkenleri:
#   REPO_ROOT=/var/www/vhosts/alanadi.tr/httpdocs
#   GIT_BRANCH=main
#   WEB_SERVICE=travel-web.service
#   SKIP_GLIBC_CHECK=1   (sadece ne yaptığınızı biliyorsanız)

set -euo pipefail

REPO_ROOT="${REPO_ROOT:-/var/www/vhosts/rezervasyonyap.tr/httpdocs}"
GIT_BRANCH="${GIT_BRANCH:-main}"
WEB_SERVICE="${WEB_SERVICE:-travel-web.service}"
FRONTEND_DIR="$REPO_ROOT/frontend"

ok() { echo "[ok] $*"; }
step() { echo ""; echo "==> $*"; }
fail() { echo "[HATA] $*" >&2; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Gerekli komut yok: $1 (kurun veya PATH kontrol edin)"
}

glibc_check() {
  if [[ "${SKIP_GLIBC_CHECK:-0}" == "1" ]]; then
    echo "[!] GLIBC kontrolü atlandı (SKIP_GLIBC_CHECK=1)"
    return 0
  fi
  if ! command -v ldd >/dev/null 2>&1; then
    echo "[!] ldd yok, GLIBC sürümü kontrol edilemedi"
    return 0
  fi
  # örnek çıktı: ldd (GNU libc) 2.28
  local ver
  ver="$(ldd --version 2>/dev/null | head -1 | tr -cd '0-9.\n' | head -c 20 || true)"
  if [[ -z "$ver" ]]; then
    return 0
  fi
  local major minor
  IFS='.' read -r major minor _ <<< "${ver//[^0-9.]/}"
  major="${major:-0}"
  minor="${minor:-0}"
  if (( major < 2 )) || { (( major == 2 )) && (( minor < 29 )); }; then
    echo ""
    echo "----------------------------------------------------------------"
    echo "  UYARI: Sistem glibc sürümü Next.js SWC ikilileri için çok eski."
    echo "  (ldd --version ile görünen GLIBC 2.29+ olması beklenir.)"
    echo "  Derleme WASM ile sürebilir veya kırılgan olabilir."
    echo "  Kalıcı çözüm: işletim sistemi yükseltme veya Docker / CI build."
    echo "----------------------------------------------------------------"
    echo ""
  else
    ok "GLIBC (ldd) yeterli görünüyor: $(ldd --version 2>/dev/null | head -1)"
  fi
}

main() {
  require_cmd git
  require_cmd npm
  require_cmd systemctl
  require_cmd curl

  step "Kontroller"
  if [[ ! -d "$REPO_ROOT/.git" ]]; then
    fail "Git deposu değil: $REPO_ROOT (REPO_ROOT yanlış olabilir)"
  fi
  if [[ ! -f "$FRONTEND_DIR/package.json" ]]; then
    fail "frontend/package.json yok: $FRONTEND_DIR"
  fi

  require_cmd node
  echo "    Node: $(node -v)"
  glibc_check

  cd "$REPO_ROOT"

  step "Git: origin/$GIT_BRANCH ile tam eşitleme (sunucudaki yerel değişiklikler silinir)"
  git fetch origin
  if ! git show-ref --verify --quiet "refs/remotes/origin/$GIT_BRANCH"; then
    fail "Uzak dal yok: origin/$GIT_BRANCH — git remote / branch adını kontrol edin"
  fi
  git checkout -B "$GIT_BRANCH" "origin/$GIT_BRANCH"
  git reset --hard "origin/$GIT_BRANCH"
  ok "HEAD $(git rev-parse --short HEAD) — $(git log -1 --oneline)"

  step "Frontend: temiz kurulum ve production build"
  cd "$FRONTEND_DIR"
  rm -rf node_modules .next
  npm ci
  npm run build

  step "Servis: $WEB_SERVICE"
  systemctl restart "$WEB_SERVICE"
  systemctl is-active "$WEB_SERVICE" || fail "Servis aktif değil: $WEB_SERVICE"

  step "Yerel kontrol"
  curl -sI "http://127.0.0.1:3000/" | head -n 5 || true

  ok "Bitti. Tarayıcıda Ctrl+Shift+R ile yenileyin."
}

main "$@"
