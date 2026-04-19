# Windows Task Scheduler'a "TravelNightlyRecompute" gorevini kaydet.
#
# Bu script otomatik olarak Yonetici hakki ister (UAC promptu).
# Manuel "Yonetici olarak PowerShell calistir" yapilmasina gerek yoktur.

$ErrorActionPreference = 'Stop'

# Auto-elevate: yonetici degilsek kendimizi yonetici olarak yeniden baslat.
$identity  = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "[i] Yonetici hakki gerekli - UAC promptu acilacak..." -ForegroundColor Yellow
    $argList = @(
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-File', "`"$PSCommandPath`""
    )
    Start-Process -FilePath 'powershell.exe' -ArgumentList $argList -Verb RunAs
    exit 0
}

$taskName  = 'TravelNightlyRecompute'
$repoRoot  = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$script    = Join-Path $PSScriptRoot 'nightly-recompute.ps1'

if (-not (Test-Path $script)) {
    Write-Error "Script bulunamadi: $script"
    exit 1
}

$action  = New-ScheduledTaskAction `
    -Execute 'powershell.exe' `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$script`"" `
    -WorkingDirectory $repoRoot

$trigger = New-ScheduledTaskTrigger -Daily -At '03:00'
$settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -AllowStartIfOnBatteries `
    -RunOnlyIfNetworkAvailable

if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Host "  ! Eski gorev silindi."
}

Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description "Travel - her gece 03:00 super-host recompute" `
    -RunLevel Highest | Out-Null

Write-Host "[OK] '$taskName' gorevi kaydedildi (her gun 03:00)."
Write-Host ""
Write-Host "Manuel test: powershell -ExecutionPolicy Bypass -File .\scripts\cron\nightly-recompute.ps1"
Write-Host "Loglar: scripts\cron\logs\YYYY-MM-DD.log"
