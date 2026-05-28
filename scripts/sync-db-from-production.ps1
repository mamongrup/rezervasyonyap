# sync-db-from-production.ps1
# Uretim PostgreSQL (travel) -> yerel Laragon. Sunucuya bir sey yazmaz.
#
#   .\scripts\sync-db-from-production.ps1 -Server 50.114.185.100 -User root
#   .\scripts\sync-db-from-production.ps1 -Server 50.114.185.100 -User root -DownloadOnly
#
param(
    [Parameter(Mandatory = $true)]
    [string]$Server,
    [string]$User = 'root',
    [int]$Port = 22,
    [switch]$DownloadOnly
)

$params = @{
    Server       = $Server
    User         = $User
    Port         = $Port
    SkipUploads  = $true
    SkipEnvFiles = $true
}
if ($DownloadOnly) {
    $params.DownloadOnly = $true
}

& "$PSScriptRoot\sync-from-production.ps1" @params
exit $LASTEXITCODE
