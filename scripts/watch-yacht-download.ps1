# Ham indirme pipeline — çökerse yeniden başlatır.
$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root
$Node = "C:\laragon\bin\nodejs\node-v24\node.exe"
$Log = Join-Path $Root "logs\yacht-watch-download.log"
New-Item -ItemType Directory -Force -Path (Split-Path $Log) | Out-Null

function Write-WLog($msg) {
  $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $msg"
  Add-Content -Path $Log -Value $line
}

function Test-DownloadRunning {
  Get-CimInstance Win32_Process -Filter "name='node.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -match 'run-local-yacht-download-only\.mjs' } |
    Select-Object -First 1
}

Write-WLog "=== Download watchdog başladı ==="
while ($true) {
  if (-not (Test-DownloadRunning)) {
    Write-WLog "İndirme pipeline yok — başlatılıyor..."
    Start-Process -FilePath $Node `
      -ArgumentList "scripts/run-local-yacht-download-only.mjs", "--until-done" `
      -WorkingDirectory $Root -WindowStyle Hidden
    Start-Sleep -Seconds 20
  }
  Start-Sleep -Seconds 90
}
