#!/usr/bin/env bash
# Tüm ilan görsellerini onar + yerel AVIF standardı.
# Repo kökünden çalıştırın (üretim: /var/www/vhosts/rezervasyonyap.tr/httpdocs).
#
#   chmod +x deploy/scripts/fix-all-listing-images.sh
#   ./deploy/scripts/fix-all-listing-images.sh
#   REHOST_EXTERNAL=1 ./deploy/scripts/fix-all-listing-images.sh   # CDN → yerel AVIF (uzun)
#   SKIP_CONVERT=1 ./deploy/scripts/fix-all-listing-images.sh      # yalnız SQL
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

APPLY_SQL="${APPLY_SQL:-./deploy/apply-sql.sh}"
if [[ ! -x "$APPLY_SQL" ]]; then
  chmod +x deploy/apply-sql.sh 2>/dev/null || true
fi

step() { echo ""; echo "==> $*"; }

step "SQL CDN uzantı onarımları (382–387)"
for f in \
  backend/priv/sql/modules/382_repair_listing_image_ext_after_partial_avif.sql \
  backend/priv/sql/modules/383_repair_external_cdn_image_extensions.sql \
  backend/priv/sql/modules/384_repair_reserwation_tour_image_ext.sql \
  backend/priv/sql/modules/385_repair_fairystone_activity_image_ext.sql \
  backend/priv/sql/modules/386_repair_wikimedia_ferry_image_ext.sql \
  backend/priv/sql/modules/387_repair_all_listing_image_extensions.sql
do
  if [[ -f "$f" ]]; then
    echo "  apply $f"
    bash deploy/apply-sql.sh "$f" || {
      echo "WARN: apply-sql failed for $f — trying psql fallback if PG* set"
      if [[ -n "${PGDATABASE:-}" ]]; then
        psql -v ON_ERROR_STOP=1 -f "$f"
      else
        echo "ERROR: could not apply $f"
        exit 1
      fi
    }
  fi
done

if [[ "${SKIP_CONVERT:-0}" != "1" ]]; then
  step "Yerel uploads → AVIF (webp/jpg/png dönüştür)"
  export PATH="${PATH:-}"
  if [[ -x "$HOME/.nvm/versions/node/v25.9.0/bin/node" ]]; then
    export PATH="$HOME/.nvm/versions/node/v25.9.0/bin:$PATH"
  fi
  # backend.env PG* varsa yükle (update-listing-paths için)
  if [[ -f /etc/rezervasyonyap/backend.env ]]; then
    set -a
    # shellcheck disable=SC1091
    source /etc/rezervasyonyap/backend.env
    set +a
  elif [[ -f backend/backend.env ]]; then
    set -a
    # shellcheck disable=SC1091
    source backend/backend.env
    set +a
  fi
  node frontend/scripts/convert-uploads-to-avif.mjs frontend/public/uploads/listings
  step "DB yollarını mevcut .avif dosyalarına güvenli güncelle (http CDN dokunulmaz)"
  node scripts/update-listing-paths-avif.mjs
fi

if [[ "${REHOST_EXTERNAL:-0}" == "1" ]]; then
  step "Harici CDN → yerel AVIF rehost (uzun sürebilir)"
  if [[ -f /etc/rezervasyonyap/backend.env ]]; then
    set -a
    # shellcheck disable=SC1091
    source /etc/rezervasyonyap/backend.env
    set +a
  fi
  node scripts/rehost-external-listing-images-avif.mjs ${REHOST_LIMIT:+--limit=$REHOST_LIMIT}
fi

step "Tamam. Frontend/API için: DEPLOY_REF=main ./deploy/deploy.sh"
echo "Özet:"
echo "  - CDN yanlış .avif → çalışan uzantı (SQL 382–387)"
echo "  - Yerel dosyalar AVIF + DB güncellemesi"
echo "  - Panel yükleme zaten AVIF; rehost ile harici CDN de yerel AVIF olur (REHOST_EXTERNAL=1)"
