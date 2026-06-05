# Bir kerelik yerel Windows kurulumu (Laragon + travel repo)
# Kullanım: .\scripts\setup-local-windows.ps1

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path $PSScriptRoot -Parent
$BackendDir = Join-Path $RepoRoot 'backend'
$ErlangBin = 'C:\Program Files\Erlang OTP\bin'
$RebarBin = Join-Path $RepoRoot 'scripts\bin'

Write-Host "=== Yerel geliştirme kurulumu ===" -ForegroundColor Cyan

# 1) Erlang OTP 27 (gleam_json runtime icin zorunlu)
if (-not (Test-Path (Join-Path $ErlangBin 'erl.exe'))) {
  Write-Host 'Erlang OTP kuruluyor (OTP 27.3.4)...' -ForegroundColor Yellow
  $installer = Join-Path $env:TEMP 'otp_win64_27.exe'
  curl.exe -L -o $installer 'https://github.com/erlang/otp/releases/download/OTP-27.3.4/otp_win64_27.3.4.exe'
  Start-Process -FilePath $installer -ArgumentList '/S' -Wait
}
Write-Host "[OK] Erlang: $( & (Join-Path $ErlangBin 'erl.exe') -eval 'erlang:display(erlang:system_info(otp_release)), halt().' -noshell 2>$null )" -ForegroundColor Green

# 2) rebar3
New-Item -ItemType Directory -Force -Path $RebarBin | Out-Null
if (-not (Test-Path (Join-Path $RebarBin 'rebar3'))) {
  curl.exe -L -o (Join-Path $RebarBin 'rebar3') 'https://github.com/erlang/rebar3/releases/download/3.24.0/rebar3'
  @"
@echo off
escript.exe "%~dp0rebar3" %*
"@ | Set-Content -Path (Join-Path $RebarBin 'rebar3.cmd') -Encoding ASCII
}
Write-Host "[OK] rebar3 → scripts\bin" -ForegroundColor Green

# 3) backend.env
$envExample = Join-Path $BackendDir 'backend.env.example'
$envLocal = Join-Path $BackendDir 'backend.env'
if (-not (Test-Path $envLocal)) {
  Copy-Item $envExample $envLocal
  Write-Host "[OK] backend.env oluşturuldu — TURNA_API_KEY ekleyin" -ForegroundColor Green
} else {
  Write-Host "[OK] backend.env mevcut" -ForegroundColor Green
}

# 4) frontend .env.local
$feExample = Join-Path $RepoRoot 'frontend\.env.local.example'
$feLocal = Join-Path $RepoRoot 'frontend\.env.local'
if (-not (Test-Path $feLocal)) {
  Copy-Item $feExample $feLocal
  Write-Host "[OK] frontend\.env.local oluşturuldu" -ForegroundColor Green
}

# 5) gleam build
$env:PATH = "$RebarBin;$ErlangBin;" + $env:PATH
Set-Location $BackendDir
Write-Host "gleam build çalışıyor..." -ForegroundColor Yellow
gleam build
Write-Host "[OK] gleam build tamam" -ForegroundColor Green

Write-Host ""
Write-Host "Sonraki adımlar:" -ForegroundColor Cyan
Write-Host "  1. backend\backend.env içine TURNA_API_KEY yazın (veya panelden kaydedin)"
Write-Host "  2. Terminal 1: .\scripts\start-travel-api.ps1"
Write-Host "  3. Terminal 2: .\scripts\start-frontend.ps1"
Write-Host "  4. Test: http://localhost:3000/ucak-bileti/all?from=IST&to=AYT&date=2026-07-17"
