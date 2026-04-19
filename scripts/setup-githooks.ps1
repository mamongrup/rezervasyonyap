# Travel monorepo — git hooks aktive et.
# Çalıştır: powershell -ExecutionPolicy Bypass -File .\scripts\setup-githooks.ps1

$ErrorActionPreference = 'Stop'
$repoRoot = git rev-parse --show-toplevel
if (-not $repoRoot) {
    Write-Error 'Bu klasör bir git deposu değil.'
    exit 1
}
Set-Location $repoRoot

git config core.hooksPath .githooks
Write-Host '✓ git config core.hooksPath = .githooks' -ForegroundColor Green

# Hook dosyalarını executable yap (Git Bash için, sadece tracked olduğunda).
if (Test-Path .githooks/pre-commit) {
    $tracked = git ls-files --error-unmatch .githooks/pre-commit 2>$null
    if ($LASTEXITCODE -eq 0) {
        git update-index --chmod=+x .githooks/pre-commit 2>$null | Out-Null
        Write-Host '✓ .githooks/pre-commit yürütülebilir.' -ForegroundColor Green
    } else {
        Write-Host '! .githooks/pre-commit henüz commit edilmemiş; commit ettikten sonra `git update-index --chmod=+x .githooks/pre-commit` çalıştırın.' -ForegroundColor Yellow
    }
}

Write-Host ''
Write-Host 'Pre-commit kontrolleri:' -ForegroundColor Cyan
Write-Host '  1. Migration drift (install_order.txt ↔ priv/sql/modules/)'
Write-Host '  2. Backend .gleam değişikliği varsa  -> gleam build'
Write-Host '  3. Frontend .ts/.tsx değişikliği varsa -> pnpm lint'
Write-Host ''
Write-Host 'Devre dışı bırakmak: git config --unset core.hooksPath'
