param(
    [Parameter(Mandatory = $true)]
    [string]$Server,
    [string]$User = 'root',
    [int]$Port = 22,
    [string]$AppRoot = '/opt/rezervasyonyap',
    [string]$Ref = 'main',
    [ValidateSet('0', '1')]
    [string]$RestartWeb = '1',
    [ValidateSet('0', '1')]
    [string]$RestartApi = '1'
)

$ErrorActionPreference = 'Stop'

$null = Get-Command ssh -ErrorAction Stop

$remoteCmd = @(
    "set -euo pipefail"
    "cd $AppRoot"
    "chmod +x deploy/deploy.sh deploy/verify.sh"
    "DEPLOY_REF=$Ref RESTART_WEB=$RestartWeb RESTART_API=$RestartApi ./deploy/deploy.sh"
) -join '; '

$sshTarget = "${User}@${Server}"
$sshArgs = @('-p', "$Port", $sshTarget, $remoteCmd)

Write-Host "Sunucu: $sshTarget"
Write-Host "Port:   $Port"
Write-Host "Dizin:  $AppRoot"
Write-Host "Ref:    $Ref"
Write-Host ""

& ssh @sshArgs
$exitCode = $LASTEXITCODE

if ($exitCode -ne 0) {
    Write-Error "Deploy basarisiz. SSH komutu cikis kodu: $exitCode"
    exit $exitCode
}

Write-Host ""
Write-Host "Deploy tamamlandi."
