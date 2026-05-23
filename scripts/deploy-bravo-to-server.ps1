# Bravo aktarım sonrası sunucu güncellemesi (sırayla)
#
# Önkoşul: OpenSSH (ssh, scp), sunucuda /opt/rezervasyonyap (veya -AppRoot)
#
# Örnek:
#   .\scripts\deploy-bravo-to-server.ps1 -Server 50.114.185.100 -User root
#   .\scripts\deploy-bravo-to-server.ps1 -Server 50.114.185.100 -User root -SkipUploads
#   .\scripts\deploy-bravo-to-server.ps1 -Server 50.114.185.100 -User root -SkipDeploy

param(
    [Parameter(Mandatory = $true)]
    [string]$Server,
    [string]$User = 'root',
    [int]$Port = 22,
    [string]$AppRoot = '/opt/rezervasyonyap',
    [string]$Ref = 'main',
    [switch]$SkipUploads,
    [switch]$SkipDeploy,
    [switch]$SkipDbHint
)

$ErrorActionPreference = 'Stop'
$travelRoot = Split-Path -Parent $PSScriptRoot

Write-Host "=== 1) Yerel eksik denetimi ===" -ForegroundColor Cyan
Push-Location $travelRoot
node scripts/audit-bravo-import.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
node scripts/verify-local-files-vs-db.mjs
if ($LASTEXITCODE -ne 0) {
    Write-Host "Diskte eksik dosya var; once: node scripts/import-bravo-images-only.mjs" -ForegroundColor Yellow
    exit 1
}
node scripts/check-local-images.mjs
Pop-Location

if (-not $SkipDbHint) {
    Write-Host ""
    Write-Host "=== 2) Veritabani (manuel) ===" -ForegroundColor Cyan
    Write-Host "Sunucuya PostgreSQL travel dump aktarın (ornek yerel yedek):"
    Write-Host "  backups\bravo-import-ready-20260523-avif\travel-full.dump"
    Write-Host "Sunucuda: pg_restore veya psql ile travel DB guncelleyin."
    Write-Host "API .env / backend.env sunucu ile ayni olmali."
    Write-Host ""
}

if (-not $SkipUploads) {
    Write-Host "=== 3) Uploads (~8.8 GB) -> sunucu ===" -ForegroundColor Cyan
    & "$PSScriptRoot\sync-frontend-uploads-to-server.ps1" -Server $Server -User $User -Port $Port -RemotePublicParent "$AppRoot/frontend/public"
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

if (-not $SkipDeploy) {
    Write-Host ""
    Write-Host "=== 4) Kod deploy (git + build + restart) ===" -ForegroundColor Cyan
    & "$PSScriptRoot\deploy-server.ps1" -Server $Server -User $User -Port $Port -AppRoot $AppRoot -Ref $Ref
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host ""
Write-Host "Tamam. Vitrin kontrol: https://rezervasyonyap.tr/tr/tatil-evleri" -ForegroundColor Green
