# Görselsiz yat kalmayana kadar pipeline çalıştırır; çökerse yeniden başlatır.
#   powershell -ExecutionPolicy Bypass -File scripts/watch-yacht-jobs.ps1

$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

$Node = "C:\laragon\bin\nodejs\node-v24\node.exe"
$LogDir = Join-Path $Root "logs"
$WatchLog = Join-Path $LogDir "yacht-watch.log"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Write-WatchLog($msg) {
  $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $msg"
  Add-Content -Path $WatchLog -Value $line
}

function Get-ImagelessCount {
  $stats = & $Node scripts/check-yacht-images.mjs 2>&1 | Out-String
  if ($stats -match "Tamamen görselsiz yat: (\d+)") {
    return [int]$Matches[1]
  }
  return $null
}

function Test-PipelineRunning {
  $procs = Get-CimInstance Win32_Process -Filter "name='node.exe'" -ErrorAction SilentlyContinue
  foreach ($p in $procs) {
    if ($p.CommandLine -match 'run-local-yacht-jobs\.mjs') { return $true }
  }
  return $false
}

Write-WatchLog "=== Watchdog başladı ==="

while ($true) {
  $left = Get-ImagelessCount
  if ($null -ne $left -and $left -eq 0) {
    Write-WatchLog "Görselsiz yat kalmadı — çıkılıyor."
    break
  }

  if (-not (Test-PipelineRunning)) {
    Write-WatchLog "Pipeline yok; başlatılıyor (görselsiz=$left)..."
    Start-Process -FilePath $Node `
      -ArgumentList "scripts/run-local-yacht-jobs.mjs", "--skip-import", "--until-done" `
      -WorkingDirectory $Root `
      -WindowStyle Hidden
    Start-Sleep -Seconds 15
  }

  Start-Sleep -Seconds 120
}

& $Node scripts/check-yacht-images.mjs 2>&1 | ForEach-Object { Write-WatchLog $_ }
Write-WatchLog "=== Watchdog bitti ==="
