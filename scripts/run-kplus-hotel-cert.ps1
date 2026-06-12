# KPlus otel sertifikasyonu — 3 sandbox rezervasyon + System PNR
# Panel: Yönetim → API sağlayıcıları → Travelrobot (sandbox URL + channel code/password)
# PostgreSQL çalışır olmalı (site_settings.listing_api_providers.travelrobot)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

$Node = @(
  'C:\laragon\bin\nodejs\node-v22\node.exe',
  'C:\laragon\bin\nodejs\node.exe',
  'node',
) | Where-Object { Test-Path $_ -ErrorAction SilentlyContinue } | Select-Object -First 1

if (-not $Node) {
  Write-Error 'Node bulunamadı. Laragon node yolunu kontrol edin veya PATH''e node ekleyin.'
}

Write-Host 'KPlus hotel cert: SearchHotel → Validate → BookHotel → GetHotelBooking (PNR doğrulama)' -ForegroundColor Cyan
& $Node scripts/test-travelrobot-scenarios.mjs --from-db --with-booking --only hotels
exit $LASTEXITCODE
