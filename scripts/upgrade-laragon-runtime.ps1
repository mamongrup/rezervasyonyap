# Laragon runtime yükseltme: Node 24, PostgreSQL 18.4
# Yönetici PowerShell: .\scripts\upgrade-laragon-runtime.ps1
param(
    [string]$LaragonRoot = 'C:\laragon',
    [string]$NodeVersion = '24.16.0',
    [switch]$SkipNode,
    [switch]$SkipPostgres
)

$ErrorActionPreference = 'Stop'
$nodeDir = Join-Path $LaragonRoot "bin\nodejs\node-v24"
$pgRoot = Join-Path $LaragonRoot 'bin\postgresql'
$pgDir = Join-Path $pgRoot 'postgresql-18.4'
$pgActive = Join-Path $pgRoot 'postgresql'

function Write-Step($m) { Write-Host "`n==> $m" -ForegroundColor Cyan }

if (-not $SkipNode) {
    Write-Step "Node.js $NodeVersion -> $nodeDir"
    if (-not (Test-Path (Join-Path $nodeDir 'node.exe'))) {
        $zip = Join-Path $env:TEMP "node-v$NodeVersion-win-x64.zip"
        $url = "https://nodejs.org/dist/v$NodeVersion/node-v$NodeVersion-win-x64.zip"
        Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
        New-Item -ItemType Directory -Force -Path $nodeDir | Out-Null
        Expand-Archive -Path $zip -DestinationPath $env:TEMP -Force
        $extracted = Join-Path $env:TEMP "node-v$NodeVersion-win-x64"
        Get-ChildItem $extracted | ForEach-Object {
            Copy-Item $_.FullName -Destination $nodeDir -Recurse -Force
        }
        Remove-Item $zip, $extracted -Recurse -Force -ErrorAction SilentlyContinue
    }
    & (Join-Path $nodeDir 'node.exe') -v
    Write-Host "Laragon: Menu > Node.js > node-v24 secin" -ForegroundColor Yellow
}

if (-not $SkipPostgres) {
    Write-Step "PostgreSQL 18.4 -> $pgDir"
    if (-not (Test-Path (Join-Path $pgDir 'bin\psql.exe'))) {
        $zip = Join-Path $env:TEMP 'postgresql-18.4-binaries.zip'
        $url = 'https://get.enterprisedb.com/postgresql/postgresql-18.4-1-windows-x64-binaries.zip'
        Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
        New-Item -ItemType Directory -Force -Path $pgRoot | Out-Null
        Expand-Archive -Path $zip -DestinationPath $pgRoot -Force
        $inner = Get-ChildItem $pgRoot -Directory | Where-Object { $_.Name -like 'pgsql*' } | Select-Object -First 1
        if ($inner -and $inner.Name -ne 'postgresql-18.4') {
            if (Test-Path $pgDir) { Remove-Item $pgDir -Recurse -Force }
            Rename-Item $inner.FullName 'postgresql-18.4'
        }
        Remove-Item $zip -Force -ErrorAction SilentlyContinue
    }
    & (Join-Path $pgDir 'bin\psql.exe') --version

    if (Test-Path $pgActive) {
        $item = Get-Item $pgActive -Force
        if ($item.LinkType -eq 'Junction') {
            cmd /c "rmdir `"$pgActive`""
        } elseif ($item.PSIsContainer) {
            $bak = Join-Path $pgRoot ("postgresql.bak-" + (Get-Date -Format 'yyyyMMdd-HHmm'))
            Rename-Item $pgActive $bak
        }
    }
    if (-not (Test-Path $pgActive)) {
        cmd /c "mklink /J `"$pgActive`" `"$pgDir`""
    }
    Write-Host "Laragon: Menu > PostgreSQL > 18.4 secin, servisi yeniden baslatin" -ForegroundColor Yellow
}

Write-Step "Gleam / OTP (winget)"
if (Get-Command gleam -ErrorAction SilentlyContinue) { gleam --version } else { Write-Host "gleam PATH'te yok — winget install Gleam.Gleam" }
if (Get-Command erl -ErrorAction SilentlyContinue) {
    erl -eval "erlang:display(erlang:system_info(otp_release)), halt()." -noshell
}

Write-Host "`nTamam. frontend: cd frontend; npm ci" -ForegroundColor Green
