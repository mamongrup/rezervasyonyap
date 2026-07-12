# Sifirdan Laragon + travel kurulumu (git PATH'te olmasa da calisir).
# Yonetici PowerShell — herhangi bir dizinden:
#   Set-ExecutionPolicy Bypass -Scope Process -Force
#   irm https://raw.githubusercontent.com/mamongrup/rezervasyonyap/main/scripts/bootstrap-laragon-travel.ps1 | iex
#
# Veya indirip:
#   powershell -ExecutionPolicy Bypass -File C:\Users\...\Downloads\bootstrap-laragon-travel.ps1

param(
    [string]$LaragonRoot = 'C:\laragon',
    [string]$RepoRoot = '',
    [string]$Branch = 'main',
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

function Invoke-GitQuiet {
    param(
        [Parameter(Mandatory = $true)][string]$GitExe,
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [string]$WorkingDirectory = ''
    )

    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'SilentlyContinue'
    try {
        if ($WorkingDirectory) {
            Push-Location $WorkingDirectory
        }
        try {
            # Git stderr (ornegin "From https://...") PowerShell'de NativeCommandError uretir; yoksay.
            $null = & $GitExe @Arguments 2>&1
        } catch {
            # stderr kaynakli false-positive; exit code'a guven
        }
        return $LASTEXITCODE
    } finally {
        if ($WorkingDirectory) {
            Pop-Location
        }
        $ErrorActionPreference = $prev
    }
}

function Update-SetupScriptsFromGithub {
    param(
        [Parameter(Mandatory = $true)][string]$TargetRoot,
        [string]$BranchName = 'main'
    )

    $base = "https://raw.githubusercontent.com/mamongrup/rezervasyonyap/$BranchName"
    $files = @(
        'scripts/finish-laragon-setup.ps1',
        'scripts/lib/Resolve-LaragonPostgresql.ps1',
        'scripts/bootstrap-laragon-travel.ps1'
    )

    foreach ($rel in $files) {
        $url = "$base/$rel"
        $dest = Join-Path $TargetRoot ($rel -replace '/', '\')
        $parent = Split-Path $dest -Parent
        if ($parent -and -not (Test-Path $parent)) {
            New-Item -ItemType Directory -Force -Path $parent | Out-Null
        }
        try {
            Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing
            Write-Host "[OK] Guncellendi: $rel" -ForegroundColor DarkGray
        } catch {
            Write-Host "Script indirilemedi: $rel" -ForegroundColor Yellow
        }
    }
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
            Invoke-GitQuiet -GitExe $GitExe -Arguments @('fetch', 'origin') -WorkingDirectory $TargetRoot | Out-Null
            $remoteRef = "origin/$BranchName"
            $checkoutCode = Invoke-GitQuiet -GitExe $GitExe -Arguments @('checkout', '-B', $BranchName, $remoteRef) -WorkingDirectory $TargetRoot
            if ($checkoutCode -ne 0) {
                Write-Host "git checkout $BranchName basarisiz - mevcut dosyalarla devam" -ForegroundColor Yellow
            } else {
                Invoke-GitQuiet -GitExe $GitExe -Arguments @('pull', 'origin', $BranchName) -WorkingDirectory $TargetRoot | Out-Null
            }
        }
        return $TargetRoot
    }

    if (Test-Path $TargetRoot) {
        $items = Get-ChildItem $TargetRoot -Force -ErrorAction SilentlyContinue
        if ($items -and $items.Count -gt 0) {
            throw "Hedef dolu ama git repo degil: $TargetRoot - klasoru bosaltin veya baska yol verin."
        }
    } else {
        New-Item -ItemType Directory -Force -Path $TargetRoot | Out-Null
    }

    if ($GitExe) {
        Write-Host "Git ile klonlaniyor: $RepoUrl -> $TargetRoot" -ForegroundColor Yellow
        $env:PATH = "$(Split-Path $GitExe -Parent);$env:PATH"
        $cloneCode = Invoke-GitQuiet -GitExe $GitExe -Arguments @('clone', '--branch', $BranchName, '--single-branch', $RepoUrl, $TargetRoot)
        if ($cloneCode -ne 0) {
            Write-Host "Branch klonu basarisiz, main klonlaniyor..." -ForegroundColor Yellow
            if (Test-Path $TargetRoot) { Remove-Item $TargetRoot -Recurse -Force }
            $mainCode = Invoke-GitQuiet -GitExe $GitExe -Arguments @('clone', $RepoUrl, $TargetRoot)
            if ($mainCode -ne 0) { throw "git clone basarisiz (exit $mainCode)" }
        }
        return $TargetRoot
    }

    Write-Host 'Git yok - GitHub zip indiriliyor...' -ForegroundColor Yellow
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
    throw "Laragon bulunamadi: $LaragonRoot - Laragon kurulu mu?"
}

$www = Join-Path $LaragonRoot 'www'
New-Item -ItemType Directory -Force -Path $www | Out-Null

$git = Find-GitExecutable
if ($git) {
    Write-Host "[OK] Git: $git" -ForegroundColor Green
} else {
    Write-Host 'Git PATH yok - zip ile indirilecek (Laragon Menu > Tools > Git kurabilirsiniz)' -ForegroundColor Yellow
}

$repo = Ensure-Repo -TargetRoot $RepoRoot -GitExe $git -BranchName $Branch

$finish = Join-Path $repo 'scripts\finish-laragon-setup.ps1'
if (-not (Test-Path $finish)) {
    throw "finish-laragon-setup.ps1 yok: $finish - branch guncel mi kontrol edin."
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
