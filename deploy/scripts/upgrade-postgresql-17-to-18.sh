#!/usr/bin/env bash
# PostgreSQL 17 -> 18 in-place major upgrade for the Rezervasyon Yap server.
#
# Safety properties:
# - requires a recent pg_dumpall backup;
# - uses pg_upgrade copy mode (the PostgreSQL 17 cluster remains untouched);
# - runs pg_upgrade --check before the real migration;
# - restores PostgreSQL 17 and application services if migration/health checks fail;
# - never deletes the PostgreSQL 17 data directory.
set -Eeuo pipefail

OLD_MAJOR=17
NEW_MAJOR=18
OLD_BIN="/usr/pgsql-${OLD_MAJOR}/bin"
NEW_BIN="/usr/pgsql-${NEW_MAJOR}/bin"
OLD_DATA="/var/lib/pgsql/${OLD_MAJOR}/data"
NEW_DATA="/var/lib/pgsql/${NEW_MAJOR}/data"
OLD_SERVICE="postgresql-${OLD_MAJOR}.service"
NEW_SERVICE="postgresql-${NEW_MAJOR}.service"
UPGRADE_DIR="/var/lib/pgsql/upgrade-${OLD_MAJOR}-to-${NEW_MAJOR}"
BACKUP_GLOB="/var/backups/server-update-*/postgresql-all.sql.gz"
MIN_FREE_GIB=5

log() { printf '[%s] %s\n' "$(date '+%F %T %Z')" "$*"; }
fail() { log "HATA: $*" >&2; exit 1; }

[[ ${EUID:-$(id -u)} -eq 0 ]] || fail "root olarak calistirin"
command -v dnf >/dev/null || fail "dnf bulunamadi"
[[ -x "$OLD_BIN/psql" ]] || fail "$OLD_BIN/psql bulunamadi"
[[ -s "$OLD_DATA/PG_VERSION" ]] || fail "$OLD_DATA PostgreSQL cluster degil"

latest_backup="$(ls -1t $BACKUP_GLOB 2>/dev/null | head -1 || true)"
[[ -n "$latest_backup" && -s "$latest_backup" ]] || fail "pg_dumpall yedegi bulunamadi: $BACKUP_GLOB"
backup_age=$(( $(date +%s) - $(stat -c %Y "$latest_backup") ))
(( backup_age <= 86400 )) || fail "yedek 24 saatten eski: $latest_backup"
gzip -t "$latest_backup" || fail "yedek gzip dogrulamasi basarisiz: $latest_backup"
log "Dogrulanan yedek: $latest_backup ($(du -h "$latest_backup" | awk '{print $1}'))"

old_bytes="$(du -sb "$OLD_DATA" | awk '{print $1}')"
free_bytes="$(df -PB1 "$OLD_DATA" | awk 'NR==2 {print $4}')"
min_free_bytes=$(( MIN_FREE_GIB * 1024 * 1024 * 1024 ))
required_bytes=$(( old_bytes + min_free_bytes ))
(( free_bytes >= required_bytes )) || fail "yetersiz disk: en az $((required_bytes / 1024 / 1024 / 1024)) GiB bos alan gerekli"
log "Disk uygun: eski cluster $((old_bytes / 1024 / 1024 / 1024)) GiB, bos $((free_bytes / 1024 / 1024 / 1024)) GiB"

readarray -t db_locale < <(runuser -u postgres -- "$OLD_BIN/psql" -d postgres -Atc \
  "SELECT datcollate, datctype FROM pg_database WHERE datname='template0'")
[[ ${#db_locale[@]} -ge 1 && "${db_locale[0]}" == *"|"* ]] || fail "locale bilgisi okunamadi"
LC_COLLATE="${db_locale[0]%%|*}"
LC_CTYPE="${db_locale[0]#*|}"
ENCODING="$(runuser -u postgres -- "$OLD_BIN/psql" -d postgres -Atc "SHOW server_encoding")"
LISTEN_ADDRESSES="$(runuser -u postgres -- "$OLD_BIN/psql" -d postgres -Atc "SHOW listen_addresses")"
PORT="$(runuser -u postgres -- "$OLD_BIN/psql" -d postgres -Atc "SHOW port")"
log "Kaynak: encoding=$ENCODING lc_collate=$LC_COLLATE lc_ctype=$LC_CTYPE listen=$LISTEN_ADDRESSES port=$PORT"

log "PostgreSQL 18.4 paketleri kuruluyor/guncelleniyor"
dnf -y install postgresql18 postgresql18-server postgresql18-contrib
[[ -x "$NEW_BIN/pg_upgrade" ]] || fail "$NEW_BIN/pg_upgrade bulunamadi"

if [[ -s "$NEW_DATA/PG_VERSION" ]]; then
  fail "$NEW_DATA zaten initialize edilmis. Otomatik olarak silinmedi; once mevcut denemeyi inceleyin."
fi
if [[ -d "$NEW_DATA" ]] && find "$NEW_DATA" -mindepth 1 -maxdepth 1 -print -quit | grep -q .; then
  fail "$NEW_DATA bos degil. Guvenlik nedeniyle otomatik silinmedi."
fi

install -d -o postgres -g postgres -m 700 "$NEW_DATA" "$UPGRADE_DIR"
log "PostgreSQL 18 cluster initialize ediliyor (checksum eski cluster ile uyumlu olarak kapali)"
runuser -u postgres -- "$NEW_BIN/initdb" \
  -D "$NEW_DATA" \
  --encoding="$ENCODING" \
  --lc-collate="$LC_COLLATE" \
  --lc-ctype="$LC_CTYPE" \
  --no-data-checksums

# Preserve local authentication rules. pg_upgrade migrates roles/databases but not config files.
cp -a "$OLD_DATA/pg_hba.conf" "$NEW_DATA/pg_hba.conf"
[[ ! -f "$OLD_DATA/pg_ident.conf" ]] || cp -a "$OLD_DATA/pg_ident.conf" "$NEW_DATA/pg_ident.conf"
chown postgres:postgres "$NEW_DATA/pg_hba.conf" "$NEW_DATA/pg_ident.conf" 2>/dev/null || true

maintenance_started=0
declare -a active_travel_units=()

restore_units() {
  local unit
  for unit in "${active_travel_units[@]:-}"; do
    systemctl start "$unit" >/dev/null 2>&1 || log "UYARI: $unit yeniden baslatilamadi"
  done
}

rollback() {
  local status=$?
  trap - ERR INT TERM
  if (( maintenance_started )); then
    log "Gecis basarisiz; PostgreSQL 17 geri yukleniyor"
    systemctl stop "$NEW_SERVICE" >/dev/null 2>&1 || true
    systemctl disable "$NEW_SERVICE" >/dev/null 2>&1 || true
    systemctl enable "$OLD_SERVICE" >/dev/null 2>&1 || true
    systemctl start "$OLD_SERVICE" >/dev/null 2>&1 || true
    restore_units
    systemctl start travel-api.service travel-web.service >/dev/null 2>&1 || true
  fi
  log "Rollback tamamlandi; eski veri dizini silinmedi. Cikis: $status"
  exit "$status"
}
trap rollback ERR INT TERM

while read -r unit; do
  [[ -n "$unit" ]] && active_travel_units+=("$unit")
done < <(
  {
    systemctl list-units --type=service --state=running 'travel-*' --no-legend --plain 2>/dev/null
    systemctl list-units --type=timer --state=active 'travel-*' --no-legend --plain 2>/dev/null
  } | awk '{print $1}' | sort -u
)

log "Bakim modu: aktif Travel servisleri durduruluyor"
if ((${#active_travel_units[@]})); then
  systemctl stop "${active_travel_units[@]}"
fi
systemctl stop "$NEW_SERVICE" >/dev/null 2>&1 || true
systemctl stop "$OLD_SERVICE"
maintenance_started=1

log "pg_upgrade --check"
runuser -u postgres -- bash -lc \
  "cd '$UPGRADE_DIR' && '$NEW_BIN/pg_upgrade' --old-bindir='$OLD_BIN' --new-bindir='$NEW_BIN' --old-datadir='$OLD_DATA' --new-datadir='$NEW_DATA' --check"

log "pg_upgrade copy modu basliyor"
runuser -u postgres -- bash -lc \
  "cd '$UPGRADE_DIR' && '$NEW_BIN/pg_upgrade' --old-bindir='$OLD_BIN' --new-bindir='$NEW_BIN' --old-datadir='$OLD_DATA' --new-datadir='$NEW_DATA' --jobs='$(nproc)'"

escaped_listen="${LISTEN_ADDRESSES//\'/\'\'}"
cat >> "$NEW_DATA/postgresql.auto.conf" <<EOF

# Rezervasyon Yap PostgreSQL 17 -> 18 migration
listen_addresses = '${escaped_listen}'
port = ${PORT}
EOF
chown postgres:postgres "$NEW_DATA/postgresql.auto.conf"

systemctl disable "$OLD_SERVICE"
systemctl enable "$NEW_SERVICE"
systemctl start "$NEW_SERVICE"
sleep 5

new_version="$(runuser -u postgres -- "$NEW_BIN/psql" -d postgres -Atc "SHOW server_version")"
[[ "$new_version" == 18.* ]] || fail "PostgreSQL 18 dogrulamasi basarisiz: $new_version"
log "PostgreSQL $new_version aktif"

log "Optimizer istatistikleri yenileniyor"
runuser -u postgres -- "$NEW_BIN/vacuumdb" --all --analyze-in-stages --jobs="$(nproc)"

# Start API/web first and validate before restoring background workers/timers.
systemctl start travel-api.service travel-web.service
api_code=""
for _ in $(seq 1 30); do
  api_code="$(curl --noproxy '*' -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:8080/health || true)"
  [[ "$api_code" == "200" ]] && break
  sleep 2
done
[[ "$api_code" == "200" ]] || fail "API health basarisiz: HTTP ${api_code:-000}"

site_code=""
for _ in $(seq 1 30); do
  site_code="$(curl -sS -o /dev/null -w '%{http_code}' https://rezervasyonyap.tr || true)"
  [[ "$site_code" == "200" ]] && break
  sleep 2
done
[[ "$site_code" == "200" ]] || fail "site health basarisiz: HTTP ${site_code:-000}"

restore_units
systemctl reset-failed
maintenance_started=0
trap - ERR INT TERM

log "BASARILI: PostgreSQL $new_version, API $api_code, SITE $site_code"
log "Eski cluster geri donus icin korundu: $OLD_DATA"
log "Eski cluster'i silmeyin; en az 7 gun dogrulama yapin."
