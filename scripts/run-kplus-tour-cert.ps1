# KPlus tur sertifikasyonu — SearchTour → GetTourPrices → BookTour → System PNR
# Sandbox: TRAVELROBOT_SANDBOX_CHANNEL_CODE / TRAVELROBOT_SANDBOX_CHANNEL_PASSWORD (backend.env)
# Canlı import kanalı: --from-db (yalnızca katalog; book için sandbox gerekir)

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

Write-Host 'KPlus tour cert: SearchTour → GetTourPrices → GetTourFinalPrice → BookTour' -ForegroundColor Cyan
& $Node scripts/test-travelrobot-scenarios.mjs --sandbox --with-booking --only tours
exit $LASTEXITCODE
