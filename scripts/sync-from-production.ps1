# sync-from-production.ps1
# Üretim (rezervasyonyap.tr) -> yerel. Sunucuya veri YAZMAZ.
#
# Sadece veritabanı için kısayol:
#   .\scripts\sync-db-from-production.ps1 -Server 50.114.185.100 -User PLESK_KULLANICI
#
# DB + uploads:
#   .\scripts\sync-from-production.ps1 -Server 50.114.185.100 -User PLESK_KULLANICI
#
param(
    [Parameter(Mandatory = $true)]
    [string]$Server,
    [string]$User = 'root',
    [int]$Port = 22,
    [string]$RemoteHttpdocs = '/var/www/vhosts/rezervasyonyap.tr/httpdocs',
    [string]$RemoteBackendEnv = '/etc/rezervasyonyap/backend.env',
    [switch]$SkipDb,
    [switch]$SkipUploads,
    [switch]$SkipEnvFiles,
    [switch]$DownloadOnly,
    [switch]$KeepLocalUploadsBackup,
    [ValidateSet('merge', 'replace')]
    [string]$UploadsMode = 'replace'
)

$ErrorActionPreference = 'Stop'

$travelRoot = Split-Path -Parent $PSScriptRoot
$ts = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupRoot = Join-Path $travelRoot "backups\prod-sync-$ts"
$localUploads = Join-Path $travelRoot 'frontend\public\uploads'
$pgBin = 'C:\laragon\bin\postgresql\postgresql-18.4\bin'
$psql = Join-Path $pgBin 'psql.exe'
$pgRestore = Join-Path $pgBin 'pg_restore.exe'
$localDump = Join-Path $backupRoot 'travel-prod.dump'

foreach ($cmd in @('ssh', 'scp')) {
    $null = Get-Command $cmd -ErrorAction Stop
}
if (-not $SkipDb) {
    foreach ($exe in @($psql, $pgRestore)) {
        if (-not (Test-Path $exe)) {
            Write-Error "PostgreSQL aracı yok: $exe (Laragon PostgreSQL kurulu mu?)"
        }
    }
}

New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null

function Invoke-Ssh([string]$RemoteCommand, [switch]$CaptureOutput) {
    $sshArgs = @('-p', "$Port", "${User}@${Server}", $RemoteCommand)
    if ($CaptureOutput) {
        $out = & ssh @sshArgs 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "SSH hata (kod $LASTEXITCODE): $RemoteCommand`n$out"
        }
        return $out
    }
    & ssh @sshArgs
    if ($LASTEXITCODE -ne 0) {
        throw "SSH hata (kod $LASTEXITCODE): $RemoteCommand"
    }
}

function Invoke-ScpDown([string]$RemotePath, [string]$LocalPath) {
    $parent = Split-Path -Parent $LocalPath
    if ($parent -and -not (Test-Path $parent)) {
        New-Item -ItemType Directory -Force -Path $parent | Out-Null
    }
    $scpArgs = @('-P', "$Port", "${User}@${Server}:${RemotePath}", $LocalPath)
    & scp @scpArgs
    if ($LASTEXITCODE -ne 0) {
        throw "scp indirme hata (kod $LASTEXITCODE): $RemotePath"
    }
}

Write-Host "=== Üretim -> yerel senkron ===" -ForegroundColor Cyan
Write-Host "Sunucu:     ${User}@${Server}:${Port}"
Write-Host "Httpdocs:   $RemoteHttpdocs"
Write-Host "Yedek klasör: $backupRoot"
Write-Host ""

if (-not $SkipEnvFiles) {
    Write-Host '=== 0) Ortam dosyalari (referans, repoya koymayin) ===' -ForegroundColor Cyan
    foreach ($pair in @(
            @{ Remote = $RemoteBackendEnv; Local = Join-Path $backupRoot 'backend.env.server' },
            @{ Remote = '/etc/rezervasyonyap/frontend.env'; Local = Join-Path $backupRoot 'frontend.env.server' }
        )) {
        try {
            Invoke-ScpDown $pair.Remote $pair.Local
            Write-Host "  indirildi: $($pair.Local)"
        } catch {
            Write-Host ('  atlandi: {0} - {1}' -f $pair.Remote, $_.Exception.Message) -ForegroundColor Yellow
        }
    }
    Write-Host ""
}

if (-not $SkipDb) {
    Write-Host '=== 1) PostgreSQL dump (sunucu) ===' -ForegroundColor Cyan
    $remoteDump = "/tmp/travel-prod-sync-$ts.dump"
    $exportCmd = @(
        'set -euo pipefail'
        "ENV='$RemoteBackendEnv'"
        "OUT='$remoteDump'"
        'command -v pg_dump >/dev/null'
        'set -a; source "$ENV"; set +a'
        'if [ -n "${DATABASE_URL:-}" ]; then pg_dump "$DATABASE_URL" -Fc --no-owner --no-acl -f "$OUT"; else pg_dump -h "${PGHOST:-127.0.0.1}" -p "${PGPORT:-5432}" -U "${PGUSER:-postgres}" -d "${PGDATABASE:-travel}" -Fc --no-owner --no-acl -f "$OUT"; fi'
        'echo "$OUT"'
    ) -join '; '
    $dumpPath = (Invoke-Ssh $exportCmd -CaptureOutput | Select-Object -Last 1).ToString().Trim()
    if (-not $dumpPath) { $dumpPath = $remoteDump }

    Write-Host '=== 2) Dump indir ===' -ForegroundColor Cyan
    Invoke-ScpDown $dumpPath $localDump
    Invoke-Ssh "rm -f '$dumpPath'" | Out-Null

    $sizeMb = [math]::Round((Get-Item $localDump).Length / 1MB, 1)
    Write-Host ('  dump: {0} ({1} MB)' -f $localDump, $sizeMb)

    if ($DownloadOnly) {
        Write-Host '  DownloadOnly: yerel travel DB degistirilmedi.'
        Write-Host ''
    } else {
        Write-Host '=== 3) Yerel travel DB geri yukle ===' -ForegroundColor Cyan
        $env:PGPASSWORD = ''
        $terminateSql = 'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = ''travel'' AND pid <> pg_backend_pid();'
        & $psql -h 127.0.0.1 -p 5432 -U postgres -d postgres -v ON_ERROR_STOP=1 -c $terminateSql
        & $psql -h 127.0.0.1 -p 5432 -U postgres -d postgres -v ON_ERROR_STOP=1 -c 'DROP DATABASE IF EXISTS travel;'
        & $psql -h 127.0.0.1 -p 5432 -U postgres -d postgres -v ON_ERROR_STOP=1 -c 'CREATE DATABASE travel;'
        & $pgRestore -h 127.0.0.1 -p 5432 -U postgres -d travel --no-owner --no-acl --if-exists --clean $localDump
        if ($LASTEXITCODE -ne 0) {
            Write-Host ('pg_restore uyari kodu: {0} (cogu zaman guvenli)' -f $LASTEXITCODE) -ForegroundColor Yellow
        }

        $countSql = 'SELECT string_agg(pc.code || ''='' || cnt::text, '', '' ORDER BY pc.code) FROM (SELECT l.category_id, count(*) cnt FROM listings l GROUP BY l.category_id) x JOIN product_categories pc ON pc.id = x.category_id;'
        $counts = & $psql -h 127.0.0.1 -p 5432 -U postgres -d travel -t -A -c $countSql
        Write-Host "  DB yuklendi. Ilan ozeti: $($counts.Trim())"
        Write-Host ''
    }
}

if (-not $SkipUploads) {
    $remoteUploads = "$RemoteHttpdocs/frontend/public/uploads"
    Write-Host "=== 4) Uploads indir ($UploadsMode) ===" -ForegroundColor Cyan  # uploads mode safe in double quotes
    Write-Host "  uzak: $remoteUploads"
    Write-Host "  yerel: $localUploads"
    Write-Host '  (buyuk - saatler surebilir; kesilirse komutu tekrar calistirin)'
    Write-Host ""

    if ($KeepLocalUploadsBackup -and (Test-Path $localUploads)) {
        $localBackup = Join-Path $backupRoot 'uploads-local-before-sync'
        Write-Host "  yerel uploads yedekleniyor -> $localBackup"
        Copy-Item -Path $localUploads -Destination $localBackup -Recurse -Force
    }

    if ($UploadsMode -eq 'replace' -and (Test-Path $localUploads)) {
        Remove-Item -Path $localUploads -Recurse -Force
    }
    $uploadParent = Split-Path -Parent $localUploads
    if (-not (Test-Path $uploadParent)) {
        New-Item -ItemType Directory -Force -Path $uploadParent | Out-Null
    }

    $scpArgs = @('-P', "$Port", '-r', "${User}@${Server}:${remoteUploads}", $uploadParent)
    & scp @scpArgs
    if ($LASTEXITCODE -ne 0) {
        throw "uploads scp hata (kod $LASTEXITCODE)"
    }
    Write-Host "  uploads tamam."
    Write-Host ""
}

Write-Host "=== Yerel doğrulama ===" -ForegroundColor Cyan
Push-Location $travelRoot
node scripts/audit-bravo-import.mjs
if (-not $SkipUploads) {
    node scripts/verify-local-files-vs-db.mjs
} else {
    Write-Host '  (uploads senkron degil - verify-local-files-vs-db atlandi)' -ForegroundColor DarkGray
}
Pop-Location

Write-Host ""
Write-Host "Tamam. Yedekler: $backupRoot" -ForegroundColor Green
if (-not $SkipUploads) {
    Write-Host "Sunucuyu silmeden once dump + uploads yedeklerinin boyutunu kontrol edin."
} else {
    Write-Host "Dump: $localDump"
}
