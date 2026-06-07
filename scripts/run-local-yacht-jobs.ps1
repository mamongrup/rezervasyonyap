# Yerel yat pipeline — meta import + görsel backfill (batch döngü)
#   powershell -ExecutionPolicy Bypass -File scripts/run-local-yacht-jobs.ps1

$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

$Node = "C:\laragon\bin\nodejs\node-v24\node.exe"
$LogDir = Join-Path $Root "logs"
$Log = Join-Path $LogDir "yacht-jobs.log"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Write-Log($msg) {
  $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $msg"
  Add-Content -Path $Log -Value $line
  Write-Host $line
}

$env:ALBATROS_STATUS = "published"
$BatchAl = 4
$BatchBs = 2
$MaxRounds = 500

Write-Log "=== Yerel yat işleri başladı ==="

# Kalan Albatros meta (görselsiz)
Write-Log "Albatros meta import (skip-existing, skip-images)..."
& $Node scripts/import-albatros-yachts.mjs --skip-images --skip-existing 2>&1 | Tee-Object -FilePath $Log -Append

for ($round = 1; $round -le $MaxRounds; $round++) {
  $stats = & $Node scripts/check-yacht-images.mjs 2>&1 | Out-String
  if ($stats -match "Tamamen görselsiz yat: (\d+)") {
    $left = [int]$Matches[1]
    Write-Log "Tur $round — görselsiz yat: $left"
    if ($left -eq 0) { break }
  }

  Write-Log "Albatros görsel batch ($BatchAl)..."
  & $Node scripts/backfill-albatros-images.mjs --limit $BatchAl 2>&1 | Tee-Object -FilePath $Log -Append

  Write-Log "Baransen görsel batch ($BatchBs)..."
  & $Node scripts/backfill-baransen-images.mjs --limit $BatchBs 2>&1 | Tee-Object -FilePath $Log -Append

  Start-Sleep -Seconds 2
}

Write-Log "=== Bitti — son durum ==="
& $Node scripts/check-yacht-images.mjs 2>&1 | Tee-Object -FilePath $Log -Append
