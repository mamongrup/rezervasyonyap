# Yerel Gleam travel-api (port 8080)
# Kullanim: .\scripts\start-travel-api.ps1

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path $PSScriptRoot -Parent
$BackendDir = Join-Path $RepoRoot 'backend'
$EnvFile = Join-Path $BackendDir 'backend.env'

if (-not (Test-Path $EnvFile)) {
  Write-Host 'backend.env yok - copy backend\backend.env.example backend\backend.env' -ForegroundColor Red
  exit 1
}

$ErlangBin = 'C:\Program Files\Erlang OTP\bin'
$RebarBin = Join-Path $RepoRoot 'scripts\bin'
if (-not (Test-Path (Join-Path $ErlangBin 'erl.exe'))) {
  Write-Host "Erlang OTP bulunamadi: $ErlangBin" -ForegroundColor Red
  Write-Host 'Kurulum: scripts\setup-local-windows.ps1' -ForegroundColor Yellow
  exit 1
}

$env:PATH = "$RebarBin;$ErlangBin;" + $env:PATH
$env:TRAVEL_DB_ENV = $EnvFile

Get-Content $EnvFile | ForEach-Object {
  $line = $_.Trim()
  if (-not $line -or $line.StartsWith('#')) { return }
  $eq = $line.IndexOf('=')
  if ($eq -le 0) { return }
  $key = $line.Substring(0, $eq).Trim()
  $val = $line.Substring($eq + 1).Trim()
  Set-Item -Path "Env:$key" -Value $val
}

if (-not $env:TURNA_API_KEY) {
  $psql = 'C:\laragon\bin\postgresql\postgresql\bin\psql.exe'
  $sql = @'
SELECT coalesce(trim(value_json->'turna'->>'api_key'),'') FROM site_settings WHERE key='listing_api_providers' AND organization_id IS NULL LIMIT 1
'@
  $dbKey = & $psql -h 127.0.0.1 -p 5432 -U postgres -d travel -t -A -c $sql 2>$null
  if ($dbKey -and $dbKey.Trim()) {
    $env:TURNA_API_KEY = $dbKey.Trim()
    Write-Host 'Turna api_key DB panel kaydindan yuklendi.' -ForegroundColor DarkGray
  } else {
    Write-Host 'UYARI: TURNA_API_KEY bos - ucus aramasi calismaz. backend.env veya panelden anahtar ekleyin.' -ForegroundColor Yellow
  }
}

$otpRelease = & (Join-Path $ErlangBin 'erl.exe') -eval 'erlang:display(erlang:system_info(otp_release)), halt().' -noshell 2>$null
if ($otpRelease -ne '27') {
  Write-Host "Erlang OTP 27 gerekli (simdiki: $otpRelease). scripts\setup-local-windows.ps1 calistirin." -ForegroundColor Red
  exit 1
}

Set-Location $BackendDir
$port = if ($env:PORT) { $env:PORT } else { '8080' }
Write-Host "travel-api baslatiliyor: http://127.0.0.1:$port" -ForegroundColor Cyan
gleam run
