# Excalibur (yerel MySQL dump) -> URETIM PostgreSQL (travel).
# Sunucuda MariaDB GEREKMEZ. Veri hedefi tek: PostgreSQL.
#
# Oncelik:
#   1) Laragon'da dump import: .\scripts\import-excalibur-mysql.ps1
#   2) Bu script: PC'den uretim PG'ye sync
#
# Ornek:
#   .\scripts\push-excalibur-to-postgresql.ps1 -Server 50.114.185.100 -User root
#   .\scripts\push-excalibur-to-postgresql.ps1 -Server 50.114.185.100 -MysqlDatabase rezervasyonyap

param(
    [Parameter(Mandatory = $true)]
    [string]$Server,
    [string]$User = 'root',
    [int]$SshPort = 22,
    [int]$TunnelLocalPort = 15432,
    [string]$RemoteBackendEnv = '/etc/rezervasyonyap/backend.env',
    [string]$MysqlDatabase = 'rezervasyonyapco_excalibur',
    [string]$MysqlHost = '127.0.0.1',
    [string]$MysqlUser = 'root',
    [string]$MysqlPassword = '',
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$travelRoot = Split-Path -Parent $PSScriptRoot

foreach ($cmd in @('ssh', 'node')) {
    $null = Get-Command $cmd -ErrorAction Stop
}

$mysqlExe = Get-ChildItem -Path 'C:\laragon\bin\mysql' -Filter mysql.exe -Recurse -ErrorAction SilentlyContinue |
    Select-Object -First 1
if (-not $mysqlExe) {
    Write-Error 'Laragon mysql.exe bulunamadi. Once import-excalibur-mysql.ps1 calistirin.'
}

Write-Host '=== Yerel MySQL (dump kaynagi) ===' -ForegroundColor Cyan
$countSql = "SELECT COUNT(*) AS c FROM bravo_spaces WHERE deleted_at IS NULL AND status='publish';"
$mysqlArgs = @('-h', $MysqlHost, '-u', $MysqlUser)
if ($MysqlPassword) { $mysqlArgs += "-p$MysqlPassword" }
$mysqlArgs += @($MysqlDatabase, '-N', '-e', $countSql)
$prevEap = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
$countOut = (& $mysqlExe.FullName @mysqlArgs 2>&1 | Where-Object { $_ -isnot [System.Management.Automation.ErrorRecord] }) -join "`n"
$mysqlExit = $LASTEXITCODE
$ErrorActionPreference = $prevEap
if ($mysqlExit -ne 0) {
    Write-Host $countOut
    Write-Error "Yerel MySQL '$MysqlDatabase' okunamadi. .\scripts\import-excalibur-mysql.ps1"
}
Write-Host "  bravo_spaces (publish): $countOut"

Write-Host '=== Uretim PostgreSQL baglantisi (backend.env PG*) ===' -ForegroundColor Cyan
# backend.env artik DATABASE_URL yerine PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD kullaniyor.
$envRemote = & ssh -p $SshPort "${User}@${Server}" "grep -E '^(PGHOST|PGPORT|PGDATABASE|PGUSER|PGPASSWORD)=' '$RemoteBackendEnv'"
if ($LASTEXITCODE -ne 0) { Write-Error 'SSH veya backend.env okunamadi.' }

$pg = @{}
foreach ($line in ($envRemote -split "`n")) {
    if ($line -match '^(PG[A-Z]+)=(.*)$') {
        $pg[$matches[1]] = $matches[2].Trim().Trim('"').Trim("'")
    }
}
$pgUser = $pg['PGUSER']
$pgPass = $pg['PGPASSWORD']
$pgDb = $pg['PGDATABASE']
$pgRemoteHost = if ($pg['PGHOST']) { $pg['PGHOST'] } else { '127.0.0.1' }
$pgRemotePort = if ($pg['PGPORT']) { $pg['PGPORT'] } else { '5432' }
if (-not $pgUser -or -not $pgDb) { Write-Error "backend.env PG* eksik (PGUSER/PGDATABASE): $RemoteBackendEnv" }
Write-Host "  hedef DB: $pgDb @ ${pgRemoteHost}:$pgRemotePort (kullanici: $pgUser)"

Write-Host "=== SSH tunel (localhost:$TunnelLocalPort -> ${pgRemoteHost}:$pgRemotePort) ===" -ForegroundColor Cyan
$tunnel = Start-Process -FilePath 'ssh' -ArgumentList @(
    '-p', "$SshPort",
    '-N',
    '-L', "${TunnelLocalPort}:${pgRemoteHost}:$pgRemotePort",
    '-o', 'ExitOnForwardFailure=yes',
    "${User}@${Server}"
) -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 2
if ($tunnel.HasExited) {
    Write-Error 'SSH tunel acilamadi. OpenSSH ve sunucu erisimi kontrol edin.'
}

try {
    Push-Location $travelRoot
    # PG* ile baglan (DATABASE_URL bos -> sync-excalibur PG* kullanir; backend.env PC'de yok).
    $env:DATABASE_URL = ''
    $env:TRAVEL_DB_ENV = ''
    $env:PGHOST = '127.0.0.1'
    $env:PGPORT = "$TunnelLocalPort"
    $env:PGUSER = $pgUser
    $env:PGPASSWORD = $pgPass
    $env:PGDATABASE = $pgDb
    $env:MYSQL_HOST = $MysqlHost
    $env:MYSQL_USER = $MysqlUser
    $env:MYSQL_PASSWORD = $MysqlPassword
    $env:MYSQL_DATABASE = $MysqlDatabase

    $importArgs = @(
        'scripts/import-bravo-spaces.mjs',
        '--mysql-database', $MysqlDatabase,
        '--create-missing-only',
        '--skip-images'
    )
    if ($DryRun) { $importArgs += '--dry-run' }

    Write-Host '=== 1/4 Yeni ilanlar (once eksikler) ===' -ForegroundColor Yellow
    & node @importArgs
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    $nodeArgs = @('scripts/sync-excalibur-bravo.mjs', '--mysql-database', $MysqlDatabase)
    if ($DryRun) { $nodeArgs += '--dry-run' }

    Write-Host '=== 2/4 Takvim + fiyat sync (tum eslesen ilanlar) ===' -ForegroundColor Yellow
    & node @nodeArgs
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    if (-not $DryRun) {
        Write-Host '=== 3/4 Tutarlilik denetimi ===' -ForegroundColor Yellow
        & node scripts/audit-excalibur-sync.mjs --mysql-database $MysqlDatabase --fail-on-mismatch
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

        Write-Host '=== 4/4 Vitrin fiyat onbellegi ===' -ForegroundColor Yellow
        & node scripts/audit-excalibur-sync.mjs --mysql-database $MysqlDatabase --refresh-vitrin
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    }

    Write-Host ''
    Write-Host 'Tamam. Veri uretim PostgreSQL travel icinde.' -ForegroundColor Green
    Write-Host 'Sunucudaki MariaDB/rezervasyonyap silinebilir; site onu kullanmaz.' -ForegroundColor Green
} finally {
    Pop-Location
    if ($tunnel -and -not $tunnel.HasExited) {
        Stop-Process -Id $tunnel.Id -Force -ErrorAction SilentlyContinue
    }
}
