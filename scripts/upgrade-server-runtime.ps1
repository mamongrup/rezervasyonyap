param(
    [Parameter(Mandatory = $true)]
    [string]$Server,
    [string]$User = 'root',
    [int]$Port = 22,
    [string]$AppRoot = '/var/www/vhosts/rezervasyonyap.tr/httpdocs',
    [ValidateSet('0', '1')]
    [string]$UpgradeNode = '1',
    [ValidateSet('0', '1')]
    [string]$UpgradePg = '1',
    [ValidateSet('0', '1')]
    [string]$UpgradeGleam = '1',
    [ValidateSet('0', '1')]
    [string]$Rebuild = '1'
)

$ErrorActionPreference = 'Stop'
$null = Get-Command ssh -ErrorAction Stop

$remoteCmd = @(
    "set -euo pipefail"
    "cd $AppRoot"
    "git pull"
    "chmod +x deploy/scripts/upgrade-runtime.sh deploy/deploy.sh deploy/verify.sh"
    "APP_ROOT=$AppRoot UPGRADE_NODE=$UpgradeNode UPGRADE_PG=$UpgradePg UPGRADE_GLEAM=$UpgradeGleam REBUILD=$Rebuild ./deploy/scripts/upgrade-runtime.sh"
) -join '; '

$sshTarget = "${User}@${Server}"
Write-Host "Runtime upgrade: $sshTarget ($AppRoot)"
Write-Host ""

& ssh -p $Port $sshTarget $remoteCmd
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "`nSunucu runtime guncellemesi tamam."
