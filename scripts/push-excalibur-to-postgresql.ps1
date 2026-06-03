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
$countOut = & $mysqlExe.FullName @mysqlArgs 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host $countOut
    Write-Error "Yerel MySQL '$MysqlDatabase' okunamadi. .\scripts\import-excalibur-mysql.ps1"
}
Write-Host "  bravo_spaces (publish): $countOut"

Write-Host '=== Uretim PostgreSQL baglantisi (backend.env) ===' -ForegroundColor Cyan
$envRemote = & ssh -p $SshPort "${User}@${Server}" "grep -E '^DATABASE_URL=' '$RemoteBackendEnv' | head -1"
if ($LASTEXITCODE -ne 0) { Write-Error 'SSH veya backend.env okunamadi.' }
if (-not $envRemote -or $envRemote -notmatch '^DATABASE_URL=(.+)$') {
    Write-Error "Sunucuda DATABASE_URL okunamadi: $RemoteBackendEnv"
}
$prodUrl = $matches[1].Trim().Trim('"').Trim("'")
$uri = [Uri]$prodUrl
$pgRemotePort = if ($uri.Port -gt 0) { $uri.Port } else { 5432 }
$pgUser = [Uri]::UnescapeDataString($uri.UserInfo.Split(':')[0])
$pgPass = [Uri]::UnescapeDataString($uri.UserInfo.Split(':')[1])
$pgDb = $uri.AbsolutePath.TrimStart('/')
Write-Host "  hedef DB: $pgDb @ $($uri.Host):$pgRemotePort (kullanici: $pgUser)"

Write-Host "=== SSH tunel (localhost:$TunnelLocalPort -> $($uri.Host):$pgRemotePort) ===" -ForegroundColor Cyan
$tunnel = Start-Process -FilePath 'ssh' -ArgumentList @(
    '-p', "$SshPort",
    '-N',
    '-L', "${TunnelLocalPort}:$($uri.Host):$pgRemotePort",
    '-o', 'ExitOnForwardFailure=yes',
    "${User}@${Server}"
) -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 2
if ($tunnel.HasExited) {
    Write-Error 'SSH tunel acilamadi. OpenSSH ve sunucu erisimi kontrol edin.'
}

$tunnelDbUrl = "postgres://${pgUser}:$([Uri]::EscapeDataString($pgPass))@127.0.0.1:${TunnelLocalPort}/${pgDb}"

try {
    Push-Location $travelRoot
    $env:DATABASE_URL = $tunnelDbUrl
    $env:TRAVEL_DB_ENV = ''
    $env:MYSQL_HOST = $MysqlHost
    $env:MYSQL_USER = $MysqlUser
    $env:MYSQL_PASSWORD = $MysqlPassword
    $env:MYSQL_DATABASE = $MysqlDatabase

    $nodeArgs = @('scripts/sync-excalibur-bravo.mjs', '--mysql-database', $MysqlDatabase)
    if ($DryRun) { $nodeArgs += '--dry-run' }

    Write-Host '=== Sync: MySQL (PC) -> PostgreSQL (uretim) ===' -ForegroundColor Yellow
    & node @nodeArgs
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    Write-Host ''
    Write-Host 'Tamam. Veri uretim PostgreSQL travel icinde.' -ForegroundColor Green
    Write-Host 'Sunucudaki MariaDB/rezervasyonyap silinebilir; site onu kullanmaz.' -ForegroundColor Green
} finally {
    Pop-Location
    if ($tunnel -and -not $tunnel.HasExited) {
        Stop-Process -Id $tunnel.Id -Force -ErrorAction SilentlyContinue
    }
}
