# Excalibur: yerel MySQL dump -> yerel PG sync -> sunucuya tasinacak bundle.
#
#   .\scripts\export-excalibur-for-server.ps1
#   .\scripts\export-excalibur-for-server.ps1 -SqlFile "$env:USERPROFILE\Downloads\1.7.26.sql"
#   .\scripts\export-excalibur-for-server.ps1 -SkipSync   # PG zaten guncelse

param(
    [string]$SqlFile = "$env:USERPROFILE\Downloads\1.7.26.sql",
    [string]$OutFile = "",
    [switch]$SkipSync
)

$ErrorActionPreference = 'Stop'
$travelRoot = Split-Path -Parent $PSScriptRoot
Push-Location $travelRoot

try {
    if (-not $SkipSync) {
        & "$PSScriptRoot\full-excalibur-local-sync.ps1" -SqlFile $SqlFile
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    }

    if (-not $OutFile) {
        $base = [System.IO.Path]::GetFileNameWithoutExtension($SqlFile)
        $OutFile = "backups\excalibur-holiday-$base.json.gz"
    }

    Write-Host "=== PostgreSQL bundle export ===" -ForegroundColor Cyan
    & node scripts/export-excalibur-holiday-bundle.mjs --out $OutFile
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    $full = Join-Path $travelRoot $OutFile
    Write-Host ""
    Write-Host "Sunucuya yukleyin:" -ForegroundColor Green
    Write-Host "  $full"
    Write-Host ""
    Write-Host "Sunucuda:" -ForegroundColor Green
    Write-Host "  cd /var/www/vhosts/rezervasyonyap.tr/httpdocs"
    Write-Host "  git pull origin main"
    Write-Host "  node scripts/import-excalibur-holiday-bundle.mjs tmp/$(Split-Path $OutFile -Leaf)"
} finally {
    Pop-Location
}
