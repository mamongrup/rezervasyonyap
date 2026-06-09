# Yerel Next.js (port 3000) - API: http://127.0.0.1:8080
# Kullanim: .\scripts\start-frontend.ps1

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path $PSScriptRoot -Parent
$FrontendDir = Join-Path $RepoRoot 'frontend'
$NodeDir = if (Test-Path 'C:\laragon\bin\nodejs\node-v22') {
  'C:\laragon\bin\nodejs\node-v22'
} elseif (Test-Path 'C:\laragon\bin\nodejs\node-v24') {
  'C:\laragon\bin\nodejs\node-v24'
} else {
  $null
}

if ($NodeDir) {
  $env:PATH = "$NodeDir;$NodeDir\node_modules\npm\bin;" + $env:PATH
}

# Eski dev süreci port 3000'de kaldıysa yeni npm run dev hemen kapanabilir.
$portPid = (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique | Select-Object -First 1)
if ($portPid) {
  Write-Host "Port 3000 kullanımda (PID $portPid). Durdurmak için: taskkill /PID $portPid /F" -ForegroundColor Yellow
}

Remove-Item Env:NEXT_PUBLIC_API_URL -ErrorAction SilentlyContinue

Set-Location $FrontendDir
if (-not (Test-Path '.env.local')) {
  Write-Host '.env.local yok - frontend\.env.local.example dosyasini kopyalayin.' -ForegroundColor Yellow
}

Write-Host 'Next.js dev -> http://localhost:3000 (API: http://127.0.0.1:8080)' -ForegroundColor Cyan
npm run dev
