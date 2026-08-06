# Travel projesi + PostgreSQL yedek — format öncesi
# Hedef: E:\06.08.2026
#
# PowerShell (Yönetici gerekmez), Laragon PostgreSQL çalışırken:
#   Set-ExecutionPolicy -Scope Process Bypass -Force
#   & "C:\laragon\www\travel\scripts\backup-travel-to-e-drive.ps1"
#
# veya repo yoksa bu dosyayı kaydedip çalıştırın; $TravelRoot'u düzenleyin.

param(
  [string]$TravelRoot = "C:\laragon\www\travel",
  [string]$DestRoot = "E:\06.08.2026",
  [string]$PgBin = "C:\laragon\bin\postgresql\postgresql\bin",
  [string]$PgHost = "127.0.0.1",
  [string]$PgPort = "5432",
  [string]$PgUser = "postgres",
  [string]$PgDb = "travel"
)

$ErrorActionPreference = "Stop"

function Step([string]$msg) {
  Write-Host ""
  Write-Host "==> $msg" -ForegroundColor Cyan
}

function Require-Path([string]$path, [string]$label) {
  if (-not (Test-Path -LiteralPath $path)) {
    throw "$label bulunamadı: $path"
  }
}

Step "Kontroller"
Require-Path $TravelRoot "Travel kökü"
Require-Path $DestRoot.Substring(0, 3) "Hedef disk ($($DestRoot.Substring(0, 3)))"
$pgDump = Join-Path $PgBin "pg_dump.exe"
$psql = Join-Path $PgBin "psql.exe"
Require-Path $pgDump "pg_dump.exe"
Require-Path $psql "psql.exe"

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$dest = Join-Path $DestRoot "travel-backup-$stamp"
$codeDir = Join-Path $dest "code"
$dbDir = Join-Path $dest "database"
$metaDir = Join-Path $dest "meta"

New-Item -ItemType Directory -Force -Path $codeDir, $dbDir, $metaDir | Out-Null
Write-Host "Hedef: $dest"

Step "Proje kopyası (node_modules / .next / build hariç)"
$excludeDirs = @(
  "node_modules",
  ".next",
  "frontend\node_modules",
  "frontend\.next",
  "backend\build",
  "backend\target",
  ".git\objects", # sonra git bundle alınacak; tam .git isteğe bağlı
  "tmp",
  ".deploy",
  "coverage",
  "playwright-report"
)

# robocopy: /MIR değil /E — hedefte silme yok
$robolog = Join-Path $metaDir "robocopy-code.log"
$xd = @()
foreach ($d in $excludeDirs) { $xd += "/XD"; $xd += $d }

# Büyük/geçici dosya uzantıları
$xf = @("/XF", "*.log", "*.dump", "erl_crash.dump")

& robocopy $TravelRoot $codeDir /E /COPY:DAT /R:1 /W:1 /NFL /NDL /NP @xd @xf /LOG:$robolog
# robocopy exit 0-7 = başarı
if ($LASTEXITCODE -ge 8) {
  throw "robocopy başarısız (exit $LASTEXITCODE). Log: $robolog"
}
Write-Host "Kod kopyalandı (robocopy exit $LASTEXITCODE)."

Step "Git bundle (tüm branch/tag — format sonrası clone için)"
$git = Get-Command git -ErrorAction SilentlyContinue
if ($git -and (Test-Path (Join-Path $TravelRoot ".git"))) {
  Push-Location $TravelRoot
  try {
    $bundle = Join-Path $dbDir "travel-all.git.bundle"
    & git bundle create $bundle --all
    & git rev-parse HEAD | Out-File -Encoding utf8 (Join-Path $metaDir "HEAD.txt")
    & git remote -v | Out-File -Encoding utf8 (Join-Path $metaDir "remotes.txt")
    & git status -sb | Out-File -Encoding utf8 (Join-Path $metaDir "git-status.txt")
    Write-Host "Bundle: $bundle"
  } finally {
    Pop-Location
  }
} else {
  Write-Warning "git yok veya .git yok — bundle atlandı; code/ klasörü yeterli."
}

Step "PostgreSQL dump (custom + düz SQL)"
$env:PGPASSWORD = ""  # Laragon genelde trust / boş
$dumpCustom = Join-Path $dbDir "travel.dump"
$dumpSql = Join-Path $dbDir "travel.sql"
$dumpGlobals = Join-Path $dbDir "globals.sql"

# Bağlantı smoke
& $psql -h $PgHost -p $PgPort -U $PgUser -d $PgDb -c "SELECT current_database(), now();" | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "PostgreSQL'e bağlanılamadı ($PgHost:$PgPort db=$PgDb user=$PgUser). Laragon PostgreSQL çalışıyor mu?"
}

& $pgDump -h $PgHost -p $PgPort -U $PgUser -d $PgDb -Fc -f $dumpCustom
if ($LASTEXITCODE -ne 0) { throw "pg_dump -Fc başarısız" }

& $pgDump -h $PgHost -p $PgPort -U $PgUser -d $PgDb --no-owner --no-acl -f $dumpSql
if ($LASTEXITCODE -ne 0) { throw "pg_dump SQL başarısız" }

$pgDumpall = Join-Path $PgBin "pg_dumpall.exe"
if (Test-Path $pgDumpall) {
  & $pgDumpall -h $PgHost -p $PgPort -U $PgUser --globals-only -f $dumpGlobals 2>$null
}

# Hızlı sayımlar
& $psql -h $PgHost -p $PgPort -U $PgUser -d $PgDb -t -A -c @"
SELECT 'listings=' || count(*)::text FROM listings
UNION ALL SELECT 'listing_translations=' || count(*)::text FROM listing_translations
UNION ALL SELECT 'listing_attributes=' || count(*)::text FROM listing_attributes;
"@ | Out-File -Encoding utf8 (Join-Path $metaDir "row-counts.txt")

Step "Ortam dosyaları (varsa — şifre içerir, USB'yi güvende tutun)"
$envFiles = @(
  "backend\backend.env",
  "frontend\.env.local",
  "frontend\.env",
  ".env"
)
$envDest = Join-Path $dest "env-secrets"
New-Item -ItemType Directory -Force -Path $envDest | Out-Null
foreach ($rel in $envFiles) {
  $src = Join-Path $TravelRoot $rel
  if (Test-Path -LiteralPath $src) {
    Copy-Item -LiteralPath $src -Destination (Join-Path $envDest (Split-Path $rel -Leaf)) -Force
    Write-Host "  + $rel"
  }
}

Step "RESTORE.md yaz"
$restore = @"
# Travel yedek — geri yükleme (format sonrası)

Yedek klasörü: ``$dest``

## 1) Kod

Tercihen GitHub'dan:
``````
git clone https://github.com/mamongrup/rezervasyonyap.git C:\laragon\www\travel
cd C:\laragon\www\travel
git checkout main
git pull
``````

veya bundle:
``````
git clone "$dbDir\travel-all.git.bundle" C:\laragon\www\travel
``````

veya doğrudan ``code\`` klasörünü ``C:\laragon\www\travel`` olarak kopyalayın.

## 2) PostgreSQL

Laragon PostgreSQL'i başlatın, sonra:

``````
& "$PgBin\psql.exe" -h 127.0.0.1 -U postgres -c "CREATE DATABASE travel;"
& "$PgBin\pg_restore.exe" -h 127.0.0.1 -U postgres -d travel --no-owner --clean --if-exists "$dumpCustom"
``````

``pg_restore`` sorun olursa düz SQL:
``````
& "$PgBin\psql.exe" -h 127.0.0.1 -U postgres -d travel -f "$dumpSql"
``````

## 3) Env

``env-secrets\`` içindeki ``backend.env`` → ``backend\backend.env``
``.env.local`` → ``frontend\.env.local``

## 4) Çalıştırma

``````
cd C:\laragon\www\travel\backend
gleam run

cd C:\laragon\www\travel\frontend
npm ci
npm run dev
``````
"@
$restore | Out-File -Encoding utf8 (Join-Path $dest "RESTORE.md")

# Özet boyutlar
Step "Özet"
Get-ChildItem $dest -Recurse -File |
  Measure-Object -Property Length -Sum |
  ForEach-Object { "Toplam: {0:N1} MB" -f ($_.Sum / 1MB) } |
  Tee-Object -FilePath (Join-Path $metaDir "size.txt")

Write-Host ""
Write-Host "TAMAM — yedek hazır:" -ForegroundColor Green
Write-Host "  $dest"
Write-Host "  database\travel.dump  (pg_restore)"
Write-Host "  database\travel.sql   (psql -f)"
Write-Host "  code\                 (proje)"
Write-Host "  RESTORE.md"
Write-Host ""
Write-Host "Format öncesi E: diskini / USB'yi doğrulayın." -ForegroundColor Yellow
