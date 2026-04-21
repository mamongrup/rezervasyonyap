# sync-fronted-uploads-to-server.ps1
# Yerel fronted/public/uploads -> sunucuda .../fronted/public/uploads (scp -r)
#
# Gereksinim: Windows OpenSSH İstemcisi (scp). Ayarlar -> Uygulamalar -> İsteğe bağlı özellikler.
#
# Örnek:
#   .\scripts\sync-fronted-uploads-to-server.ps1 -Server 50.114.185.100 -User root
#   .\scripts\sync-fronted-uploads-to-server.ps1 -Server 50.114.185.100 -User root -Port 22
#
# İlk seferde sunucuda: mkdir -p /opt/rezervasyonyap/fronted/public/uploads

param(
    [Parameter(Mandatory = $true)]
    [string]$Server,
    [string]$User = 'root',
    [int]$Port = 22,
    [string]$RemotePublicParent = '/opt/rezervasyonyap/fronted/public'
)

$ErrorActionPreference = 'Stop'

$travelRoot = Split-Path -Parent $PSScriptRoot
$localUploads = Join-Path $travelRoot 'fronted\public\uploads'

if (-not (Test-Path $localUploads)) {
    Write-Error "Yerel klasör yok: $localUploads"
    exit 1
}

$null = Get-Command scp -ErrorAction Stop

$remoteTarget = "${User}@${Server}:${RemotePublicParent}/"
Write-Host "Yerel klasör: $localUploads"
Write-Host "Uzak hedef:   $remoteTarget (uploads adı korunur)"
Write-Host "Port: $Port"
Write-Host ""
Write-Host "Sunucuda dizin yoksa önce: ssh ${User}@${Server} -p $Port \"mkdir -p ${RemotePublicParent}/uploads\""
Write-Host ""

$scpArgs = @('-P', "$Port", '-r', $localUploads, $remoteTarget)
& scp @scpArgs
if ($LASTEXITCODE -ne 0) {
    Write-Error "scp çıkış kodu: $LASTEXITCODE"
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "Tamam. Sunucuda doğrulama: ls -la ${RemotePublicParent}/uploads/general/ | head"
