# Laragon / Windows PostgreSQL yardımcıları (finish-laragon-setup.ps1 tarafından dot-source edilir)

function Get-LaragonPostgresqlTools {
    param(
        [string]$LaragonRoot = 'C:\laragon'
    )

    $candidates = @(
        (Join-Path $LaragonRoot 'bin\postgresql\postgresql\bin'),
        (Join-Path $LaragonRoot 'bin\postgresql\postgresql-18.4\bin'),
        (Join-Path $LaragonRoot 'bin\postgresql\postgresql-18\bin'),
        (Join-Path $LaragonRoot 'bin\postgresql\postgresql-16\bin'),
        'C:\Program Files\PostgreSQL\18\bin',
        'C:\Program Files\PostgreSQL\17\bin',
        'C:\Program Files\PostgreSQL\16\bin',
        'C:\Program Files\PostgreSQL\15\bin'
    )

    foreach ($bin in $candidates) {
        $psql = Join-Path $bin 'psql.exe'
        $pgCtl = Join-Path $bin 'pg_ctl.exe'
        $initdb = Join-Path $bin 'initdb.exe'
        if ((Test-Path $psql) -and (Test-Path $pgCtl)) {
            return [pscustomobject]@{
                BinDir   = $bin
                Psql     = $psql
                PgCtl    = $pgCtl
                Initdb   = if (Test-Path $initdb) { $initdb } else { $null }
                Source   = $bin
            }
        }
    }

    $pathPsql = Get-Command psql.exe -ErrorAction SilentlyContinue
    if ($pathPsql) {
        $bin = Split-Path $pathPsql.Source -Parent
        $pgCtl = Join-Path $bin 'pg_ctl.exe'
        if (Test-Path $pgCtl) {
            return [pscustomobject]@{
                BinDir   = $bin
                Psql     = $pathPsql.Source
                PgCtl    = $pgCtl
                Initdb   = Join-Path $bin 'initdb.exe'
                Source   = 'PATH'
            }
        }
    }

    return $null
}

function Get-LaragonPostgresqlDataDirs {
    param([string]$LaragonRoot = 'C:\laragon')

    @(
        (Join-Path $LaragonRoot 'data\postgresql'),
        (Join-Path $LaragonRoot 'data\postgresql-18'),
        (Join-Path $LaragonRoot 'data\postgresql-18.4'),
        (Join-Path $LaragonRoot 'data\postgresql-16'),
        (Join-Path $LaragonRoot 'bin\postgresql\postgresql\data')
    ) | Where-Object { Test-Path $_ }
}

function Test-PostgresqlConnection {
    param(
        [Parameter(Mandatory = $true)][string]$Psql,
        [string]$PgHost = '127.0.0.1',
        [int]$Port = 5432,
        [string]$User = 'postgres',
        [string]$Database = 'postgres',
        [string]$Password = ''
    )

    $prev = $env:PGPASSWORD
    try {
        if ($Password) { $env:PGPASSWORD = $Password } else { Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue }
        & $Psql -h $PgHost -p $Port -U $User -d $Database -t -A -c 'SELECT 1' 2>$null | Out-Null
        return ($LASTEXITCODE -eq 0)
    } finally {
        if ($null -ne $prev) { $env:PGPASSWORD = $prev } else { Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue }
    }
}

function Get-PostgresqlPortOwner {
    param([int]$Port = 5432)

    $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if (-not $conn) { return $null }
    $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
    return [pscustomobject]@{
        Port = $Port
        Pid  = $conn.OwningProcess
        Name = if ($proc) { $proc.ProcessName } else { 'unknown' }
    }
}

function Start-LaragonPostgresql {
    param(
        [Parameter(Mandatory = $true)]$Tools,
        [string]$LaragonRoot = 'C:\laragon',
        [switch]$ResetData
    )

    if (Test-PostgresqlConnection -Psql $Tools.Psql) {
        Write-Host '[OK] PostgreSQL zaten dinliyor (127.0.0.1:5432)' -ForegroundColor Green
        return $true
    }

    $owner = Get-PostgresqlPortOwner -Port 5432
    if ($owner -and $owner.Name -notmatch 'postgres') {
        Write-Host "UYARI: 5432 portu baska bir surec tarafindan kullaniliyor: PID $($owner.Pid) ($($owner.Name))" -ForegroundColor Yellow
    }

    $dataDirs = Get-LaragonPostgresqlDataDirs -LaragonRoot $LaragonRoot
    $dataDir = $dataDirs | Select-Object -First 1

    if ($ResetData -and $dataDir) {
        Write-Host "PostgreSQL data sifirlaniyor: $dataDir" -ForegroundColor Yellow
        Stop-Process -Name postgres -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        Remove-Item -Path $dataDir -Recurse -Force
        $dataDir = $null
    }

    if (-not $dataDir) {
        $dataDir = Join-Path $LaragonRoot 'data\postgresql'
        New-Item -ItemType Directory -Force -Path $dataDir | Out-Null
        if (-not $Tools.Initdb -or -not (Test-Path $Tools.Initdb)) {
            throw "initdb bulunamadi. Laragon Menu > PostgreSQL > Quick Add veya scripts\upgrade-laragon-runtime.ps1 calistirin."
        }
        Write-Host "PostgreSQL data ilk kurulum: $dataDir" -ForegroundColor Yellow
        & $Tools.Initdb -D $dataDir -U postgres -A trust -E UTF8
        if ($LASTEXITCODE -ne 0) { throw "initdb basarisiz (exit $LASTEXITCODE)" }
    }

    Write-Host "PostgreSQL baslatiliyor (pg_ctl)..." -ForegroundColor Yellow
    & $Tools.PgCtl -D $dataDir -l (Join-Path $dataDir 'server.log') start -w
    if ($LASTEXITCODE -ne 0) {
        $log = Join-Path $dataDir 'server.log'
        if (Test-Path $log) {
            Write-Host '--- server.log (son 20 satir) ---' -ForegroundColor DarkGray
            Get-Content $log -Tail 20 | ForEach-Object { Write-Host $_ -ForegroundColor DarkGray }
        }
        throw "pg_ctl start basarisiz (exit $LASTEXITCODE). Laragon Menu > PostgreSQL > Start deneyin veya -ResetPostgresData ile tekrar calistirin."
    }

    Start-Sleep -Seconds 2
    if (-not (Test-PostgresqlConnection -Psql $Tools.Psql)) {
        throw 'PostgreSQL baslatildi ama 127.0.0.1:5432 baglantisi yok.'
    }

    Write-Host '[OK] PostgreSQL calisiyor' -ForegroundColor Green
    return $true
}

function Ensure-PostgresqlSuperuser {
    param(
        [Parameter(Mandatory = $true)][string]$Psql,
        [string]$User = 'postgres',
        [string]$Password = ''
    )

    $prev = $env:PGPASSWORD
    try {
        if ($Password) { $env:PGPASSWORD = $Password } else { Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue }
        $exists = (& $Psql -h 127.0.0.1 -p 5432 -U $User -d postgres -t -A -c "SELECT 1 FROM pg_roles WHERE rolname='$User'" 2>$null).Trim()
        if ($exists -eq '1') { return }

        $createuser = Join-Path (Split-Path $Psql -Parent) 'createuser.exe'
        if (Test-Path $createuser) {
            & $createuser -h 127.0.0.1 -p 5432 --superuser $User 2>$null
        }
    } finally {
        if ($null -ne $prev) { $env:PGPASSWORD = $prev } else { Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue }
    }
}

function Ensure-TravelDatabase {
    param(
        [Parameter(Mandatory = $true)][string]$Psql,
        [string]$Database = 'travel',
        [string]$User = 'postgres',
        [string]$Password = ''
    )

    $prev = $env:PGPASSWORD
    try {
        if ($Password) { $env:PGPASSWORD = $Password } else { Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue }
        $dbExists = (& $Psql -h 127.0.0.1 -p 5432 -U $User -d postgres -t -A -c "SELECT 1 FROM pg_database WHERE datname='$Database'" 2>$null).Trim()
        if ($dbExists -ne '1') {
            Write-Host "Veritabani olusturuluyor: $Database" -ForegroundColor Yellow
            & $Psql -h 127.0.0.1 -p 5432 -U $User -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE $Database;"
            if ($LASTEXITCODE -ne 0) { throw "CREATE DATABASE $Database basarisiz" }
        }
        Write-Host "[OK] Veritabani: $Database" -ForegroundColor Green
    } finally {
        if ($null -ne $prev) { $env:PGPASSWORD = $prev } else { Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue }
    }
}

function Test-TravelSchemaReady {
    param(
        [Parameter(Mandatory = $true)][string]$Psql,
        [string]$Database = 'travel',
        [string]$User = 'postgres',
        [string]$Password = ''
    )

    $prev = $env:PGPASSWORD
    try {
        if ($Password) { $env:PGPASSWORD = $Password } else { Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue }
        $val = (& $Psql -h 127.0.0.1 -p 5432 -U $User -d $Database -t -A -c "SELECT to_regclass('public.organizations')::text" 2>$null).Trim()
        return ($val -and $val -ne '' -and $val -ne 'null')
    } finally {
        if ($null -ne $prev) { $env:PGPASSWORD = $prev } else { Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue }
    }
}

function Enable-LaragonPostgresqlAutoStart {
    param([string]$LaragonRoot = 'C:\laragon')

    $ini = Join-Path $LaragonRoot 'usr\laragon.ini'
    if (-not (Test-Path $ini)) {
        Write-Host "laragon.ini bulunamadi: $ini (Laragon Menu > Preferences > Start All automatically acin)" -ForegroundColor Yellow
        return
    }

    $raw = Get-Content $ini -Raw -Encoding UTF8
    $changed = $false
    if ($raw -notmatch '(?m)^AutoStart=') {
        $raw += "`r`nAutoStart=all`r`n"
        $changed = $true
    } elseif ($raw -match '(?m)^AutoStart=.*$' -and $raw -notmatch '(?m)^AutoStart=all') {
        $raw = $raw -replace '(?m)^AutoStart=.*$', 'AutoStart=all'
        $changed = $true
    }

    if ($changed) {
        Set-Content -Path $ini -Value $raw -Encoding UTF8
        Write-Host '[OK] Laragon AutoStart=all ayarlandi (Laragon yeniden baslatin)' -ForegroundColor Green
    } else {
        Write-Host '[OK] Laragon AutoStart zaten acik' -ForegroundColor Green
    }
}
