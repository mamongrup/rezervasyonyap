# AVIF dönüşüm pipeline — çökerse yeniden başlatır.
$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root
$Node = "C:\laragon\bin\nodejs\node-v24\node.exe"
$Log = Join-Path $Root "logs\yacht-watch-convert.log"
New-Item -ItemType Directory -Force -Path (Split-Path $Log) | Out-Null

function Write-WLog($msg) {
  Add-Content -Path $Log -Value "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $msg"
}

function Test-ConvertRunning {
  Get-CimInstance Win32_Process -Filter "name='node.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -match 'run-local-yacht-convert-only\.mjs' } |
    Select-Object -First 1
}

Write-WLog "=== Convert watchdog başladı ==="
while ($true) {
  $stats = & $Node scripts/check-yacht-raw-status.mjs 2>&1 | Out-String
  if ($stats -match "Ham indirilmiş \(\.raw\): (\d+) ilan, (\d+) dosya") {
    $slugs = [int]$Matches[1]
    if ($slugs -eq 0) {
      Write-WLog "Ham kalmadı — çıkılıyor."
      break
    }
  }
  if (-not (Test-ConvertRunning)) {
    Write-WLog "Dönüşüm pipeline yok — başlatılıyor..."
    Start-Process -FilePath $Node `
      -ArgumentList "scripts/run-local-yacht-convert-only.mjs", "--until-done" `
      -WorkingDirectory $Root -WindowStyle Hidden
    Start-Sleep -Seconds 20
  }
  Start-Sleep -Seconds 90
}
Write-WLog "=== Convert watchdog bitti ==="
