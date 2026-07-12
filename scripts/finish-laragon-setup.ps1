# Laragon + travel projesi — eksik kurulum adimlarini tamamlar.
# Kullanim (Yonetici PowerShell, repo kokunden):
#   powershell -ExecutionPolicy Bypass -File .\scripts\finish-laragon-setup.ps1
#
# Bozuk PostgreSQL data klasoru icin:
#   powershell -ExecutionPolicy Bypass -File .\scripts\finish-laragon-setup.ps1 -ResetPostgresData

param(
    [string]$LaragonRoot = 'C:\laragon',
    [string]$RepoRoot = '',
    [string]$PgUser = 'postgres',
    [string]$PgPassword = '',
    [string]$PgDatabase = 'travel',
    [switch]$ResetPostgresData,
    [switch]$SkipMigrations,
    [switch]$SkipNpm,
    [switch]$SkipGleam
)

$ErrorActionPreference = 'Stop'

if (-not $RepoRoot) {
    $RepoRoot = Split-Path $PSScriptRoot -Parent
}

$lib = Join-Path $PSScriptRoot 'lib\Resolve-LaragonPostgresql.ps1'
if (-not (Test-Path $lib)) {
    throw "Eksik: $lib"
}
. $lib

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "=== $Message ===" -ForegroundColor Cyan
}

Write-Step 'Travel / Laragon kurulum tamamlama'
Write-Host "Repo:     $RepoRoot"
Write-Host "Laragon:  $LaragonRoot"

if (-not (Test-Path $RepoRoot)) {
    throw "Repo bulunamadi: $RepoRoot - once git clone ile C:\laragon\www\travel olusturun."
}

# Laragon PostgreSQL junction (postgresql -> postgresql-18.4)
$pgRoot = Join-Path $LaragonRoot 'bin\postgresql'
$pgActive = Join-Path $pgRoot 'postgresql'
$pgVersionDir = Join-Path $pgRoot 'postgresql-18.4'
if ((Test-Path $pgVersionDir) -and -not (Test-Path $pgActive)) {
    Write-Host "Laragon PostgreSQL junction olusturuluyor..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path $pgRoot | Out-Null
    cmd /c "mklink /J `"$pgActive`" `"$pgVersionDir`""
}

Write-Step 'PostgreSQL araclari'
$tools = Get-LaragonPostgresqlTools -LaragonRoot $LaragonRoot
if (-not $tools) {
    Write-Host 'PostgreSQL binary bulunamadi. Kuruluyor (upgrade-laragon-runtime.ps1)...' -ForegroundColor Yellow
    $upgrade = Join-Path $RepoRoot 'scripts\upgrade-laragon-runtime.ps1'
    if (-not (Test-Path $upgrade)) { throw 'PostgreSQL yok ve upgrade scripti bulunamadi.' }
    & powershell -ExecutionPolicy Bypass -File $upgrade -SkipNode
    $tools = Get-LaragonPostgresqlTools -LaragonRoot $LaragonRoot
    if (-not $tools) { throw 'PostgreSQL kurulumu tamamlanamadi.' }
}
Write-Host "[OK] psql: $($tools.Psql)" -ForegroundColor Green
$env:PSQL = $tools.Psql

Write-Step 'PostgreSQL servisi'
Start-LaragonPostgresql -Tools $tools -LaragonRoot $LaragonRoot -ResetData:$ResetPostgresData.IsPresent
Ensure-PostgresqlSuperuser -Psql $tools.Psql -User $PgUser -Password $PgPassword
Ensure-TravelDatabase -Psql $tools.Psql -Database $PgDatabase -User $PgUser -Password $PgPassword
Enable-LaragonPostgresqlAutoStart -LaragonRoot $LaragonRoot

Write-Step 'Ortam dosyalari'
$backendEnvExample = Join-Path $RepoRoot 'backend\backend.env.example'
$backendEnv = Join-Path $RepoRoot 'backend\backend.env'
if (-not (Test-Path $backendEnv) -and (Test-Path $backendEnvExample)) {
    Copy-Item $backendEnvExample $backendEnv
    Write-Host '[OK] backend\backend.env olusturuldu' -ForegroundColor Green
} else {
    Write-Host '[OK] backend\backend.env mevcut' -ForegroundColor Green
}

$feExample = Join-Path $RepoRoot 'frontend\.env.local.example'
$feLocal = Join-Path $RepoRoot 'frontend\.env.local'
if (-not (Test-Path $feLocal) -and (Test-Path $feExample)) {
    Copy-Item $feExample $feLocal
    Write-Host '[OK] frontend\.env.local olusturuldu' -ForegroundColor Green
} else {
    Write-Host '[OK] frontend\.env.local mevcut' -ForegroundColor Green
}

if (-not $SkipMigrations) {
    Write-Step 'SQL migration'
    if (Test-TravelSchemaReady -Psql $tools.Psql -Database $PgDatabase -User $PgUser -Password $PgPassword) {
        Write-Host '[OK] travel semasi zaten var - migration atlandi' -ForegroundColor Green
        Write-Host '     (sifirdan kurmak icin: travel DB silin veya -ResetPostgresData)' -ForegroundColor DarkGray
    } else {
        $runAll = Join-Path $RepoRoot 'backend\priv\sql\run_all.ps1'
        if (-not (Test-Path $runAll)) { throw "run_all.ps1 yok: $runAll" }
        $env:PGDATABASE = $PgDatabase
        $env:PGUSER = $PgUser
        if ($PgPassword) { $env:PGPASSWORD = $PgPassword } else { Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue }
        Push-Location (Split-Path $runAll -Parent)
        try {
            & powershell -ExecutionPolicy Bypass -File $runAll
        } finally {
            Pop-Location
        }
        Write-Host '[OK] Tum SQL modulleri uygulandi' -ForegroundColor Green
    }
}

if (-not $SkipNpm) {
    Write-Step 'Frontend bagimliliklari'
    $nodeDir = @(
        (Join-Path $LaragonRoot 'bin\nodejs\node-v24'),
        (Join-Path $LaragonRoot 'bin\nodejs\node-v22')
    ) | Where-Object { Test-Path (Join-Path $_ 'node.exe') } | Select-Object -First 1

    if ($nodeDir) {
        $env:PATH = "$nodeDir;$nodeDir\node_modules\npm\bin;" + $env:PATH
        Write-Host "[OK] Node: $(Join-Path $nodeDir 'node.exe')" -ForegroundColor Green
    } else {
        Write-Host 'UYARI: Laragon Node bulunamadi - PATH uzerindeki node kullanilacak' -ForegroundColor Yellow
    }

    Push-Location (Join-Path $RepoRoot 'frontend')
    try {
        if (Test-Path 'package-lock.json') {
            npm ci
        } else {
            npm install
        }
    } finally {
        Pop-Location
    }
    Write-Host '[OK] npm install tamam' -ForegroundColor Green
}

if (-not $SkipGleam) {
    Write-Step 'Gleam / Erlang'
    $setup = Join-Path $RepoRoot 'scripts\setup-local-windows.ps1'
    if (Test-Path $setup) {
        & powershell -ExecutionPolicy Bypass -File $setup
    } else {
        Push-Location (Join-Path $RepoRoot 'backend')
        try {
            gleam build
        } finally {
            Pop-Location
        }
    }
}

Write-Step 'Dogrulama'
$metaOk = $false
try {
    $r = Invoke-WebRequest -Uri 'http://127.0.0.1:8080/api/v1/meta' -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    $metaOk = ($r.StatusCode -eq 200)
} catch {
    $metaOk = $false
}

if ($metaOk) {
    Write-Host '[OK] travel-api zaten calisiyor (8080)' -ForegroundColor Green
} else {
    $count = (& $tools.Psql -h 127.0.0.1 -p 5432 -U $PgUser -d $PgDatabase -t -A -c 'SELECT count(*) FROM locales' 2>$null).Trim()
    if ($count -match '^\d+$') {
        Write-Host "[OK] DB baglantisi + locales=$count" -ForegroundColor Green
    } else {
        Write-Host 'UYARI: DB dogrulama tamamlanamadi' -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host '=== Kurulum tamam ===' -ForegroundColor Green
Write-Host 'Laragon: Menu > Preferences > General > "Start All automatically" acik olsun; PostgreSQL tikli olsun.'
Write-Host ''
Write-Host 'Calistirma (iki ayri terminal):'
Write-Host ('  1) cd ' + $RepoRoot)
Write-Host '     .\scripts\start-travel-api.ps1'
Write-Host ('  2) cd ' + $RepoRoot)
Write-Host '     .\scripts\start-frontend.ps1'
Write-Host ''
Write-Host 'Tarayici: http://localhost:3000'
Write-Host 'API:      http://127.0.0.1:8080/api/v1/meta'
