# sync-frontend-uploads-to-server.ps1
# Yerel frontend/public/uploads -> sunucuda .../frontend/public/uploads (scp -r)
#
# Gereksinim: Windows OpenSSH İstemcisi (scp). Ayarlar -> Uygulamalar -> İsteğe bağlı özellikler.
#
# Örnek:
#   .\scripts\sync-frontend-uploads-to-server.ps1 -Server 50.114.185.100 -User PLESK_USER
#   .\scripts\sync-frontend-uploads-to-server.ps1 -Server 50.114.185.100 -User PLESK_USER -Port 22
#
# İlk seferde sunucuda:
#   mkdir -p /var/www/vhosts/rezervasyonyap.tr/httpdocs/frontend/public/uploads
#
# Not: root SSH genelde kapalı; Plesk sistem kullanıcısı kullanın (docs/WINSCP-YUKLEME-100.md).
# Vitrin Next WorkingDirectory = httpdocs/frontend — /opt altına yüklemek 404 üretir.

param(
    [Parameter(Mandatory = $true)]
    [string]$Server,
    [string]$User = 'root',
    [int]$Port = 22,
    [string]$RemotePublicParent = '/var/www/vhosts/rezervasyonyap.tr/httpdocs/frontend/public'
)

$ErrorActionPreference = 'Stop'

$travelRoot = Split-Path -Parent $PSScriptRoot
$localUploads = Join-Path $travelRoot 'frontend\public\uploads'

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
