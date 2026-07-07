#!/usr/bin/env bash
# Sunucu donanım + gerçek performans teşhisi (rezervasyonyap.tr VPS).
#
# "Datacenter söz verdiği hizmeti vermiyor" şüphesini kanıt/çürütmek için:
#   - CPU model / çekirdek / frekans
#   - CPU STEAL time (hypervisor CPU'yu başka VM'lere kaptırıyor mu → oversold host)
#   - I/O wait, load average
#   - RAM / swap
#   - Disk yazma + okuma hızı (dd, kısa & güvenli, sonra temizler)
#   - Network indirme hızı
#   - Basit CPU benchmark (tek çekirdek compute süresi)
#   - Uygulama: travel-api / travel-web bellek + PostgreSQL bağlantı sayısı
#
# Kullanım (sunucuda repo kökünden):
#   chmod +x deploy/scripts/server-benchmark.sh
#   ./deploy/scripts/server-benchmark.sh
#
# Hiçbir kalıcı değişiklik yapmaz; yalnız /tmp'de geçici test dosyası oluşturup siler.

set -uo pipefail

line() { printf '%s\n' "----------------------------------------------------------------"; }
hdr()  { printf '\n== %s ==\n' "$1"; }

hdr "TARİH / HOST"
date
hostname
uptime

hdr "CPU DONANIMI"
if command -v lscpu >/dev/null 2>&1; then
  lscpu | grep -Ei 'model name|^cpu\(s\)|socket|core|thread|mhz|hypervisor|vendor|bogomips' || lscpu
else
  grep -Ei 'model name|cpu MHz' /proc/cpuinfo | sort -u
  printf 'vCPU sayısı: %s\n' "$(nproc)"
fi

hdr "SANALLAŞTIRMA"
if command -v systemd-detect-virt >/dev/null 2>&1; then
  printf 'virt: %s\n' "$(systemd-detect-virt || echo bilinmiyor)"
fi
grep -m1 hypervisor /proc/cpuinfo >/dev/null 2>&1 && echo "hypervisor flag: VAR (sanal makine)" || echo "hypervisor flag: yok (fiziksel olabilir)"

hdr "RAM / SWAP"
free -h

hdr "DİSK KULLANIMI"
df -h / 2>/dev/null

hdr "LOAD AVERAGE"
cat /proc/loadavg
printf 'vCPU: %s  → load, vCPU sayısından çok yüksekse CPU darboğazı var.\n' "$(nproc)"

hdr "CPU STEAL / IOWAIT (vmstat 1x5) — EN ÖNEMLİ"
echo "st sütunu = STEAL. Sürekli >1-2 ise hypervisor CPU'yu başka VM'lere veriyor (oversold host)."
echo "wa sütunu = IOWAIT. Yüksekse disk yavaş."
if command -v vmstat >/dev/null 2>&1; then
  vmstat 1 5
else
  echo "vmstat yok — 'apt install sysstat procps' önerilir."
fi

hdr "mpstat (steal detay, varsa)"
if command -v mpstat >/dev/null 2>&1; then
  mpstat 1 3
else
  echo "mpstat yok (paket: sysstat). Atlanıyor."
fi

hdr "TEK ÇEKİRDEK CPU BENCHMARK"
echo "Aşağıdaki süre DÜŞÜK olmalı. Referans: modern vCPU ~1.5-4 sn. >8 sn ise CPU çok zayıf/kısıtlı."
if command -v python3 >/dev/null 2>&1; then
  /usr/bin/time -v python3 -c "s=0
for i in range(30000000): s+=i*i%7
print('sonuc',s)" 2>&1 | grep -Ei 'Elapsed|wall clock|sonuc' || \
  { t0=$(date +%s.%N); python3 -c "s=0
for i in range(30000000): s+=i*i%7"; t1=$(date +%s.%N); echo "süre: $(echo "$t1-$t0"|bc) sn"; }
else
  t0=$(date +%s.%N)
  i=0; s=0; while [ "$i" -lt 2000000 ]; do s=$((s+i)); i=$((i+1)); done
  t1=$(date +%s.%N)
  echo "shell döngü süre: $(awk "BEGIN{print $t1-$t0}") sn (python3 yok, kaba ölçüm)"
fi

hdr "DİSK YAZMA HIZI (dd 1GB, direct)"
echo "Referans: SSD ~200-1000 MB/s, iyi NVMe >1 GB/s. <80 MB/s ise disk çok yavaş/HDD."
TESTF="/tmp/.srvbench.$$"
dd if=/dev/zero of="$TESTF" bs=1M count=1024 oflag=direct 2>&1 | tail -1 || echo "dd yazma testi başarısız"
sync

hdr "DİSK OKUMA HIZI (dd, önbellek atlanır)"
if [ -f "$TESTF" ]; then
  # sayfa önbelleğini düşürmeyi dene (yetki varsa)
  sync; echo 3 > /proc/sys/vm/drop_caches 2>/dev/null || true
  dd if="$TESTF" of=/dev/null bs=1M 2>&1 | tail -1 || echo "dd okuma testi başarısız"
fi
rm -f "$TESTF"

hdr "hdparm okuma (varsa)"
ROOT_DEV="$(df / --output=source 2>/dev/null | tail -1)"
if command -v hdparm >/dev/null 2>&1 && [ -n "$ROOT_DEV" ] && [ -b "$ROOT_DEV" ]; then
  hdparm -Tt "$ROOT_DEV" 2>/dev/null || echo "hdparm çalıştırılamadı ($ROOT_DEV)"
else
  echo "hdparm yok veya kök blok aygıtı belirlenemedi. Atlanıyor."
fi

hdr "NETWORK İNDİRME HIZI"
echo "Referans: iyi datacenter >200 Mbit/s. Çok düşükse ağ kısıtlı."
if command -v speedtest-cli >/dev/null 2>&1; then
  speedtest-cli --simple 2>/dev/null || echo "speedtest-cli hata"
else
  # 100MB test dosyası indir, hızı curl raporlasın
  echo "speedtest-cli yok; 100MB test indiriliyor (Cachefly)..."
  curl -o /dev/null -s -w 'indirme hızı: %{speed_download} B/s (%{size_download} bayt, %{time_total} sn)\n' \
    https://cachefly.cachefly.net/100mb.test 2>/dev/null || echo "curl indirme testi başarısız"
fi

hdr "UYGULAMA SERVİS BELLEĞİ"
for svc in travel-api travel-web; do
  if systemctl is-active --quiet "$svc" 2>/dev/null; then
    mem="$(systemctl show "$svc" -p MemoryCurrent --value 2>/dev/null)"
    if [ -n "$mem" ] && [ "$mem" != "[not set]" ]; then
      printf '%s: %s MB\n' "$svc" "$((mem/1024/1024))"
    else
      printf '%s: aktif (bellek okunamadı)\n' "$svc"
    fi
  else
    printf '%s: AKTİF DEĞİL\n' "$svc"
  fi
done

hdr "POSTGRESQL BAĞLANTI SAYISI"
if command -v sudo >/dev/null 2>&1; then
  sudo -u postgres psql -tc "select usename, count(*) from pg_stat_activity group by 1 order by 2 desc;" 2>/dev/null \
    || echo "psql sorgusu çalışmadı (yetki/erişim)."
fi
echo "Not: travel_prod ~10 olmalı. >30 ise orphan bağlantı (runbook §5)."

hdr "EN ÇOK CPU/RAM KULLANAN 8 SÜREÇ"
ps -eo pid,pcpu,pmem,comm --sort=-pcpu 2>/dev/null | head -9

line
echo "TAMAMLANDI. Yorum için kritik satırlar: vmstat 'st' (steal), dd MB/s, benchmark süresi."
