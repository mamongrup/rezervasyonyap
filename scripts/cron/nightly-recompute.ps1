# Travel — gecelik bakım işleri.
# Şu an: super-host recompute. İleride i18n backfill, anomaly check vs. eklenecek.
#
# Test: powershell -ExecutionPolicy Bypass -File .\scripts\cron\nightly-recompute.ps1
# Loglar: scripts/cron/logs/<YYYY-MM-DD>.log

param(
    [string]$PsqlPath = 'C:\laragon\bin\postgresql\postgresql\bin\psql.exe',
    [string]$DbHost   = '127.0.0.1',
    [int]$DbPort      = 5432,
    [string]$DbUser   = 'postgres',
    [string]$DbName   = 'travel'
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $repoRoot

$logDir = Join-Path $PSScriptRoot 'logs'
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
$logFile = Join-Path $logDir ("$(Get-Date -Format yyyy-MM-dd).log")

function Write-Log {
    param([string]$Message)
    $stamp = (Get-Date -Format 'HH:mm:ss')
    "$stamp $Message" | Tee-Object -FilePath $logFile -Append
}

Write-Log '=== Gecelik bakım başladı ==='

$sqlFile = Join-Path $repoRoot 'backend\priv\sql\cron\recompute_super_host.sql'
if (-not (Test-Path $sqlFile)) {
    Write-Log "✖ SQL dosyası yok: $sqlFile"
    exit 1
}

if (-not (Test-Path $PsqlPath)) {
    Write-Log "✖ psql bulunamadı: $PsqlPath"
    exit 1
}

try {
    Write-Log "→ super-host recompute çalışıyor..."
    & $PsqlPath -h $DbHost -p $DbPort -U $DbUser -d $DbName -f $sqlFile 2>&1 |
        ForEach-Object { Write-Log "  $_" }
    Write-Log '✓ super-host recompute tamam.'
} catch {
    Write-Log "✖ Hata: $_"
    exit 1
}

Write-Log '=== Gecelik bakım bitti ==='
