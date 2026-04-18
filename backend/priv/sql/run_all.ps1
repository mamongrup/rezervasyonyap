# PostgreSQL — install_order.txt içindeki modules/*.sql dosyalarını sırayla uygular.
# Kullanım (Laragon): .\run_all.ps1
# Ortam: $env:PGDATABASE (varsayılan travel), $env:PGUSER (varsayılan postgres)
$ErrorActionPreference = 'Stop'
$psql = if ($env:PSQL) { $env:PSQL } else { 'C:\laragon\bin\postgresql\postgresql\bin\psql.exe' }
if (-not (Test-Path $psql)) { $psql = 'psql' }
$base = Split-Path -Parent $MyInvocation.MyCommand.Path
$db = if ($env:PGDATABASE) { $env:PGDATABASE } else { 'travel' }
$user = if ($env:PGUSER) { $env:PGUSER } else { 'postgres' }
$files = Get-Content (Join-Path $base 'install_order.txt') -Encoding UTF8 |
  Where-Object { $_ -match '^modules/.+\.sql\s*$' }
foreach ($rel in $files) {
  $rel = $rel.Trim()
  $path = Join-Path $base $rel
  if (-not (Test-Path $path)) { throw "Dosya yok: $path" }
  Write-Host "=== $rel ==="
  & $psql -U $user -d $db -v ON_ERROR_STOP=1 -f $path
  if ($LASTEXITCODE -ne 0) { throw "Hata: $rel (exit $LASTEXITCODE)" }
}
Write-Host 'Tamam: tum moduller uygulandi.'
