# sync-frontend-public-to-server.ps1
# Yerel frontend/public (tamamı) -> sunucuda .../frontend/public (scp -r)
# uploads + page-builder/*.json + site-data + public/locales vb. tek seferde.
#
# Not: Git'teki dosyalar normalde sunucuda "git pull" ile gelir; bu script yerelde
# değişiklik yaptığınız veya sunucuda repo güncel değilken public'i hızlı eşitlemek içindir.
#
# Örnek:
#   .\scripts\sync-frontend-public-to-server.ps1 -Server 1.2.3.4 -User root
#
param(
    [Parameter(Mandatory = $true)]
    [string]$Server,
    [string]$User = 'root',
    [int]$Port = 22,
    [string]$RemoteFrontend = '/opt/rezervasyonyap/frontend'
)

$ErrorActionPreference = 'Stop'

$travelRoot = Split-Path -Parent $PSScriptRoot
$localPublic = Join-Path $travelRoot 'frontend\public'

if (-not (Test-Path $localPublic)) {
    Write-Error "Yerel klasör yok: $localPublic"
    exit 1
}

$null = Get-Command scp -ErrorAction Stop

$remoteTarget = "${User}@${Server}:${RemoteFrontend}/"
Write-Host "Yerel:  $localPublic"
Write-Host "Uzak:   $remoteTarget (public adı korunur -> .../frontend/public/)"
Write-Host "Port:   $Port"
Write-Host ""
Write-Host "Sunucuda: ssh ${User}@${Server} -p $Port \"mkdir -p ${RemoteFrontend}/public\""
Write-Host ""

$scpArgs = @('-P', "$Port", '-r', $localPublic, $remoteTarget)
& scp @scpArgs
if ($LASTEXITCODE -ne 0) {
    Write-Error "scp çıkış kodu: $LASTEXITCODE"
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "Tamam. Örnek doğrulama: curl -I https://SITE/uploads/general/homepage-....avif"
