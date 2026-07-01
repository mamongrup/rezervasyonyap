# Excalibur dump -> yerel MySQL -> yerel PostgreSQL (tam sync + denetim).
#
#   .\scripts\full-excalibur-local-sync.ps1
#   .\scripts\full-excalibur-local-sync.ps1 -SqlFile "$env:USERPROFILE\Downloads\yeni.sql"
#   .\scripts\full-excalibur-local-sync.ps1 -SkipImport   # MySQL zaten guncelse

param(
    [string]$SqlFile = "$env:USERPROFILE\Downloads\1.7.26.sql",
    [string]$MysqlDatabase = 'rezervasyonyapco_excalibur',
    [switch]$SkipImport,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$travelRoot = Split-Path -Parent $PSScriptRoot
Push-Location $travelRoot

try {
    if (-not $SkipImport) {
        Write-Host '=== Dump -> MySQL ===' -ForegroundColor Cyan
        & "$PSScriptRoot\import-excalibur-mysql.ps1" -SqlFile $SqlFile -Database $MysqlDatabase
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    }

    $importArgs = @(
        'scripts/import-bravo-spaces.mjs',
        '--mysql-database', $MysqlDatabase,
        '--create-missing-only',
        '--skip-images'
    )
    $syncArgs = @('scripts/sync-excalibur-bravo.mjs', '--mysql-database', $MysqlDatabase)
    if ($DryRun) {
        $importArgs += '--dry-run'
        $syncArgs += '--dry-run'
    }

    Write-Host '=== 1/4 Eksik ilanlar ===' -ForegroundColor Yellow
    & node @importArgs
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    Write-Host '=== 2/4 Takvim + fiyat ===' -ForegroundColor Yellow
    & node @syncArgs
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    if (-not $DryRun) {
        Write-Host '=== 3/4 Denetim ===' -ForegroundColor Yellow
        & node scripts/audit-excalibur-sync.mjs --mysql-database $MysqlDatabase --fail-on-mismatch
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

        Write-Host '=== 4/4 Vitrin fiyat ===' -ForegroundColor Yellow
        & node scripts/audit-excalibur-sync.mjs --mysql-database $MysqlDatabase --refresh-vitrin
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    }

    Write-Host ''
    Write-Host 'Yerel sync tamam. Ozet:' -ForegroundColor Green
    $env:PGHOST = '127.0.0.1'
    $env:PGPORT = '5432'
    if (-not $env:PGDATABASE) { $env:PGDATABASE = 'travel' }
    if (-not $env:PGUSER) { $env:PGUSER = 'postgres' }
    & node scripts/summarize-excalibur-local.mjs
} finally {
    Pop-Location
}
