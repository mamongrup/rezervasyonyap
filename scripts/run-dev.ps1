$ErrorActionPreference = "Stop"

# Load backend.env
$envFile = "c:\laragon\www\travel\backend\backend.env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $parts = $line.Split("=", 2)
            $k = $parts[0].Trim()
            $v = $parts[1].Trim().Trim('"').Trim("'")
            [System.Environment]::SetEnvironmentVariable($k, $v, "Process")
        }
    }
}

$env:PORT = "8090"
$env:DATABASE_URL = "postgres://postgres@127.0.0.1:5432/travel?sslmode=disable"
$env:PGHOST = "127.0.0.1"
$env:PGPORT = "5432"
$env:PGUSER = "postgres"
$env:PGDATABASE = "travel"
$env:INTERNAL_API_ORIGIN = "http://127.0.0.1:8090"
$env:ADMIN_ORIGIN = "http://127.0.0.1:8090"

# Ensure junction build\dev\erlang\backend\priv -> backend\priv_data
$privTarget = "c:\laragon\www\travel\backend\priv_data"
$buildPriv = "c:\laragon\www\travel\backend\build\dev\erlang\backend\priv"
if (-not (Test-Path $buildPriv)) {
    cmd /c "mklink /J $buildPriv $privTarget"
}

# Collect all ebin directories
$ebinDirs = Get-ChildItem -Path "c:\laragon\www\travel\backend\build\dev\erlang" -Directory -Filter ebin -Recurse | Select-Object -ExpandProperty FullName
$paArgs = $ebinDirs | ForEach-Object { "-pa `"${_}`"" }
$paString = $paArgs -join " "

Write-Host "Travel API (Gleam SSR + HTMX) port 8090 uzerinde baslatiliyor..."
$cmd = "erl -noshell $paString -eval `"backend:main().`""
Invoke-Expression $cmd
