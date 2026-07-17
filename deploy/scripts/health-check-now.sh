#!/usr/bin/env bash
# Genel sunucu sağlık kontrolü — salt okunur, hiçbir şeyi öldürmez/değiştirmez.
#
#   cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
#   ./deploy/scripts/health-check-now.sh
set -uo pipefail

sec() { echo; echo "===== $* ====="; }

sec "uptime / load"
uptime

sec "bellek"
free -h

sec "disk doluluk"
df -h / /var /var/www /tmp 2>/dev/null | awk 'NR==1 || /\/$|\/var|\/tmp/'

sec "vmstat (iowait)"
vmstat 1 4 2>/dev/null || echo "vmstat yok"

sec "D-state (disk bekleyen) süreçler"
ps -eo pid,stat,etime,pcpu,comm,args | awk 'NR==1 || $2 ~ /D/'

sec "CPU top 12"
ps aux --sort=-%cpu | head -13

sec "tehlikeli / ağır arka planlar"
ps aux | grep -E 'backup_agent|backupmng|scheduled_backup|sw-tar|pzstd|usermng|goaccess|yum update|sync-wtatil|sync-travelrobot|refresh.vitrin|import-|rustbolit|imunify-check|imunify-antivirus' | grep -v grep || echo "(yok)"

sec "travel servisleri"
systemctl is-active travel-api travel-web 2>/dev/null
systemctl is-active postgresql-18 postgresql mariadb sw-cp-server psa 2>/dev/null

sec "travel timer'lar (sonraki / son)"
systemctl list-timers 'travel-*' --all --no-pager 2>/dev/null | head -20

sec "yerel HTTP duman testi"
curl -sS -o /dev/null -w "travel-web :3000  -> %{http_code} (%{time_total}s)\n" --max-time 15 http://127.0.0.1:3000/ || echo "travel-web FAIL"
curl -sS -o /dev/null -w "travel-api  :8080  -> %{http_code} (%{time_total}s)\n" --max-time 15 http://127.0.0.1:8080/api/v1/meta || echo "travel-api FAIL"
curl -k -sS -o /dev/null -w "plesk      :8443  -> %{http_code} (%{time_total}s)\n" --max-time 20 https://127.0.0.1:8443/ || echo "plesk FAIL"

sec "kategori sayıları (taze)"
curl -sS --max-time 20 http://127.0.0.1:8080/api/v1/catalog/public/category-stats 2>/dev/null || echo "category-stats FAIL"

sec "PostgreSQL bağlantı / uzun sorgu"
if command -v sudo >/dev/null 2>&1; then
  sudo -u postgres psql -tA -c "select count(*) from pg_stat_activity;" 2>/dev/null || echo "psql fail"
  sudo -u postgres psql -tA -c "select pid, application_name, state, now()-query_start as running_for, left(query,90) from pg_stat_activity where state='active' and now()-query_start > interval '10 seconds' order by running_for desc;" 2>/dev/null || true
else
  echo "sudo yok"
fi

sec "Plesk domain listesi"
plesk bin domain --list 2>/dev/null || echo "plesk cli fail"

sec "vhosts (kalıntı mamonestate / tatil-evi?)"
ls -la /var/www/vhosts/ 2>/dev/null | grep -iE 'mamon|tatil-evi|rezervasyon|reservation' || ls /var/www/vhosts/

sec "Plesk yedek oturumu (aktif mi?)"
ls -lt /usr/local/psa/PMM/sessions 2>/dev/null | head -6

echo
echo "Bitti — çıktıyı olduğu gibi paylaşın."
