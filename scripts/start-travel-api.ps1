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

$erlCmd = Get-Command erl -ErrorAction SilentlyContinue
if (Test-Path (Join-Path $ErlangBin 'erl.exe')) {
  $env:PATH = "$RebarBin;$ErlangBin;" + $env:PATH
  $erlExe = Join-Path $ErlangBin 'erl.exe'
} elseif ($erlCmd) {
  $env:PATH = "$RebarBin;" + $env:PATH
  $erlExe = $erlCmd.Source
} else {
  Write-Host "Erlang OTP bulunamadi." -ForegroundColor Red
  Write-Host 'Kurulum: scripts\setup-local-windows.ps1 veya scoop install erlang' -ForegroundColor Yellow
  exit 1
}

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
  try {
    $psql = 'C:\laragon\bin\postgresql\postgresql\bin\psql.exe'
    if (Test-Path $psql) {
      $sql = "SELECT coalesce(trim(value_json->'turna'->>'api_key'),'') FROM site_settings WHERE key='listing_api_providers' AND organization_id IS NULL LIMIT 1"
      $dbKey = & $psql -h 127.0.0.1 -p 5432 -U postgres -d travel -t -A -c $sql 2>$null
      if ($dbKey -and $dbKey.Trim()) {
        $env:TURNA_API_KEY = $dbKey.Trim()
        Write-Host 'Turna api_key DB panel kaydindan yuklendi.' -ForegroundColor DarkGray
      }
    }
  } catch {
    # opsiyonel kontrol hatasi calismayi engellemez
  }
}

$otpRelease = (& $erlExe -eval 'erlang:display(erlang:system_info(otp_release)), halt().' -noshell 2>$null).ToString().Trim().Trim('"')
if ([int]$otpRelease -lt 26) {
  Write-Host "Erlang OTP 26+ gerekli (simdiki: $otpRelease)." -ForegroundColor Red
  exit 1
}

Set-Location $BackendDir
$port = if ($env:PORT) { $env:PORT } else { '8080' }
Write-Host "travel-api baslatiliyor: http://127.0.0.1:$port" -ForegroundColor Cyan

# Windows symlink yerine dizin birlesimi (junction) guvencesi
if (Test-Path "$BackendDir\build\dev\erlang\backend") {
  $targetPriv = "$BackendDir\build\dev\erlang\backend\priv"
  if (-not (Test-Path $targetPriv)) {
    cmd.exe /c "mklink /J ""$targetPriv"" ""$BackendDir\priv""" 2>$null
  }
}

# BEAM VM'i dogrudan calistir (Windows symlink os error 1314 engelleyici)
$dirs = @()
Get-ChildItem -Path "$BackendDir\build\dev\erlang" -Directory | ForEach-Object {
  $ebin = "$($_.FullName)\ebin"
  if (Test-Path $ebin) { $dirs += "-pa"; $dirs += $ebin }
  $gleamArt = "$($_.FullName)\_gleam_artefacts"
  if (Test-Path $gleamArt) { $dirs += "-pa"; $dirs += $gleamArt }
}

& $erlExe $dirs -eval "backend:main()." -noshell


