# Sifirdan Laragon + travel kurulumu (git PATH'te olmasa da calisir).
# Yonetici PowerShell — herhangi bir dizinden:
#   Set-ExecutionPolicy Bypass -Scope Process -Force
#   irm https://raw.githubusercontent.com/mamongrup/rezervasyonyap/cursor/finish-laragon-setup-e166/scripts/bootstrap-laragon-travel.ps1 | iex
#
# Veya indirip:
#   powershell -ExecutionPolicy Bypass -File C:\Users\...\Downloads\bootstrap-laragon-travel.ps1

param(
    [string]$LaragonRoot = 'C:\laragon',
    [string]$RepoRoot = '',
    [string]$Branch = 'cursor/finish-laragon-setup-e166',
    [string]$RepoUrl = 'https://github.com/mamongrup/rezervasyonyap.git',
    [switch]$ResetPostgresData
)

$ErrorActionPreference = 'Stop'

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "=== $Message ===" -ForegroundColor Cyan
}

function Find-GitExecutable {
    $candidates = @(
        (Join-Path $LaragonRoot 'bin\git\bin\git.exe'),
        (Join-Path $LaragonRoot 'bin\git\mingw64\bin\git.exe'),
        'C:\Program Files\Git\cmd\git.exe',
        'C:\Program Files\Git\bin\git.exe',
        'C:\Program Files (x86)\Git\cmd\git.exe'
    )
    foreach ($path in $candidates) {
        if (Test-Path $path) { return $path }
    }
    $cmd = Get-Command git.exe -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    return $null
}

function Ensure-Repo {
    param(
        [string]$TargetRoot,
        [string]$GitExe,
        [string]$BranchName
    )

    if (Test-Path (Join-Path $TargetRoot '.git')) {
        Write-Host "[OK] Repo mevcut: $TargetRoot" -ForegroundColor Green
        if ($GitExe) {
            $env:PATH = "$(Split-Path $GitExe -Parent);$env:PATH"
            Push-Location $TargetRoot
            try {
                & $GitExe fetch origin $BranchName 2>$null
                & $GitExe checkout $BranchName 2>$null
                if ($LASTEXITCODE -ne 0) {
                    & $GitExe checkout main 2>$null
                    & $GitExe pull origin main 2>$null
                } else {
                    & $GitExe pull origin $BranchName 2>$null
                }
            } finally {
                Pop-Location
            }
        }
        return $TargetRoot
    }

    if (Test-Path $TargetRoot) {
        $items = Get-ChildItem $TargetRoot -Force -ErrorAction SilentlyContinue
        if ($items -and $items.Count -gt 0) {
            throw "Hedef dolu ama git repo degil: $TargetRoot — klasoru bosaltin veya baska yol verin."
        }
    } else {
        New-Item -ItemType Directory -Force -Path $TargetRoot | Out-Null
    }

    if ($GitExe) {
        Write-Host "Git ile klonlaniyor: $RepoUrl -> $TargetRoot" -ForegroundColor Yellow
        $env:PATH = "$(Split-Path $GitExe -Parent);$env:PATH"
        & $GitExe clone --branch $BranchName --single-branch $RepoUrl $TargetRoot 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Branch klonu basarisiz, main klonlaniyor..." -ForegroundColor Yellow
            if (Test-Path $TargetRoot) { Remove-Item $TargetRoot -Recurse -Force }
            & $GitExe clone $RepoUrl $TargetRoot
            if ($LASTEXITCODE -ne 0) { throw "git clone basarisiz (exit $LASTEXITCODE)" }
        }
        return $TargetRoot
    }

    Write-Host 'Git yok — GitHub zip indiriliyor...' -ForegroundColor Yellow
    $zipUrl = "https://github.com/mamongrup/rezervasyonyap/archive/refs/heads/$BranchName.zip"
    $altZipUrl = 'https://github.com/mamongrup/rezervasyonyap/archive/refs/heads/main.zip'
    $zipPath = Join-Path $env:TEMP 'rezervasyonyap-bootstrap.zip'
    $extractRoot = Join-Path $env:TEMP 'rezervasyonyap-bootstrap-extract'

    if (Test-Path $extractRoot) { Remove-Item $extractRoot -Recurse -Force }
    New-Item -ItemType Directory -Force -Path $extractRoot | Out-Null

    try {
        Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing
    } catch {
        Write-Host "Branch zip alinamadi, main deneniyor..." -ForegroundColor Yellow
        Invoke-WebRequest -Uri $altZipUrl -OutFile $zipPath -UseBasicParsing
    }

    Expand-Archive -Path $zipPath -DestinationPath $extractRoot -Force
    $inner = Get-ChildItem $extractRoot -Directory | Select-Object -First 1
    if (-not $inner) { throw 'Zip acildi ama klasor bulunamadi.' }

    if (Test-Path $TargetRoot) { Remove-Item $TargetRoot -Recurse -Force }
    Move-Item $inner.FullName $TargetRoot
    Remove-Item $zipPath, $extractRoot -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "[OK] Zip kuruldu: $TargetRoot" -ForegroundColor Green
    return $TargetRoot
}

Write-Step 'Laragon travel bootstrap'

if (-not $RepoRoot) {
    $RepoRoot = Join-Path $LaragonRoot 'www\travel'
}

Write-Host "Laragon: $LaragonRoot"
Write-Host "Repo:    $RepoRoot"
Write-Host "Branch:  $Branch"

if (-not (Test-Path $LaragonRoot)) {
    throw "Laragon bulunamadi: $LaragonRoot — Laragon kurulu mu?"
}

$www = Join-Path $LaragonRoot 'www'
New-Item -ItemType Directory -Force -Path $www | Out-Null

$git = Find-GitExecutable
if ($git) {
    Write-Host "[OK] Git: $git" -ForegroundColor Green
} else {
    Write-Host 'Git PATH yok — zip ile indirilecek (Laragon Menu > Tools > Git kurabilirsiniz)' -ForegroundColor Yellow
}

$repo = Ensure-Repo -TargetRoot $RepoRoot -GitExe $git -BranchName $Branch

$finish = Join-Path $repo 'scripts\finish-laragon-setup.ps1'
if (-not (Test-Path $finish)) {
    throw "finish-laragon-setup.ps1 yok: $finish — branch guncel mi kontrol edin."
}

Write-Step 'Kurulum scripti calistiriliyor'
$args = @(
    '-ExecutionPolicy', 'Bypass',
    '-File', $finish,
    '-LaragonRoot', $LaragonRoot,
    '-RepoRoot', $repo
)
if ($ResetPostgresData) { $args += '-ResetPostgresData' }

& powershell @args
