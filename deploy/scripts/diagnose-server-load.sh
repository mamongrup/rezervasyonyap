#!/usr/bin/env bash
# Sunucu yavaşlığı / disk I/O teşhisi — tek seferlik, salt-okunur.
# Hiçbir şeyi değiştirmez, öldürmez; yalnız çıktı toplar.
#
#   cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
#   ./deploy/scripts/diagnose-server-load.sh
#
# Çıktıyı olduğu gibi paylaşın.
set -uo pipefail

sec() { echo; echo "===== $* ====="; }

sec "uptime / load"
uptime

sec "free -h"
free -h

sec "df -h (disk)"
df -h

sec "CPU'ya göre ilk 15 süreç"
ps aux --sort=-%cpu | head -16

sec "belleğe göre ilk 15 süreç"
ps aux --sort=-%mem | head -16

sec "vmstat 1 5 (CPU/IO/swap örneklemesi)"
vmstat 1 5 2>/dev/null || echo "vmstat yok"

sec "iostat -dx 2 3 (disk I/O, varsa)"
if command -v iostat >/dev/null 2>&1; then
  iostat -dx 2 3
else
  echo "iostat yok (sysstat paketi kurulu değil)"
fi

sec "en çok travel-* systemd birimi (CPU/Bellek)"
systemctl status travel-api.service travel-web.service --no-pager -l 2>/dev/null | head -60

sec "TÜM etkin travel-* timer'lar (sadece purge değil)"
systemctl list-timers 'travel-*' --all --no-pager

sec "Son 15 dakikada tetiklenen travel-* servisleri"
journalctl --since "-15min" -u 'travel-*' --no-pager 2>/dev/null | tail -100

sec "PostgreSQL: application_name bazında bağlantı sayısı"
if [[ -f deploy/scripts/lib/psql-env.sh ]]; then
  source deploy/scripts/lib/psql-env.sh
  load_travel_db_env 2>/dev/null || true
  psql_travel -tA -c "select application_name, state, count(*) from pg_stat_activity group by 1,2 order by 3 desc limit 20;" 2>/dev/null \
    || sudo -u postgres psql -tA -c "select application_name, state, count(*) from pg_stat_activity group by 1,2 order by 3 desc limit 20;" 2>/dev/null \
    || echo "psql erişimi başarısız"
else
  echo "deploy/scripts/lib/psql-env.sh bulunamadı"
fi

sec "PostgreSQL: 30s+ süren aktif sorgular"
if [[ -f deploy/scripts/lib/psql-env.sh ]]; then
  source deploy/scripts/lib/psql-env.sh
  load_travel_db_env 2>/dev/null || true
  psql_travel -tA -c "select pid, application_name, state, now()-query_start as running_for, left(query,120) from pg_stat_activity where state='active' and now()-query_start > interval '30 seconds' order by running_for desc;" 2>/dev/null \
    || sudo -u postgres psql -tA -c "select pid, application_name, state, now()-query_start as running_for, left(query,120) from pg_stat_activity where state='active' and now()-query_start > interval '30 seconds' order by running_for desc;" 2>/dev/null \
    || echo "psql erişimi başarısız"
fi

sec "PostgreSQL: en şişkin tablolar (dead tuple)"
if [[ -f deploy/scripts/lib/psql-env.sh ]]; then
  source deploy/scripts/lib/psql-env.sh
  load_travel_db_env 2>/dev/null || true
  psql_travel -tA -c "select relname, n_live_tup, n_dead_tup, last_autovacuum, last_vacuum from pg_stat_user_tables order by n_dead_tup desc limit 10;" 2>/dev/null \
    || sudo -u postgres psql -tA -c "select relname, n_live_tup, n_dead_tup, last_autovacuum, last_vacuum from pg_stat_user_tables order by n_dead_tup desc limit 10;" 2>/dev/null \
    || echo "psql erişimi başarısız"
fi

sec "en büyük 15 dizin (/var, /opt, /tmp altında)"
du -xh --max-depth=3 /var/www/vhosts/rezervasyonyap.tr /var/log /opt /tmp 2>/dev/null | sort -rh | head -15

sec "günlük döngüsündeki en büyük 10 log dosyası"
find /var/log /var/www/vhosts/rezervasyonyap.tr -type f -size +50M 2>/dev/null -exec du -h {} \; | sort -rh | head -10

sec "cron / at (ek zamanlanmış işler)"
crontab -l 2>/dev/null || echo "kullanıcı crontab yok"
ls /etc/cron.d/ 2>/dev/null

echo
echo "Bitti — çıktıyı olduğu gibi paylaşın."
