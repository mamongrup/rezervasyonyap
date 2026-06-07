# Yerel Next.js (port 3000) - API: http://127.0.0.1:8080
# Kullanim: .\scripts\start-frontend.ps1

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path $PSScriptRoot -Parent
$FrontendDir = Join-Path $RepoRoot 'frontend'
$NodeDir = 'C:\laragon\bin\nodejs\node-v24'

if (Test-Path $NodeDir) {
  $env:PATH = "$NodeDir;$NodeDir\node_modules\npm\bin;" + $env:PATH
}

Remove-Item Env:NEXT_PUBLIC_API_URL -ErrorAction SilentlyContinue

Set-Location $FrontendDir
if (-not (Test-Path '.env.local')) {
  Write-Host '.env.local yok - frontend\.env.local.example dosyasini kopyalayin.' -ForegroundColor Yellow
}

Write-Host 'Next.js dev -> http://localhost:3000 (API: http://127.0.0.1:8080)' -ForegroundColor Cyan
npm run dev
