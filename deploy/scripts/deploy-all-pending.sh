#!/usr/bin/env bash
# Tüm bekleyen üretim adımlarını TEK seferde çalıştırır:
#   - medya CDN onarımı (SQL 382–387 + isteğe bağlı AVIF)
#   - otel oda-kapsamlı fiyat backfill
#   - sosyal paylaşım kategori sırası (SQL 388)
#   - API + Next tam deploy + verify
#   - sosyal worker restart
#
# Üretim (önerilen — main):
#   cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
#   chmod +x deploy/scripts/deploy-all-pending.sh
#   DEPLOY_REF=main ./deploy/scripts/deploy-all-pending.sh
#
# Atlama bayrakları:
#   SKIP_GIT_SYNC=1 SKIP_IMAGE_FIX=1 SKIP_HOTEL_PRICE_BACKFILL=1
#   SKIP_STAY_DISTANCES=1 SKIP_SOCIAL_SQL=1 SKIP_DEPLOY=1 SKIP_VERIFY=1
#   SKIP_SOCIAL_RESTART=1
#   REHOST_EXTERNAL=1   # CDN görsellerini yerel AVIF'e al (uzun)
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

REF="${DEPLOY_REF:-main}"

ok() { echo "[OK] $*"; }
step() { echo; echo "==> $*"; }
warn() { echo "[WARN] $*" >&2; }
fail() { echo "[FAIL] $*" >&2; exit 1; }

chmod +x \
  deploy/deploy.sh \
  deploy/verify.sh \
  deploy/apply-sql.sh \
  deploy/scripts/fix-all-listing-images.sh \
  deploy/scripts/deploy-all-pending.sh \
  scripts/backfill-hotel-room-scoped-prices.mjs \
  scripts/refresh-stay-nearby-pois.mjs \
  2>/dev/null || true

if [[ "${SKIP_GIT_SYNC:-0}" != "1" ]]; then
  step "git sync ($REF)"
  git fetch origin "$REF" || fail "git fetch origin $REF"
  # Branch veya tag: working tree'yi ref'e hizala
  if git show-ref --verify --quiet "refs/remotes/origin/$REF"; then
    git reset --hard "origin/$REF"
  elif git rev-parse --verify "$REF^{commit}" >/dev/null 2>&1; then
    git reset --hard "$REF"
  else
    fail "Ref bulunamadı: $REF"
  fi
  ok "working tree = $(git rev-parse --short HEAD) ($REF)"
else
  warn "SKIP_GIT_SYNC=1 — mevcut checkout kullanılıyor ($(git rev-parse --short HEAD))"
fi

if [[ "${SKIP_IMAGE_FIX:-0}" != "1" ]]; then
  step "ilan görselleri CDN onarımı (382–387)"
  REHOST_EXTERNAL="${REHOST_EXTERNAL:-0}" ./deploy/scripts/fix-all-listing-images.sh \
    || fail "fix-all-listing-images.sh başarısız"
  ok "görsel onarım"
else
  warn "SKIP_IMAGE_FIX=1"
fi

if [[ "${SKIP_SOCIAL_SQL:-0}" != "1" ]]; then
  step "sosyal paylaşım kategori sırası (388)"
  if [[ -f backend/priv/sql/modules/388_social_share_category_order.sql ]]; then
    ./deploy/apply-sql.sh backend/priv/sql/modules/388_social_share_category_order.sql \
      || fail "388 social category order SQL"
    ok "social category_codes = villa→yat→aktivite→tur→gemi→otel"
  else
    warn "388 SQL yok — atlandı"
  fi
else
  warn "SKIP_SOCIAL_SQL=1"
fi

if [[ "${SKIP_HOTEL_PRICE_BACKFILL:-0}" != "1" ]]; then
  step "otel oda-kapsamlı fiyat backfill"
  if [[ -f scripts/backfill-hotel-room-scoped-prices.mjs ]]; then
    # shellcheck disable=SC2086
    node scripts/backfill-hotel-room-scoped-prices.mjs ${HOTEL_PRICE_BACKFILL_ARGS:-} \
      || fail "hotel room price backfill"
    ok "oda fiyat backfill"
  else
    warn "backfill script yok — atlandı"
  fi
else
  warn "SKIP_HOTEL_PRICE_BACKFILL=1"
fi

if [[ "${SKIP_STAY_DISTANCES:-0}" != "1" ]]; then
  step "otel/villa mesafeler (nearby_pois) backfill"
  if [[ -f scripts/refresh-stay-nearby-pois.mjs ]]; then
    # shellcheck disable=SC2086
    node scripts/refresh-stay-nearby-pois.mjs ${STAY_DISTANCES_ARGS:-} \
      || fail "stay nearby distances backfill"
    ok "mesafeler backfill"
  else
    warn "refresh-stay-nearby-pois.mjs yok — atlandı"
  fi
else
  warn "SKIP_STAY_DISTANCES=1"
fi

if [[ "${SKIP_DEPLOY:-0}" != "1" ]]; then
  step "API + frontend deploy ($REF)"
  DEPLOY_REF="$REF" ./deploy/deploy.sh || fail "deploy.sh"
  ok "deploy.sh"
else
  warn "SKIP_DEPLOY=1"
fi

if [[ "${SKIP_SOCIAL_RESTART:-0}" != "1" ]]; then
  step "sosyal worker restart"
  if command -v systemctl >/dev/null 2>&1; then
    systemctl restart travel-social-worker.service 2>/dev/null \
      || warn "travel-social-worker.service restart edilemedi (unit yok olabilir)"
    systemctl start travel-social-worker.timer 2>/dev/null || true
    ok "social worker"
  else
    warn "systemctl yok — social worker elle restart edin"
  fi
fi

if [[ "${SKIP_VERIFY:-0}" != "1" ]]; then
  step "verify"
  ./deploy/verify.sh || fail "verify.sh"
  ok "verify"
else
  warn "SKIP_VERIFY=1"
fi

echo
echo "============================================"
echo " TÜm BEKLEYEN DEPLOY TAMAM ($REF)"
echo "  - görseller 382–387"
echo "  - otel oda fiyatları"
echo "  - sosyal sıra villa→yat→aktivite→tur→gemi→otel"
echo "  - travel-api + travel-web"
echo "============================================"
