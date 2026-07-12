# GitHub main branch'ten travel projesini Laragon'a indirir / gunceller.
# Kullanim (Yonetici PowerShell):
#   powershell -ExecutionPolicy Bypass -File .\scripts\clone-travel-from-git.ps1
#   powershell -ExecutionPolicy Bypass -File .\scripts\clone-travel-from-git.ps1 -Force
#
# Herhangi bir dizinden tek satir:
#   irm https://raw.githubusercontent.com/mamongrup/rezervasyonyap/main/scripts/clone-travel-from-git.ps1 | iex

param(
    [string]$LaragonRoot = 'C:\laragon',
    [string]$RepoRoot = '',
    [string]$Branch = 'main',
    [string]$RepoUrl = 'https://github.com/mamongrup/rezervasyonyap.git',
    [switch]$Force,
    [switch]$SkipSetup
)

$ErrorActionPreference = 'Stop'

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "=== $Message ===" -ForegroundColor Cyan
}

function Find-GitExecutable([string]$Root) {
    $candidates = @(
        (Join-Path $Root 'bin\git\bin\git.exe'),
        (Join-Path $Root 'bin\git\mingw64\bin\git.exe'),
        'C:\Program Files\Git\cmd\git.exe',
        'C:\Program Files\Git\bin\git.exe'
    )
    foreach ($path in $candidates) {
        if (Test-Path $path) { return $path }
    }
    $cmd = Get-Command git.exe -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    return $null
}

function Invoke-GitQuiet {
    param(
        [Parameter(Mandatory = $true)][string]$GitExe,
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [string]$WorkingDirectory = ''
    )
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'SilentlyContinue'
    try {
        if ($WorkingDirectory) { Push-Location $WorkingDirectory }
        try { $null = & $GitExe @Arguments 2>&1 } catch { }
        return $LASTEXITCODE
    } finally {
        if ($WorkingDirectory) { Pop-Location }
        $ErrorActionPreference = $prev
    }
}

if (-not $RepoRoot) {
    $RepoRoot = Join-Path $LaragonRoot 'www\travel'
}

Write-Step 'GitHub main -> Laragon travel'
Write-Host "Hedef:  $RepoRoot"
Write-Host "Branch: $Branch"

$git = Find-GitExecutable -Root $LaragonRoot
if (-not $git) {
    throw 'Git bulunamadi. Laragon Menu > Tools > Git kurun veya https://git-scm.com/download/win'
}
Write-Host "[OK] Git: $git" -ForegroundColor Green
$env:PATH = "$(Split-Path $git -Parent);$env:PATH"

$backendEnvBackup = $null
$feLocalBackup = $null
if (Test-Path $RepoRoot) {
    $be = Join-Path $RepoRoot 'backend\backend.env'
    $fe = Join-Path $RepoRoot 'frontend\.env.local'
    if (Test-Path $be) { $backendEnvBackup = Get-Content $be -Raw }
    if (Test-Path $fe) { $feLocalBackup = Get-Content $fe -Raw }
}

$hasGit = Test-Path (Join-Path $RepoRoot '.git')

if ($Force -or -not $hasGit) {
    if (Test-Path $RepoRoot) {
        $bak = Join-Path (Split-Path $RepoRoot -Parent) ("travel.bak-" + (Get-Date -Format 'yyyyMMdd-HHmmss'))
        Write-Host "Mevcut klasor yedekleniyor: $bak" -ForegroundColor Yellow
        Rename-Item -Path $RepoRoot -NewName (Split-Path $bak -Leaf)
    }
    New-Item -ItemType Directory -Force -Path (Split-Path $RepoRoot -Parent) | Out-Null
    Write-Host "Klonlaniyor: $RepoUrl" -ForegroundColor Yellow
    $cloneCode = Invoke-GitQuiet -GitExe $git -Arguments @('clone', '--branch', $Branch, '--single-branch', $RepoUrl, $RepoRoot)
    if ($cloneCode -ne 0) {
        if (Test-Path $RepoRoot) { Remove-Item $RepoRoot -Recurse -Force }
        $cloneCode = Invoke-GitQuiet -GitExe $git -Arguments @('clone', $RepoUrl, $RepoRoot)
        if ($cloneCode -ne 0) { throw "git clone basarisiz (exit $cloneCode)" }
        Invoke-GitQuiet -GitExe $git -Arguments @('checkout', '-B', $Branch, "origin/$Branch") -WorkingDirectory $RepoRoot | Out-Null
    }
} else {
    Write-Host 'Mevcut repo guncelleniyor (git fetch + reset)...' -ForegroundColor Yellow
    Invoke-GitQuiet -GitExe $git -Arguments @('fetch', 'origin') -WorkingDirectory $RepoRoot | Out-Null
    $resetCode = Invoke-GitQuiet -GitExe $git -Arguments @('reset', '--hard', "origin/$Branch") -WorkingDirectory $RepoRoot
    if ($resetCode -ne 0) {
        Invoke-GitQuiet -GitExe $git -Arguments @('checkout', '-B', $Branch, "origin/$Branch") -WorkingDirectory $RepoRoot | Out-Null
        Invoke-GitQuiet -GitExe $git -Arguments @('pull', 'origin', $Branch) -WorkingDirectory $RepoRoot | Out-Null
    }
}

if ($backendEnvBackup) {
    Set-Content -Path (Join-Path $RepoRoot 'backend\backend.env') -Value $backendEnvBackup -Encoding UTF8
    Write-Host '[OK] backend.env geri yuklendi' -ForegroundColor DarkGray
}
if ($feLocalBackup) {
    Set-Content -Path (Join-Path $RepoRoot 'frontend\.env.local') -Value $feLocalBackup -Encoding UTF8
    Write-Host '[OK] frontend\.env.local geri yuklendi' -ForegroundColor DarkGray
}

$head = Invoke-GitQuiet -GitExe $git -Arguments @('rev-parse', '--short', 'HEAD') -WorkingDirectory $RepoRoot
Write-Host "[OK] Proje hazir: $RepoRoot (HEAD $head)" -ForegroundColor Green

if (-not $SkipSetup) {
    $finish = Join-Path $RepoRoot 'scripts\finish-laragon-setup.ps1'
    if (Test-Path $finish) {
        Write-Step 'Kurulum (migration, npm, gleam)'
        & powershell -ExecutionPolicy Bypass -File $finish -LaragonRoot $LaragonRoot -RepoRoot $RepoRoot
    }
}

Write-Host ""
Write-Host 'Tamam. Calistirma:' -ForegroundColor Green
Write-Host "  cd $RepoRoot"
Write-Host '  .\scripts\start-travel-api.ps1'
Write-Host '  .\scripts\start-frontend.ps1'
