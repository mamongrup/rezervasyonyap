# Excalibur phpMyAdmin dump → yerel MySQL (Laragon)
# Kullanım (travel kökünden):
#   .\scripts\import-excalibur-mysql.ps1
#   .\scripts\import-excalibur-mysql.ps1 -SqlFile "$env:USERPROFILE\Downloads\rezervasyonyapco_excalibur.sql"

param(
    [string]$SqlFile = "$env:USERPROFILE\Downloads\rezervasyonyapco_excalibur (3).sql",
    [string]$Database = "rezervasyonyapco_excalibur",
    [string]$MysqlExe = "C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysql.exe"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $SqlFile)) {
    Write-Error "SQL dosyası bulunamadı: $SqlFile"
}

if (-not (Test-Path $MysqlExe)) {
    $found = Get-ChildItem -Path "C:\laragon\bin\mysql" -Filter mysql.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) { $MysqlExe = $found.FullName }
    else { throw "mysql.exe bulunamadı. -MysqlExe ile verin." }
}

Write-Host "Veritabanı: $Database" -ForegroundColor Cyan
& $MysqlExe -h 127.0.0.1 -u root -e "CREATE DATABASE IF NOT EXISTS ``$Database`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "İçe aktarılıyor (büyük dosya, birkaç dakika sürebilir)..." -ForegroundColor Yellow
Get-Content -Path $SqlFile -Raw -Encoding UTF8 | & $MysqlExe -h 127.0.0.1 -u root $Database
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Tamam. Sonra: node scripts/sync-excalibur-bravo.mjs --mysql-database $Database" -ForegroundColor Green
