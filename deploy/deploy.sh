#!/usr/bin/env bash
# Production-safe tek komut deploy.
# Ilk kurulum:
#   chmod +x deploy/deploy.sh deploy/verify.sh
# Kullanim:
#   cd /opt/rezervasyonyap && ./deploy/deploy.sh
# Opsiyonel:
#   DEPLOY_REF=stable/b92d735 ./deploy/deploy.sh
#   DEPLOY_REF=main RESTART_API=0 ./deploy/deploy.sh
#   SKIP_FRONTEND_BUILD=1 ./deploy/deploy.sh                  # yalniz API (~5 dk)
#   SKIP_BACKEND_BUILD=1 ./deploy/deploy.sh                   # yalniz frontend (~15 dk, node_modules aynıysa ~5 dk)
#   SKIP_BACKEND_BUILD=1 FORCE_NPM_CI=0 ./deploy/deploy.sh   # frontend, node_modules koru (~5 dk)
#   SKIP_VERIFY=1 ./deploy/deploy.sh                          # verify bekleme atlanir
#   SKIP_DB_CONN_GUARD=1 ./deploy/deploy.sh                   # PostgreSQL orphan bağlantı temizliğini atla
#   TRAVEL_DB_CONN_THRESHOLD=30 ./deploy/deploy.sh             # bağlantı guard eşiği
#   FORCE_NPM_CI=1 ./deploy/deploy.sh                         # node_modules'u zorla yenile
#   ./deploy/deploy-api-only.sh                               # API-only kisa yol
#   ./deploy/deploy-detached.sh                               # SSH kopunca da devam (nohup/setsid)
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

# travel-api WorkingDirectory yanlis ayarlanmissa (ornekle .../backend), find -delete tum kaynak agaci siler.
refuse_unsafe_shipment_dest() {
  local ship="$1"
  local dest="$2"
  local ship_abs dest_abs
  ship_abs="$(cd "$ship" && pwd -P)"
  mkdir -p "$dest"
  dest_abs="$(cd "$dest" && pwd -P)"
  if [[ "$ship_abs" == "$dest_abs/"* ]]; then
    fail "travel-api WorkingDirectory ($dest_abs), Erlang shipment dizininin ($ship_abs) UST klasoru — senkron once kaynak tree'yi siler.

Dogru ornek: WorkingDirectory=.../backend/build/erlang-shipment (entrypoint.sh ayni kok).
Sunucuda: systemctl cat travel-api.service | grep WorkingDirectory
Gecici: TRAVEL_API_SHIP_DEST_OVERRIDE=/tam/yol/backend/build/erlang-shipment ./deploy/deploy.sh"
  fi
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
  # Izlenen dosyadaki commitlenmemis degisiklikler checkout'u durdurur (ornek:
  # `frontend/public/page-builder/homepage.json`). `git clean` bunlari silmez.
  # GIT_SYNC_KEEP_LOCAL=1 ile bu adimi atlayip elle stash/commit yapabilirsiniz.
  if [[ "${GIT_SYNC_KEEP_LOCAL:-0}" != "1" ]]; then
    git reset --hard HEAD
    # Sunucuda `npm audit fix` vb. ile kirlenen kilidi checkout bloklamasin (skip-worktree ise coz).
    git update-index --no-skip-worktree frontend/package-lock.json 2>/dev/null || true
    git update-index --no-skip-worktree frontend/package.json 2>/dev/null || true
    git checkout HEAD -- frontend/package-lock.json frontend/package.json 2>/dev/null \
      || git restore --source=HEAD --staged --worktree frontend/package-lock.json frontend/package.json 2>/dev/null \
      || true
    # Onceki deploy'dan kalan izlenmeyen script dosyalari `git checkout`i bloklar
    # (ornek: scripts/debug-hotel-book.mjs). Checkout oncesi temizle.
    git clean -fd \
      --exclude=frontend/public/uploads/ \
      --exclude=frontend/.env.local \
      --exclude=frontend/.env.development.local \
      --exclude=frontend/.env.production.local \
      --exclude=frontend/.env
  else
    warn "GIT_SYNC_KEEP_LOCAL=1 — yerel degisiklikler korunuyor; checkout takilirsa stash/commit yapin."
  fi
  if git show-ref --verify --quiet "refs/remotes/origin/$ref"; then
    git checkout -B "$ref" "origin/$ref"
    git reset --hard "origin/$ref"
  else
    # tag / detached ref fallback
    git checkout --detach "$ref"
  fi
  # Checkout sonrasi kalan izlenmeyen dosyalar (or. test loglari).
  git clean -fd \
    --exclude=frontend/public/uploads/ \
    --exclude=frontend/.env.local \
    --exclude=frontend/.env.development.local \
    --exclude=frontend/.env.production.local \
    --exclude=frontend/.env
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

  # Uploads dizini gitignored — ilk deploy veya git clean sonrası yoksa oluştur.
  mkdir -p "$APP_ROOT/frontend/public/uploads/general/hero"
  mkdir -p "$APP_ROOT/frontend/public/uploads/site/page-builder/kategori-kartlari"
  mkdir -p "$APP_ROOT/frontend/public/uploads/listings"
  mkdir -p "$APP_ROOT/frontend/public/uploads/regions"
  mkdir -p "$APP_ROOT/frontend/public/uploads/branding"
  ok "uploads dizinleri hazır"

  if [[ -f "$APP_ROOT/deploy/scripts/ai-worker-run-steps.sh" ]]; then
    chmod +x "$APP_ROOT/deploy/scripts/ai-worker-run-steps.sh" || true
  fi
  chmod +x "$APP_ROOT/deploy/deploy-api-only.sh" 2>/dev/null || true

  step "Backend build + Erlang shipment"
  # travel-api.service genelde httpdocs DIŞINDA bir WorkingDirectory kullanır (ör. /opt/.../erlang-shipment).
  # Yalnızca `gleam build` yapılırsa servis ESKİ beam dosyalarıyla çalışmaya devam eder — deploy bomboş kalır.
  SKIP_BACKEND_BUILD="${SKIP_BACKEND_BUILD:-0}"
  if [[ "$SKIP_BACKEND_BUILD" == "1" ]]; then
    warn "SKIP_BACKEND_BUILD=1 — backend build atlandı (mevcut shipment kullanılır)."
  else
  (
    cd "$APP_ROOT/backend"
    gleam build
    gleam export erlang-shipment
  )
  fi
  SHIP="$APP_ROOT/backend/build/erlang-shipment"
  if [[ "$SKIP_BACKEND_BUILD" != "1" ]]; then
    [[ -d "$SHIP" ]] || fail "Erlang shipment yok: $SHIP — gleam export erlang-shipment başarısız (gleam sürümü, Hex/Rebar)."
  fi
  SHIP_ABS="$(cd "$SHIP" && pwd -P)"
  UNIT_WD="$(systemctl show travel-api.service -p WorkingDirectory --value 2>/dev/null || true)"
  if [[ -n "${TRAVEL_API_SHIP_DEST_OVERRIDE:-}" ]]; then
    UNIT_WD="$TRAVEL_API_SHIP_DEST_OVERRIDE"
  fi
  if [[ "${SKIP_TRAVEL_API_SHIP_SYNC:-0}" == "1" ]]; then
    warn "SKIP_TRAVEL_API_SHIP_SYNC=1 — shipment systemd hedefine kopyalanmadı."
  elif [[ -z "$UNIT_WD" ]]; then
    warn "travel-api WorkingDirectory okunamadı — shipment senkronu atlandı. systemd birimini kontrol edin."
  else
    mkdir -p "$UNIT_WD"
    UNIT_ABS="$(cd "$UNIT_WD" && pwd -P)"
    if [[ "$SHIP_ABS" == "$UNIT_ABS" ]]; then
      ok "travel-api WorkingDirectory zaten httpdocs shipment ile aynı ($SHIP_ABS)"
    else
      refuse_unsafe_shipment_dest "$SHIP" "$UNIT_WD"
      step "travel-api shipment senkronu → $UNIT_ABS"
      sync_erlang_shipment_dir "$SHIP" "$UNIT_WD"
      ok "shipment senkronu tamam"
    fi
  fi
  ok "backend build tamam"

  step "Frontend install + clean build"
  if [[ "${SKIP_FRONTEND_BUILD:-0}" == "1" ]]; then
    warn "SKIP_FRONTEND_BUILD=1 — frontend npm ci/build atlandı (mevcut .next kullanılır)."
  else
  # NEXT_PUBLIC_* build sirasinda gomulur; ayni env travel-web.service ile tanimli olmali.
  if [[ -f /etc/rezervasyonyap/frontend.env ]]; then
    set -a
    # shellcheck disable=SC1091
    source /etc/rezervasyonyap/frontend.env
    set +a
  fi
  # Küçük VPS: ENOMEM önlemek için NEXT_NODE_HEAP_MB=3072 (veya 4G swap) — deploy/PLESK_VITRIN.md
  export NEXT_NODE_HEAP_MB="${NEXT_NODE_HEAP_MB:-4096}"

  (
    cd "$APP_ROOT/frontend"

    # --- Akıllı npm ci: package-lock.json değişmediyse node_modules'u koru (10-20 dk kazanır) ---
    LOCK_HASH_FILE="$APP_ROOT/.deploy-npm-lock-hash"
    LOCK_CURRENT="$(md5sum package-lock.json 2>/dev/null | cut -d' ' -f1 || echo "none")"
    LOCK_PREV="$(cat "$LOCK_HASH_FILE" 2>/dev/null || echo "")"
    FORCE_NPM_CI="${FORCE_NPM_CI:-0}"

    if [[ "$LOCK_CURRENT" != "$LOCK_PREV" ]] || [[ ! -d node_modules ]] || [[ "$FORCE_NPM_CI" == "1" ]]; then
      echo "[deploy] package-lock.json değişti veya node_modules yok — npm ci çalıştırılıyor..."
      rm -rf node_modules
      npm ci
      echo "$LOCK_CURRENT" > "$LOCK_HASH_FILE"
      ok "npm ci tamam"
    else
      echo "[deploy] package-lock.json aynı — node_modules korundu (npm ci atlandı)"
    fi

    NEXT_VER="$(node -p "require('next/package.json').version" 2>/dev/null || echo unknown)"
    echo "[deploy] next@${NEXT_VER} (HEAD $(git -C "$APP_ROOT" rev-parse --short HEAD))"
    case "$NEXT_VER" in
      16.*|17.*) ;;
      *)
        fail "Beklenen Next.js 16.x; kurulu: ${NEXT_VER}. git pull origin main && npm ci — eski httpdocs klonu olabilir."
        ;;
    esac

    # Çalışan next start .next/cache dosyalarını kilitler; build öncesi durdur.
    WEB_STOPPED_FOR_BUILD=0
    if systemctl is-active --quiet travel-web.service 2>/dev/null; then
      systemctl stop travel-web.service
      WEB_STOPPED_FOR_BUILD=1
      ok "travel-web durduruldu (build için)"
    fi

    rm -rf .next
    npm run build
    npm prune --omit=dev

    if [[ "$WEB_STOPPED_FOR_BUILD" == "1" ]] && [[ "${RESTART_WEB}" != "1" ]]; then
      systemctl start travel-web.service
      ok "travel-web yeniden baslatildi (RESTART_WEB=0)"
    fi
  )
  ok "frontend build tamam"
  fi

  step "Servis restart"
  systemctl daemon-reload
  if [[ "$RESTART_API" == "1" ]]; then
    systemctl restart travel-api.service
  fi
  if [[ "$RESTART_WEB" == "1" ]]; then
    systemctl restart travel-web.service
  fi
  ok "servis restart tamam"

  if [[ "${SKIP_DB_CONN_GUARD:-0}" == "1" ]]; then
    warn "SKIP_DB_CONN_GUARD=1 — PostgreSQL bağlantı guard atlandı."
  elif [[ -f "$APP_ROOT/deploy/scripts/guard-postgres-connections.sh" ]]; then
    step "PostgreSQL bağlantı guard"
    sleep "${DB_CONN_GUARD_SLEEP:-6}"
    bash "$APP_ROOT/deploy/scripts/guard-postgres-connections.sh" || warn "PostgreSQL bağlantı guard tamamlanamadı; verify/log kontrol edin."
  else
    warn "PostgreSQL bağlantı guard script yok."
  fi

  if [[ "${SKIP_VERIFY:-0}" == "1" ]]; then
    warn "SKIP_VERIFY=1 — verify.sh atlandi (API curl testini elle yapin)."
  else
    step "Deploy dogrulama"
    VERIFY_TIMEOUT_SECONDS="${VERIFY_TIMEOUT_SECONDS:-180}"
    if command -v timeout >/dev/null 2>&1; then
      VERIFY_REPO_FRONTEND="$APP_ROOT/frontend" timeout "$VERIFY_TIMEOUT_SECONDS" bash "$APP_ROOT/deploy/verify.sh" \
        || fail "deploy verify başarısız veya ${VERIFY_TIMEOUT_SECONDS}s içinde tamamlanmadı. Log: tail -n 120 .deploy/travel-deploy.log"
    else
      warn "timeout komutu yok — verify süre sınırı olmadan çalışacak."
      VERIFY_REPO_FRONTEND="$APP_ROOT/frontend" bash "$APP_ROOT/deploy/verify.sh"
    fi
  fi
}

main "$@"
