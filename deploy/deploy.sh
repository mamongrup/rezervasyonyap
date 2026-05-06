#!/usr/bin/env bash
# Production-safe tek komut deploy.
# Ilk kurulum:
#   chmod +x deploy/deploy.sh deploy/verify.sh
# Kullanim:
#   cd /opt/rezervasyonyap && ./deploy/deploy.sh
# Opsiyonel:
#   DEPLOY_REF=stable/b92d735 ./deploy/deploy.sh
#   DEPLOY_REF=main RESTART_API=0 ./deploy/deploy.sh
#   TRAVEL_API_DEPLOY_LOCK=/run/travel-shipment.lock (flock dosyasi; varsayilan: APP_ROOT/.travel-deploy-shipment.lock)
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# Varsayılan: main. Eski stabil nokta: DEPLOY_REF=stable/b92d735
DEPLOY_REF="${DEPLOY_REF:-main}"
RESTART_WEB="${RESTART_WEB:-1}"
RESTART_API="${RESTART_API:-1}"

ok() { echo "[OK] $*"; }
step() { echo; echo "==> $*"; }
warn() { echo "[WARN] $*" >&2; }
fail() { echo "[FAIL] $*" >&2; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Eksik komut: $1"
}

sync_erlang_shipment_dir() {
  # rsync bazen kaynak agaci okurken dosya silinirse "vanished" (24) verir; tar tek akista kopyalar.
  # Paralel iki deploy hedefi/yarım kalmış kopyayi bozmasin diye flock ile seri hale getirilir.
  local ship="$1"
  local dest="$2"
  local lock="${TRAVEL_API_DEPLOY_LOCK:-$APP_ROOT/.travel-deploy-shipment.lock}"
  require_cmd tar
  mkdir -p "$dest"
  if command -v flock >/dev/null 2>&1; then
    (
      flock -w 7200 200 || exit 1
      find "$dest" -mindepth 1 -delete 2>/dev/null || find "$dest" -mindepth 1 -exec rm -rf -- {} +
      (cd "$ship" && tar -cf - .) | (cd "$dest" && tar -xpf -)
    ) 200>"$lock" || fail "shipment flock/kopya basarisiz"
  else
    warn "flock yok — paralel deploy sirasinda shipment bozulabilir; util-linux kurun."
    find "$dest" -mindepth 1 -delete 2>/dev/null || find "$dest" -mindepth 1 -exec rm -rf -- {} +
    (cd "$ship" && tar -cf - .) | (cd "$dest" && tar -xpf -)
  fi
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
  # Panel yüklemeleri `frontend/public/uploads/` genelde .gitignore'da; `git clean -fd`
  # normalde ignored içeriği silmez. Yanlislikla `clean -x` veya farkli bir kurulumda
  # veri kaybini önlemek için uploads kökünü acikça disliyoruz.
  git clean -fd --exclude=frontend/public/uploads/
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

  if [[ -f "$APP_ROOT/deploy/scripts/ai-worker-run-steps.sh" ]]; then
    chmod +x "$APP_ROOT/deploy/scripts/ai-worker-run-steps.sh" || true
  fi

  step "Backend build + Erlang shipment"
  # travel-api.service genelde httpdocs DIŞINDA bir WorkingDirectory kullanır (ör. /opt/.../erlang-shipment).
  # Yalnızca `gleam build` yapılırsa servis ESKİ beam dosyalarıyla çalışmaya devam eder — deploy bomboş kalır.
  (
    cd "$APP_ROOT/backend"
    gleam build
    gleam export erlang-shipment
  )
  SHIP="$APP_ROOT/backend/build/erlang-shipment"
  [[ -d "$SHIP" ]] || fail "Erlang shipment yok: $SHIP — gleam export erlang-shipment başarısız (gleam sürümü, Hex/Rebar)."
  UNIT_WD="$(systemctl show travel-api.service -p WorkingDirectory --value 2>/dev/null || true)"
  if [[ -n "${TRAVEL_API_SHIP_DEST_OVERRIDE:-}" ]]; then
    UNIT_WD="$TRAVEL_API_SHIP_DEST_OVERRIDE"
  fi
  if [[ "${SKIP_TRAVEL_API_SHIP_SYNC:-0}" == "1" ]]; then
    warn "SKIP_TRAVEL_API_SHIP_SYNC=1 — shipment systemd hedefine kopyalanmadı."
  elif [[ -z "$UNIT_WD" ]]; then
    warn "travel-api WorkingDirectory okunamadı — shipment senkronu atlandı. systemd birimini kontrol edin."
  elif [[ "$SHIP" == "$UNIT_WD" ]]; then
    ok "travel-api WorkingDirectory zaten httpdocs shipment ile aynı"
  else
    step "travel-api shipment senkronu → $UNIT_WD"
    sync_erlang_shipment_dir "$SHIP" "$UNIT_WD"
    ok "shipment senkronu tamam"
  fi
  ok "backend build tamam"

  step "Frontend install + clean build"
  # NEXT_PUBLIC_* build sirasinda gomulur; ayni env travel-web.service ile tanimli olmali.
  if [[ -f /etc/rezervasyonyap/frontend.env ]]; then
    set -a
    # shellcheck disable=SC1091
    source /etc/rezervasyonyap/frontend.env
    set +a
  fi
  (cd "$APP_ROOT/frontend" && rm -rf .next node_modules && npm ci && npm run build)
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
  VERIFY_REPO_FRONTEND="$APP_ROOT/frontend" bash "$APP_ROOT/deploy/verify.sh"
}

main "$@"
