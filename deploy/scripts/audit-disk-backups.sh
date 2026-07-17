#!/usr/bin/env bash
# Disk / DB yedek envanteri (salt okunur). Silmez.
#
#   cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
#   ./deploy/scripts/audit-disk-backups.sh
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

section() { echo; echo "======== $* ========"; }

section "Disk özeti"
df -h / /var /tmp /var/lib/postgresql 2>/dev/null || df -h /

section "Büyük dizinler (kök adaylar)"
du -sh \
  "$APP_ROOT/backups" \
  "$APP_ROOT/frontend/public/uploads" \
  "$APP_ROOT/frontend/.next" \
  "$APP_ROOT/backend/build" \
  /var/lib/psa/dumps \
  /var/lib/psa/backups \
  /var/backups \
  /var/lib/postgresql \
  /tmp \
  /var/log \
  2>/dev/null | sort -hr || true

section "httpdocs/backups (üst 40 dosya)"
if [[ -d "$APP_ROOT/backups" ]]; then
  du -ah "$APP_ROOT/backups" 2>/dev/null | sort -hr | head -40
else
  echo "(yok)"
fi

section "Dump / arşiv adayları (httpdocs + /tmp + /var/backups)"
find "$APP_ROOT" /tmp /var/backups /var/lib/psa/dumps /root \
  -type f \( \
    -name '*.dump' -o -name '*.sql' -o -name '*.sql.gz' -o -name '*.tar' \
    -o -name '*.tar.gz' -o -name '*.tgz' -o -name '*.zip' -o -name '*.bak' \
    -o -name '*backup*' -o -name '*yedek*' \
  \) -size +10M 2>/dev/null \
  | head -80 \
  | while read -r f; do
      du -h "$f" 2>/dev/null
    done \
  | sort -hr | head -40 || true

section "PostgreSQL veritabanları (boyut)"
if command -v sudo >/dev/null 2>&1 && id postgres >/dev/null 2>&1; then
  sudo -u postgres psql -Atc "
    SELECT datname || E'\t' || pg_size_pretty(pg_database_size(datname))
    FROM pg_database
    WHERE datistemplate = false
    ORDER BY pg_database_size(datname) DESC;
  " 2>/dev/null || true
elif command -v psql >/dev/null 2>&1; then
  psql -Atc "
    SELECT datname || E'\t' || pg_size_pretty(pg_database_size(datname))
    FROM pg_database
    WHERE datistemplate = false
    ORDER BY pg_database_size(datname) DESC;
  " 2>/dev/null || echo "(psql yetkisi yok)"
fi

section "travel_prod_db en büyük tablolar"
sudo -u postgres psql -d travel_prod_db -c "
SELECT relname AS table,
       pg_size_pretty(pg_total_relation_size(c.oid)) AS total,
       n_live_tup AS approx_rows
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY pg_total_relation_size(c.oid) DESC
LIMIT 20;
" 2>/dev/null || true

section "Plesk dump klasörleri"
ls -lah /var/lib/psa/dumps 2>/dev/null | head -30 || echo "(yok veya erişim yok)"
ls -lah /var/lib/psa/backups 2>/dev/null | head -20 || echo "(yok veya erişim yok)"

section "Bitti — çıktıyı paylaşın; silinecekleri birlikte seçelim"
