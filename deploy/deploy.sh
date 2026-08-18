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
#   SKIP_AI_SOCIAL_KICK=1 ./deploy/deploy.sh                  # AI/sosyal anlık tetik atla
#   SYNC_AI_SOCIAL_KICK=1 ./deploy/deploy.sh                  # (eski) AI worker senkron — yavaş
#   SKIP_VERIFY=1 ./deploy/deploy.sh                          # verify bekleme atlanir
#   SKIP_SOCIAL_WORKER_TIMER=1 ./deploy/deploy.sh             # sosyal paylaşım worker timer kurulumunu atla
#   SKIP_DB_CONN_GUARD=1 ./deploy/deploy.sh                   # PostgreSQL orphan bağlantı temizliğini atla
#   SKIP_AI_OPERATIONS_SCHEMA=1 ./deploy/deploy.sh             # AI operasyon amiri SQL modülünü atla
#   SKIP_AI_CONTINUOUS_PRODUCTION=1 ./deploy/deploy.sh         # 376 müdür/kadrosu aktivasyonunu atla
#   SKIP_MULTIDOMAIN_ENV=1 ./deploy/deploy.sh                 # çoklu domain frontend env güncellemesini atla
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

# nohup / arka plan TTY altında Erlang prim_tty reader_loop EBADF çökmesini önle
export ERL_FLAGS="-noshell -noinput ${ERL_FLAGS:-}"
export TERM="${TERM:-dumb}"

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
  # Branch adini (cursor/foo gibi) her zaman refs/remotes/origin/<ref> olarak yaz —
  # aksi halde show-ref basarisiz olup `checkout --detach cursor/foo` path sanilir.
  if ! git fetch origin "+refs/heads/${ref}:refs/remotes/origin/${ref}"; then
    git fetch origin "$ref" || git fetch origin "tag" "$ref" || fail "git fetch origin $ref basarisiz"
  fi
  # Izlenen dosyadaki commitlenmemis degisiklikler checkout'u durdurur (ornek:
  # `frontend/public/page-builder/homepage.json`). Panel CMS yedegi main()'de
  # preserve_cms_json_* ile korunur; `git clean` uploads disinda siler.
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
    # uploads/** mutlaka korunmalı — eski `uploads/` exclude alt dosyaları silip
    # rehost edilmiş AVIF'leri yok ediyordu (DB yerel yol, disk 404 → gri kart).
    git clean -fd \
      -e 'frontend/public/uploads' \
      -e 'frontend/public/uploads/**' \
      -e 'frontend/.env.local' \
      -e 'frontend/.env.development.local' \
      -e 'frontend/.env.production.local' \
      -e 'frontend/.env'
  else
    warn "GIT_SYNC_KEEP_LOCAL=1 — yerel degisiklikler korunuyor; checkout takilirsa stash/commit yapin."
  fi
  if git show-ref --verify --quiet "refs/remotes/origin/$ref"; then
    git checkout -B "$ref" "origin/$ref"
    git reset --hard "origin/$ref"
  else
    # tag / SHA fallback — path gibi gorunen ref adlarini --detach'e verme
    local sha
    sha="$(git rev-parse --verify "refs/tags/${ref}^{commit}" 2>/dev/null \
      || git rev-parse --verify "${ref}^{commit}" 2>/dev/null \
      || true)"
    [[ -n "$sha" ]] || fail "ref bulunamadi: $ref (origin/$ref yok)"
    git checkout --detach "$sha"
  fi
  # Checkout sonrasi kalan izlenmeyen dosyalar (or. test loglari).
  git clean -fd \
    -e 'frontend/public/uploads' \
    -e 'frontend/public/uploads/**' \
    -e 'frontend/.env.local' \
    -e 'frontend/.env.development.local' \
    -e 'frontend/.env.production.local' \
    -e 'frontend/.env'
}

main() {
  require_cmd git
  require_cmd npm
  require_cmd systemctl
  require_cmd curl

  cd "$APP_ROOT"

  # Panel CMS (page-builder + featured-listings) git’e commit edilmez; reset --hard
  # silmesin diye yedekle → sync → geri yükle. Kapat: CMS_JSON_PRESERVE=0
  # Zorla repo sürümü: CMS_JSON_PRESERVE=0
  # shellcheck source=deploy/scripts/preserve-cms-json.sh
  # shellcheck disable=SC1091
  source "$APP_ROOT/deploy/scripts/preserve-cms-json.sh"
  chmod +x "$APP_ROOT/deploy/scripts/preserve-cms-json.sh" 2>/dev/null || true
  preserve_cms_json_backup "$APP_ROOT"

  step "Git ref senkronu ($DEPLOY_REF)"
  git_sync_ref "$DEPLOY_REF"
  ok "HEAD: $(git rev-parse --short HEAD)"

  restore_cms_json_backup "$APP_ROOT"

  # Uploads dizini gitignored — ilk deploy veya git clean sonrası yoksa oluştur.
  mkdir -p "$APP_ROOT/frontend/public/uploads/general/hero"
  mkdir -p "$APP_ROOT/frontend/public/uploads/site/page-builder/kategori-kartlari"
  mkdir -p "$APP_ROOT/frontend/public/uploads/listings"
  mkdir -p "$APP_ROOT/frontend/public/uploads/regions"
  mkdir -p "$APP_ROOT/frontend/public/uploads/branding"
  ok "uploads dizinleri hazır"

  chmod +x "$APP_ROOT/deploy/deploy.sh" "$APP_ROOT/deploy/verify.sh" 2>/dev/null || true
  chmod +x "$APP_ROOT/deploy/deploy-detached.sh" "$APP_ROOT/deploy/deploy-api-only.sh" 2>/dev/null || true
  chmod +x "$APP_ROOT/deploy/apply-sql.sh" 2>/dev/null || true
  if [[ -d "$APP_ROOT/deploy/scripts" ]]; then
    chmod +x "$APP_ROOT/deploy/scripts/"*.sh 2>/dev/null || true
  fi
  if [[ -f "$APP_ROOT/deploy/scripts/ai-worker-run-steps.sh" ]]; then
    chmod +x "$APP_ROOT/deploy/scripts/ai-worker-run-steps.sh" || true
  fi
  if [[ -f "$APP_ROOT/deploy/scripts/social-process-pending.sh" ]]; then
    chmod +x "$APP_ROOT/deploy/scripts/social-process-pending.sh" || true
  fi
  chmod +x "$APP_ROOT/deploy/deploy-api-only.sh" 2>/dev/null || true

  if [[ "${SKIP_MULTIDOMAIN_ENV:-0}" == "1" ]]; then
    warn "SKIP_MULTIDOMAIN_ENV=1 — çoklu domain frontend env güncellemesi atlandı."
  elif [[ -f "$APP_ROOT/deploy/scripts/ensure-multidomain-frontend-env.sh" ]]; then
    step "Çoklu domain ve uluslararası dil ortam ayarları"
    bash "$APP_ROOT/deploy/scripts/ensure-multidomain-frontend-env.sh"
  else
    fail "Çoklu domain env hazırlama scripti bulunamadı."
  fi

  step "Backend build + Erlang shipment"
  # travel-api.service genelde httpdocs DIŞINDA bir WorkingDirectory kullanır (ör. /opt/.../erlang-shipment).
  # Yalnızca `gleam build` yapılırsa servis ESKİ beam dosyalarıyla çalışmaya devam eder — deploy bomboş kalır.
  SKIP_BACKEND_BUILD="${SKIP_BACKEND_BUILD:-0}"
  if [[ "$SKIP_BACKEND_BUILD" == "1" ]]; then
    warn "SKIP_BACKEND_BUILD=1 — backend build atlandı (mevcut shipment kullanılır)."
  else
  (
    cd "$APP_ROOT/backend"
    export ERL_FLAGS="-noshell -noinput ${ERL_FLAGS:-}"
    # Askıda kalan eski gleam/rebar3 işlemlerini sonlandır ve kilit dosyalarını temizle
    killall -9 rebar3 2>/dev/null || true
    rm -f build/.lock build/gleam.lock build/dev/.lock 2>/dev/null || true
    # Yarım kalan derlemeler Gleam'in hedef bazlı kilitlerini bırakabiliyor
    # (`gleam-dev-erlang.lock`, `gleam-prod-javascript.lock` vb.).
    find build -maxdepth 1 -type f -name 'gleam-*.lock' -delete 2>/dev/null || true
    timeout 15m gleam build < /dev/null
    timeout 10m gleam export erlang-shipment < /dev/null
  )
  fi
  SHIP="$APP_ROOT/backend/build/erlang-shipment"
  if [[ "$SKIP_BACKEND_BUILD" == "1" ]]; then
    # Frontend-only deploy'da httpdocs altında shipment bulunması gerekmez; çalışan
    # API systemd WorkingDirectory'sindeki mevcut shipment'ı kullanmaya devam eder.
    warn "Backend shipment doğrulaması ve senkronu atlandı."
  else
    [[ -d "$SHIP" ]] || fail "Erlang shipment yok: $SHIP — gleam export erlang-shipment başarısız (gleam sürümü, Hex/Rebar)."
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

    if [[ -f scripts/ensure-category-thumbnails.mjs ]]; then
      node scripts/ensure-category-thumbnails.mjs \
        || warn "Eksik kategori gorselleri tamamlanamadi; mevcut gorsellerle devam ediliyor."
    fi

    # Çalışan next start .next/cache dosyalarını kilitler; build öncesi durdur.
    WEB_STOPPED_FOR_BUILD=0
    if systemctl is-active --quiet travel-web.service 2>/dev/null; then
      systemctl stop travel-web.service
      WEB_STOPPED_FOR_BUILD=1
      ok "travel-web durduruldu (build için)"
    fi

    rm -rf .next
    TRAVEL_LOW_IO_BUILD="${TRAVEL_LOW_IO_BUILD:-1}" \
      NEXT_TELEMETRY_DISABLED=1 npm run build
    npm prune --omit=dev

    if [[ "$WEB_STOPPED_FOR_BUILD" == "1" ]] && [[ "${RESTART_WEB}" != "1" ]]; then
      systemctl start travel-web.service
      ok "travel-web yeniden baslatildi (RESTART_WEB=0)"
    fi
  )
  ok "frontend build tamam"
  fi

  if [[ "${SKIP_AI_OPERATIONS_SCHEMA:-0}" == "1" ]]; then
    warn "SKIP_AI_OPERATIONS_SCHEMA=1 — AI operasyon amiri veritabanı modülü atlandı."
  elif [[ -f "$APP_ROOT/backend/priv/sql/modules/366_ai_operations_supervisor.sql" ]]; then
    step "AI operasyon amiri veritabanı modülü"
    bash "$APP_ROOT/deploy/apply-sql.sh" \
      "$APP_ROOT/backend/priv/sql/modules/366_ai_operations_supervisor.sql"
    ok "AI operasyon amiri şeması etkin"
  else
    fail "AI operasyon amiri SQL modülü bulunamadı."
  fi

  if [[ -f "$APP_ROOT/backend/priv/sql/modules/367_ai_listing_content_locale_progress.sql" ]]; then
    step "AI ilan içerik dil ilerleme şeması"
    bash "$APP_ROOT/deploy/apply-sql.sh" \
      "$APP_ROOT/backend/priv/sql/modules/367_ai_listing_content_locale_progress.sql"
  else
    fail "AI ilan içerik dil ilerleme SQL modülü bulunamadı."
  fi

  if [[ -f "$APP_ROOT/backend/priv/sql/modules/368_repair_cross_category_listing_identity.sql" ]]; then
    step "Cross-category listing identity repair"
    bash "$APP_ROOT/deploy/apply-sql.sh" \
      "$APP_ROOT/backend/priv/sql/modules/368_repair_cross_category_listing_identity.sql"
  else
    fail "Cross-category listing identity repair SQL module is missing."
  fi

  if [[ -f "$APP_ROOT/backend/priv/sql/modules/378_repair_baransen_yacht_villa_identity.sql" ]]; then
    step "Baransen yat ↔ Bravo villa kimlik onarımı (slug/title)"
    bash "$APP_ROOT/deploy/apply-sql.sh" \
      "$APP_ROOT/backend/priv/sql/modules/378_repair_baransen_yacht_villa_identity.sql" \
      || warn "378 baransen yacht identity SQL uygulanamadı — /yat/*villa* URL'leri kalabilir"
  else
    warn "378_repair_baransen_yacht_villa_identity.sql bulunamadı"
  fi

  if [[ -f "$APP_ROOT/backend/priv/sql/modules/379_listing_image_urls_to_avif.sql" ]]; then
    step "İlan görsel URL .jpg→.avif (disk AVIF uyumu)"
    bash "$APP_ROOT/deploy/apply-sql.sh" \
      "$APP_ROOT/backend/priv/sql/modules/379_listing_image_urls_to_avif.sql" \
      || warn "379 listing image avif URL SQL uygulanamadı — villa kartları gri kalabilir"
  else
    warn "379_listing_image_urls_to_avif.sql bulunamadı"
  fi

  if [[ -f "$APP_ROOT/backend/priv/sql/modules/380_repair_holiday_home_turkish_titles.sql" ]]; then
    step "Tatil evi Türkçe başlık (? → ş/ğ/ı) onarımı"
    bash "$APP_ROOT/deploy/apply-sql.sh" \
      "$APP_ROOT/backend/priv/sql/modules/380_repair_holiday_home_turkish_titles.sql" \
      || warn "380 holiday home title encoding SQL uygulanamadı"
  else
    warn "380_repair_holiday_home_turkish_titles.sql bulunamadı"
  fi

  if [[ -f "$APP_ROOT/backend/priv/sql/modules/381_sanitize_ministry_license_ref.sql" ]]; then
    step "Turizm belge no — JSON/PII temizliği (ministry_license_ref)"
    bash "$APP_ROOT/deploy/apply-sql.sh" \
      "$APP_ROOT/backend/priv/sql/modules/381_sanitize_ministry_license_ref.sql" \
      || warn "381 ministry license sanitize SQL uygulanamadı — Belge No satırında JSON kalabilir"
  else
    warn "381_sanitize_ministry_license_ref.sql bulunamadı"
  fi

  if [[ -f "$APP_ROOT/backend/priv/sql/modules/372_listing_region_stats_cache.sql" ]]; then
    step "Bölge istatistik önbelleği (region-stats)"
    bash "$APP_ROOT/deploy/apply-sql.sh" \
      "$APP_ROOT/backend/priv/sql/modules/372_listing_region_stats_cache.sql" \
      || warn "372 region-stats cache SQL uygulanamadı — anasayfa bölgeler boş kalabilir"
  else
    warn "372_listing_region_stats_cache.sql bulunamadı"
  fi

  if [[ -f "$APP_ROOT/backend/priv/sql/modules/373_region_stats_cache_thumbnails.sql" ]]; then
    step "Bölge istatistik thumbnail (region-stats)"
    bash "$APP_ROOT/deploy/apply-sql.sh" \
      "$APP_ROOT/backend/priv/sql/modules/373_region_stats_cache_thumbnails.sql" \
      || warn "373 region-stats thumbnail SQL uygulanamadı — bölge kartları gri kalabilir"
  else
    warn "373_region_stats_cache_thumbnails.sql bulunamadı"
  fi

  if [[ -f "$APP_ROOT/backend/priv/sql/modules/374_region_stats_dedupe_same_name.sql" ]]; then
    step "Bölge istatistik isim tekilleştirme (Kemer vb.)"
    bash "$APP_ROOT/deploy/apply-sql.sh" \
      "$APP_ROOT/backend/priv/sql/modules/374_region_stats_dedupe_same_name.sql" \
      || warn "374 region-stats dedupe SQL uygulanamadı — çift bölge kartı kalabilir"
  else
    warn "374_region_stats_dedupe_same_name.sql bulunamadı"
  fi

  if [[ -f "$APP_ROOT/backend/priv/sql/modules/375_ai_autopilot_orchestrator.sql" ]]; then
    step "AI Autopilot orchestrator şeması"
    bash "$APP_ROOT/deploy/apply-sql.sh" \
      "$APP_ROOT/backend/priv/sql/modules/375_ai_autopilot_orchestrator.sql"
  else
    fail "AI Autopilot orchestrator SQL modülü bulunamadı."
  fi

  # Genel müdür + güvenli içerik kadrosunu aktif et (para/fiyat oto kapalı kalır).
  if [[ "${SKIP_AI_CONTINUOUS_PRODUCTION:-0}" == "1" ]]; then
    warn "SKIP_AI_CONTINUOUS_PRODUCTION=1 — AI müdür/kadrosu aktivasyonu atlandı."
  else
    if [[ -f "$APP_ROOT/backend/priv/sql/modules/376_ai_continuous_production.sql" ]]; then
      step "AI sürekli üretim kadrosu (376)"
      bash "$APP_ROOT/deploy/apply-sql.sh" \
        "$APP_ROOT/backend/priv/sql/modules/376_ai_continuous_production.sql" \
        || warn "376 continuous production SQL uygulanamadı"
    fi
    if [[ -f "$APP_ROOT/backend/priv/sql/modules/400_ai_activate_paused_workforce.sql" ]]; then
      step "AI duraklatılmış kadroyu aktifleştir (400)"
      bash "$APP_ROOT/deploy/apply-sql.sh" \
        "$APP_ROOT/backend/priv/sql/modules/400_ai_activate_paused_workforce.sql" \
        || warn "400 activate workforce SQL uygulanamadı — panelden 'Duraklatılanları aç' deneyin"
    fi
    if [[ -f "$APP_ROOT/backend/priv/sql/modules/401_ai_enable_all_with_provider_fallback.sql" ]]; then
      step "AI sağlayıcı sırası: Gemini havuzu → DeepSeek yedek (401)"
      bash "$APP_ROOT/deploy/apply-sql.sh" \
        "$APP_ROOT/backend/priv/sql/modules/401_ai_enable_all_with_provider_fallback.sql" \
        || warn "401 AI sağlayıcı aktivasyonu uygulanamadı"
    fi
    if [[ -f "$APP_ROOT/backend/priv/sql/modules/402_ai_manager_continuous_orchestration.sql" ]]; then
      step "AI Genel Müdürü sürekli orkestrasyon (402)"
      bash "$APP_ROOT/deploy/apply-sql.sh" \
        "$APP_ROOT/backend/priv/sql/modules/402_ai_manager_continuous_orchestration.sql" \
        || warn "402 AI müdür orkestrasyonu uygulanamadı"
    fi
    if [[ -f "$APP_ROOT/backend/priv/sql/modules/407_ai_continuous_seo_listing_seed.sql" ]]; then
      step "AI sürekli SEO/i18n kuyruk otomasyonu (407)"
      bash "$APP_ROOT/deploy/apply-sql.sh" \
        "$APP_ROOT/backend/priv/sql/modules/407_ai_continuous_seo_listing_seed.sql" \
        || warn "407 sürekli SEO seed SQL uygulanamadı"
    fi
    if [[ -f "$APP_ROOT/backend/priv/sql/modules/408_seo_metadata_upsert_unique.sql" ]]; then
      step "SEO metadata unique (manuel upsert) (408)"
      bash "$APP_ROOT/deploy/apply-sql.sh" \
        "$APP_ROOT/backend/priv/sql/modules/408_seo_metadata_upsert_unique.sql" \
        || warn "408 seo_metadata unique SQL uygulanamadı"
    fi
    if [[ -f "$APP_ROOT/backend/priv/sql/modules/409_holiday_home_select_all_price_lines.sql" ]]; then
      step "Tatil evi dahil/hariç tüm kalemler (409)"
      bash "$APP_ROOT/deploy/apply-sql.sh" \
        "$APP_ROOT/backend/priv/sql/modules/409_holiday_home_select_all_price_lines.sql" \
        || warn "409 holiday_home price lines SQL uygulanamadı"
    fi
    if [[ -f "$APP_ROOT/backend/priv/sql/modules/410_repair_listing_turkish_ascii_locations.sql" ]]; then
      step "Türkçe adres/konum charset onarımı (410)"
      bash "$APP_ROOT/deploy/apply-sql.sh" \
        "$APP_ROOT/backend/priv/sql/modules/410_repair_listing_turkish_ascii_locations.sql" \
        || warn "410 turkish location repair SQL uygulanamadı"
    fi
    if [[ -f "$APP_ROOT/backend/priv/sql/modules/411_normalize_listing_region_display.sql" ]]; then
      step "Standart bölge kalıbı region_display (411)"
      bash "$APP_ROOT/deploy/apply-sql.sh" \
        "$APP_ROOT/backend/priv/sql/modules/411_normalize_listing_region_display.sql" \
        || warn "411 region_display normalize SQL uygulanamadı"
    fi
    if [[ -f "$APP_ROOT/backend/priv/sql/modules/412_repair_listing_turkish_ascii_content.sql" ]]; then
      step "Türkçe başlık/açıklama charset onarımı (412)"
      bash "$APP_ROOT/deploy/apply-sql.sh" \
        "$APP_ROOT/backend/priv/sql/modules/412_repair_listing_turkish_ascii_content.sql" \
        || warn "412 turkish content repair SQL uygulanamadı"
    fi
    if [[ -f "$APP_ROOT/backend/priv/sql/modules/413_ai_listing_content_seed_charset_dirty.sql" ]]; then
      step "AI içerik seed: charset/? ve Genel Kurallar kapısı (413)"
      bash "$APP_ROOT/deploy/apply-sql.sh" \
        "$APP_ROOT/backend/priv/sql/modules/413_ai_listing_content_seed_charset_dirty.sql" \
        || warn "413 AI listing content seed SQL uygulanamadı"
    fi
    if [[ -f "$APP_ROOT/backend/priv/sql/modules/414_ai_seo_keywords_required.sql" ]]; then
      step "SEO anahtar kelime zorunluluğu (414)"
      bash "$APP_ROOT/deploy/apply-sql.sh" \
        "$APP_ROOT/backend/priv/sql/modules/414_ai_seo_keywords_required.sql" \
        || warn "414 SEO keywords required SQL uygulanamadı"
    fi
    if [[ -f "$APP_ROOT/backend/priv/sql/modules/415_repair_listing_turkish_ascii_content_v2.sql" ]]; then
      step "Türkçe açıklama charset onarımı v2 (415)"
      bash "$APP_ROOT/deploy/apply-sql.sh" \
        "$APP_ROOT/backend/priv/sql/modules/415_repair_listing_turkish_ascii_content_v2.sql" \
        || warn "415 turkish content repair v2 SQL uygulanamadı"
    fi
    if [[ ! -f "$APP_ROOT/backend/priv/sql/modules/417_repair_listing_turkish_ascii_content_v4.sql" \
      && -f "$APP_ROOT/backend/priv/sql/modules/416_repair_listing_turkish_ascii_content_v3.sql" ]]; then
      step "Türkçe açıklama charset onarımı v3 — tüm harf/büyük-küçük (416)"
      bash "$APP_ROOT/deploy/apply-sql.sh" \
        "$APP_ROOT/backend/priv/sql/modules/416_repair_listing_turkish_ascii_content_v3.sql" \
        || warn "416 turkish content repair v3 SQL uygulanamadı"
    fi
    if [[ -f "$APP_ROOT/backend/priv/sql/modules/417_repair_listing_turkish_ascii_content_v4.sql" ]]; then
      step "Türkçe açıklama charset onarımı v4 — parser güvenli tekrar (417)"
      bash "$APP_ROOT/deploy/apply-sql.sh" \
        "$APP_ROOT/backend/priv/sql/modules/417_repair_listing_turkish_ascii_content_v4.sql" \
        || warn "417 turkish content repair v4 SQL uygulanamadı"
    fi
    if [[ -f "$APP_ROOT/backend/priv/sql/modules/418_repair_listing_turkish_html_apostrophe.sql" ]]; then
      step "Türkçe HTML apostrof/entity charset onarımı (418)"
      bash "$APP_ROOT/deploy/apply-sql.sh" \
        "$APP_ROOT/backend/priv/sql/modules/418_repair_listing_turkish_html_apostrophe.sql" \
        || warn "418 Turkish HTML apostrophe repair SQL uygulanamadı"
    fi
    if [[ -f "$APP_ROOT/backend/priv/sql/modules/419_repair_remaining_holiday_home_turkish_ascii.sql" ]]; then
      step "Villa açıklamalarında kalan Türkçe charset kalıpları (419)"
      bash "$APP_ROOT/deploy/apply-sql.sh" \
        "$APP_ROOT/backend/priv/sql/modules/419_repair_remaining_holiday_home_turkish_ascii.sql" \
        || warn "419 remaining Turkish holiday-home repair SQL uygulanamadı"
    fi
    if [[ -f "$APP_ROOT/backend/priv/sql/modules/420_seed_kas_holiday_home_nearby_distances.sql" ]]; then
      step "Kaş/Kalkan villaları gerçek yakın mekan mesafeleri (420)"
      bash "$APP_ROOT/deploy/apply-sql.sh" \
        "$APP_ROOT/backend/priv/sql/modules/420_seed_kas_holiday_home_nearby_distances.sql" \
        || warn "420 Kaş holiday-home nearby distances SQL uygulanamadı"
    fi
    if [[ -f "$APP_ROOT/backend/priv/sql/modules/421_group_kas_nearby_pois_by_category.sql" ]]; then
      step "Kaş/Kalkan yakın mekan alt kategori ve popülerlik grupları (421)"
      bash "$APP_ROOT/deploy/apply-sql.sh" \
        "$APP_ROOT/backend/priv/sql/modules/421_group_kas_nearby_pois_by_category.sql" \
        || warn "421 grouped Kaş nearby POIs SQL uygulanamadı"
    fi
    if [[ -f "$APP_ROOT/backend/priv/sql/modules/422_repair_listing_turkish_ascii_locations_v2.sql" ]]; then
      step "Adres/konum Türkçe charset onarımı v2 (422)"
      bash "$APP_ROOT/deploy/apply-sql.sh" \
        "$APP_ROOT/backend/priv/sql/modules/422_repair_listing_turkish_ascii_locations_v2.sql" \
        || warn "422 location charset repair SQL uygulanamadı"
    fi
    if [[ -f "$APP_ROOT/backend/priv/sql/modules/423_repair_remaining_turkish_ascii_fields.sql" ]]; then
      step "Kalan vitrin alanları Türkçe charset onarımı (423)"
      bash "$APP_ROOT/deploy/apply-sql.sh" \
        "$APP_ROOT/backend/priv/sql/modules/423_repair_remaining_turkish_ascii_fields.sql" \
        || warn "423 remaining Turkish fields repair SQL uygulanamadı"
    fi
    if [[ -f "$APP_ROOT/backend/priv/sql/modules/424_perf_listing_suggest_location_ascii_trgm.sql" ]]; then
      step "Arama önerisi konum trgm index (424)"
      bash "$APP_ROOT/deploy/apply-sql.sh" \
        "$APP_ROOT/backend/priv/sql/modules/424_perf_listing_suggest_location_ascii_trgm.sql" \
        || warn "424 suggest location trgm index SQL uygulanamadı"
    fi
  fi

  if [[ -f "$APP_ROOT/backend/priv/sql/modules/427_repair_source_calendar_half_day_boundaries.sql" ]]; then
    step "Villa takvimi yarim gun turnover sinirlari (427)"
    APPLY_SQL_SKIP_AI_ENQUEUE=1 bash "$APP_ROOT/deploy/apply-sql.sh" \
      "$APP_ROOT/backend/priv/sql/modules/427_repair_source_calendar_half_day_boundaries.sql" \
      || fail "427 takvim yarim gun onarimi uygulanamadi"
  fi

  if [[ -f "$APP_ROOT/backend/priv/sql/modules/428_repair_mamon_checkout_boundary.sql" ]]; then
    step "Mamon Villa 23 Agustos cikis sabahi siniri (428)"
    APPLY_SQL_SKIP_AI_ENQUEUE=1 bash "$APP_ROOT/deploy/apply-sql.sh" \
      "$APP_ROOT/backend/priv/sql/modules/428_repair_mamon_checkout_boundary.sql" \
      || fail "428 Mamon Villa cikis siniri onarimi uygulanamadi"
  fi

  if [[ -f "$APP_ROOT/backend/priv/sql/modules/429_repair_all_source_villa_checkout_boundaries.sql" ]]; then
    step "Tum kaynak takvimli villa yarim gun sinirlari (429)"
    APPLY_SQL_SKIP_AI_ENQUEUE=1 bash "$APP_ROOT/deploy/apply-sql.sh" \
      "$APP_ROOT/backend/priv/sql/modules/429_repair_all_source_villa_checkout_boundaries.sql" \
      || fail "429 tum villa yarim gun onarimi uygulanamadi"
  fi

  if [[ -f "$APP_ROOT/backend/priv/sql/modules/430_inherit_global_logo_colors_on_tr_domains.sql" ]]; then
    step "Logo renkleri global ayar mirasi (430)"
    APPLY_SQL_SKIP_AI_ENQUEUE=1 bash "$APP_ROOT/deploy/apply-sql.sh" \
      "$APP_ROOT/backend/priv/sql/modules/430_inherit_global_logo_colors_on_tr_domains.sql" \
      || fail "430 logo renk mirasi uygulanamadi"
  fi

  if [[ "${SKIP_AI_WORKER_TIMER:-0}" == "1" ]]; then
    warn "SKIP_AI_WORKER_TIMER=1 — AI watchdog ve kuyruk worker timer kurulumu atlandı."
  elif [[ -f "$APP_ROOT/deploy/systemd/travel-ai-worker.service" && -f "$APP_ROOT/deploy/systemd/travel-ai-worker.timer" ]]; then
    step "AI watchdog ve kuyruk worker timer kurulumu"
    cp "$APP_ROOT/deploy/systemd/travel-ai-worker.service" /etc/systemd/system/travel-ai-worker.service \
      && cp "$APP_ROOT/deploy/systemd/travel-ai-worker.timer" /etc/systemd/system/travel-ai-worker.timer \
      && chmod +x "$APP_ROOT/deploy/scripts/ai-worker-run-steps.sh" \
      && systemctl daemon-reload \
      && systemctl enable --now travel-ai-worker.timer \
      && ok "travel-ai-worker.timer etkin" \
      || warn "travel-ai-worker.timer kurulamadı; AI watchdog için systemd/log kontrol edin."
  else
    warn "AI worker systemd dosyaları bulunamadı."
  fi

  if [[ "${SKIP_SOCIAL_WORKER_TIMER:-0}" == "1" ]]; then
    warn "SKIP_SOCIAL_WORKER_TIMER=1 — sosyal paylaşım worker timer kurulumu atlandı."
  elif [[ -f "$APP_ROOT/deploy/systemd/travel-social-worker.service" && -f "$APP_ROOT/deploy/systemd/travel-social-worker.timer" ]]; then
    step "Sosyal paylaşım worker timer kurulumu"
    cp "$APP_ROOT/deploy/systemd/travel-social-worker.service" /etc/systemd/system/travel-social-worker.service \
      && cp "$APP_ROOT/deploy/systemd/travel-social-worker.timer" /etc/systemd/system/travel-social-worker.timer \
      && chmod +x "$APP_ROOT/deploy/scripts/social-process-pending.sh" \
      && systemctl daemon-reload \
      && systemctl enable --now travel-social-worker.timer \
      && ok "travel-social-worker.timer etkin" \
      || warn "travel-social-worker.timer kurulamadı; bekleyen sosyal paylaşımlar için systemd/log kontrol edin."
  else
    warn "Sosyal paylaşım worker systemd dosyaları bulunamadı."
  fi

  if [[ "${SKIP_IMPORT_SCHEDULER_TIMER:-0}" == "1" ]]; then
    warn "SKIP_IMPORT_SCHEDULER_TIMER=1 — ilan kaynak senkronizasyon zamanlayıcısı atlandı."
  elif [[ -f "$APP_ROOT/deploy/systemd/travel-import-scheduler.service" && -f "$APP_ROOT/deploy/systemd/travel-import-scheduler.timer" ]]; then
    step "İlan kaynak ve sağlayıcı senkronizasyon timer kurulumu"
    cp "$APP_ROOT/deploy/systemd/travel-import-scheduler.service" /etc/systemd/system/travel-import-scheduler.service \
      && cp "$APP_ROOT/deploy/systemd/travel-import-scheduler.timer" /etc/systemd/system/travel-import-scheduler.timer \
      && systemctl daemon-reload \
      && systemctl enable --now travel-import-scheduler.timer \
      && ok "travel-import-scheduler.timer etkin" \
      || warn "travel-import-scheduler.timer kurulamadı; systemd/log kontrol edin."
  else
    warn "İlan kaynak senkronizasyon systemd dosyaları bulunamadı."
  fi

  if [[ "${SKIP_HOLIDAY_NEARBY_POIS_TIMER:-0}" == "1" ]]; then
    warn "SKIP_HOLIDAY_NEARBY_POIS_TIMER=1 — tüm villa mesafe yenileme zamanlayıcısı atlandı."
  elif [[ -f "$APP_ROOT/deploy/systemd/travel-holiday-nearby-pois.service" && -f "$APP_ROOT/deploy/systemd/travel-holiday-nearby-pois.timer" ]]; then
    step "Tüm villa yakın mekan ve mesafe timer kurulumu"
    cp "$APP_ROOT/deploy/systemd/travel-holiday-nearby-pois.service" /etc/systemd/system/travel-holiday-nearby-pois.service \
      && cp "$APP_ROOT/deploy/systemd/travel-holiday-nearby-pois.timer" /etc/systemd/system/travel-holiday-nearby-pois.timer \
      && systemctl daemon-reload \
      && systemctl enable --now travel-holiday-nearby-pois.timer \
      && systemctl start --no-block travel-holiday-nearby-pois.service \
      && ok "travel-holiday-nearby-pois.timer etkin" \
      || warn "travel-holiday-nearby-pois.timer kurulamadı; systemd/log kontrol edin."
  else
    warn "Tüm villa mesafe systemd dosyaları bulunamadı."
  fi

  if [[ "${SKIP_WARM_CACHE_TIMER:-0}" == "1" ]]; then
    warn "SKIP_WARM_CACHE_TIMER=1 — vitrin önbellek ısıtma timer kurulumu atlandı."
  elif [[ -f "$APP_ROOT/deploy/systemd/travel-warm-cache.service" && -f "$APP_ROOT/deploy/systemd/travel-warm-cache.timer" ]]; then
    step "Vitrin önbellek ısıtma timer kurulumu"
    cp "$APP_ROOT/deploy/systemd/travel-warm-cache.service" /etc/systemd/system/travel-warm-cache.service \
      && cp "$APP_ROOT/deploy/systemd/travel-warm-cache.timer" /etc/systemd/system/travel-warm-cache.timer \
      && systemctl daemon-reload \
      && systemctl enable --now travel-warm-cache.timer \
      && ok "travel-warm-cache.timer etkin" \
      || warn "travel-warm-cache.timer kurulamadı; soğuk render için elle ./deploy/scripts/warm-cache.sh çalıştırın."
  else
    warn "Vitrin önbellek ısıtma systemd dosyaları bulunamadı."
  fi

  if [[ "${SKIP_DB_GUARD_TIMER:-0}" == "1" ]]; then
    warn "SKIP_DB_GUARD_TIMER=1 — PostgreSQL otomatik bağlantı koruyucusu atlandı."
  elif [[ -f "$APP_ROOT/deploy/systemd/travel-db-guard.service" && -f "$APP_ROOT/deploy/systemd/travel-db-guard.timer" ]]; then
    step "PostgreSQL otomatik bağlantı koruyucusu kurulumu"
    cp "$APP_ROOT/deploy/systemd/travel-db-guard.service" /etc/systemd/system/travel-db-guard.service \
      && cp "$APP_ROOT/deploy/systemd/travel-db-guard.timer" /etc/systemd/system/travel-db-guard.timer \
      && chmod +x "$APP_ROOT/deploy/scripts/guard-postgres-connections.sh" \
      && systemctl daemon-reload \
      && systemctl enable --now travel-db-guard.timer \
      && ok "travel-db-guard.timer etkin" \
      || warn "travel-db-guard.timer kurulamadı; PostgreSQL bağlantılarını elle kontrol edin."
  else
    warn "PostgreSQL bağlantı guard systemd dosyaları bulunamadı."
  fi

  if [[ "${SKIP_PRUNE_NEXT_CACHE_TIMER:-0}" == "1" ]]; then
    warn "SKIP_PRUNE_NEXT_CACHE_TIMER=1 — Next.js fetch-cache budama timer atlandı."
  elif [[ -f "$APP_ROOT/deploy/systemd/travel-prune-next-cache.service" && -f "$APP_ROOT/deploy/systemd/travel-prune-next-cache.timer" ]]; then
    step "Next.js fetch-cache budama timer kurulumu"
    cp "$APP_ROOT/deploy/systemd/travel-prune-next-cache.service" /etc/systemd/system/travel-prune-next-cache.service \
      && cp "$APP_ROOT/deploy/systemd/travel-prune-next-cache.timer" /etc/systemd/system/travel-prune-next-cache.timer \
      && chmod +x "$APP_ROOT/deploy/scripts/prune-next-cache.sh" \
      && systemctl daemon-reload \
      && systemctl enable --now travel-prune-next-cache.timer \
      && ok "travel-prune-next-cache.timer etkin" \
      || warn "travel-prune-next-cache.timer kurulamadı; elle: ./deploy/scripts/prune-next-cache.sh"
  else
    warn "Next.js prune-cache systemd dosyaları bulunamadı."
  fi

  if [[ -f "$APP_ROOT/deploy/systemd/travel-archive-expired-events.service" && -f "$APP_ROOT/deploy/systemd/travel-archive-expired-events.timer" ]]; then
    step "Süresi dolan etkinlikleri arşivleme timer kurulumu"
    cp "$APP_ROOT/deploy/systemd/travel-archive-expired-events.service" /etc/systemd/system/travel-archive-expired-events.service \
      && cp "$APP_ROOT/deploy/systemd/travel-archive-expired-events.timer" /etc/systemd/system/travel-archive-expired-events.timer \
      && chmod +x "$APP_ROOT/deploy/scripts/archive-expired-events.sh" \
      && systemctl daemon-reload \
      && systemctl enable --now travel-archive-expired-events.timer \
      && ok "travel-archive-expired-events.timer etkin" \
      || warn "Etkinlik arşivleme timer kurulamadı; elle: ./deploy/scripts/archive-expired-events.sh"
  fi

  step "Servis restart"
  if [[ -f "$APP_ROOT/deploy/systemd/travel-web.service" ]]; then
    cp "$APP_ROOT/deploy/systemd/travel-web.service" /etc/systemd/system/travel-web.service \
      && ok "travel-web.service unit senkron (server.mjs CSS defer)" \
      || warn "travel-web.service kopyalanamadı"
  fi
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
      if VERIFY_REPO_FRONTEND="$APP_ROOT/frontend" VERIFY_SKIP_MAPS_CURL="${VERIFY_SKIP_MAPS_CURL:-1}" \
        timeout "$VERIFY_TIMEOUT_SECONDS" bash "$APP_ROOT/deploy/verify.sh"; then
        ok "deploy verify tamam"
      elif [[ "${VERIFY_SOFT_FAIL:-1}" == "1" ]]; then
        warn "deploy verify başarısız veya ${VERIFY_TIMEOUT_SECONDS}s içinde tamamlanmadı — build/restart tamam olabilir; elle: curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/tr"
        warn "Log: tail -n 120 .deploy/travel-deploy.log"
      else
        fail "deploy verify başarısız veya ${VERIFY_TIMEOUT_SECONDS}s içinde tamamlanmadı. Log: tail -n 120 .deploy/travel-deploy.log"
      fi
    else
      warn "timeout komutu yok — verify süre sınırı olmadan çalışacak."
      VERIFY_REPO_FRONTEND="$APP_ROOT/frontend" bash "$APP_ROOT/deploy/verify.sh"
    fi
  fi

  if [[ "${SKIP_WARM_CACHE:-0}" == "1" ]]; then
    warn "SKIP_WARM_CACHE=1 — deploy sonrası önbellek ısıtma atlandı (ilk ziyaretçi soğuk render görebilir)."
  elif [[ -f "$APP_ROOT/deploy/scripts/warm-cache.sh" ]]; then
    step "Vitrin önbellek ısıtma (deploy sonrası)"
    WARM_ROUNDS="${WARM_ROUNDS:-2}" bash "$APP_ROOT/deploy/scripts/warm-cache.sh" || warn "warm-cache tamamlanamadı (deploy etkilenmez); elle: ./deploy/scripts/warm-cache.sh"
  fi

  if [[ "${SKIP_PRUNE_NEXT_CACHE:-0}" == "1" ]]; then
    warn "SKIP_PRUNE_NEXT_CACHE=1 — deploy sonrası fetch-cache budama atlandı."
  elif [[ -f "$APP_ROOT/deploy/scripts/prune-next-cache.sh" ]]; then
    step "Next.js fetch-cache budama (deploy sonrası)"
    chmod +x "$APP_ROOT/deploy/scripts/prune-next-cache.sh"
    bash "$APP_ROOT/deploy/scripts/prune-next-cache.sh" \
      || warn "prune-next-cache tamamlanamadı; elle: ./deploy/scripts/prune-next-cache.sh"
  fi

  # Servisler ayağa kalktıktan sonra AI + sosyal worker timer + async tetik.
  # (AI run-steps senkron DEĞİL — eskiden deploy sonunu dakikalar kilitleyebiliyordu.)
  if [[ "${SKIP_AI_SOCIAL_KICK:-0}" == "1" ]]; then
    warn "SKIP_AI_SOCIAL_KICK=1 — AI/sosyal anlık tetik atlandı."
  elif [[ -f "$APP_ROOT/deploy/scripts/ensure-ai-social-workers.sh" ]]; then
    step "AI + sosyal medya worker (timer + async tetik)"
    chmod +x "$APP_ROOT/deploy/scripts/ensure-ai-social-workers.sh"
    # SYNC_AI_SOCIAL_KICK=1 → eski senkron AI run-steps (dakikalar sürebilir)
    SYNC_KICK="${SYNC_AI_SOCIAL_KICK:-0}" bash "$APP_ROOT/deploy/scripts/ensure-ai-social-workers.sh" \
      || warn "AI/sosyal worker tetik tamamlanamadı; elle: ./deploy/scripts/ensure-ai-social-workers.sh"
  fi

  ok "Deploy tamam (ref=$DEPLOY_REF HEAD=$(git rev-parse --short HEAD)). AI/sosyal arka planda sürüyor."
}

main "$@"
