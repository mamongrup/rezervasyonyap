@echo off
setlocal EnableExtensions
title Travel - Laragon kurulum
echo.
echo === Travel Laragon tam kurulum ===
echo.

set "LARAGON=C:\laragon"
set "REPO=%LARAGON%\www\travel"
set "GIT=%LARAGON%\bin\git\bin\git.exe"
set "TEMP_PS=%TEMP%\clone-travel.ps1"
set "TEMP_FINISH=%TEMP%\finish-laragon-setup.ps1"
set "TEMP_LIB=%TEMP%\Resolve-LaragonPostgresql.ps1"

if not exist "%LARAGON%" (
  echo [HATA] Laragon bulunamadi: %LARAGON%
  pause
  exit /b 1
)

if not exist "%GIT%" (
  echo [HATA] Git bulunamadi: %GIT%
  echo Laragon Menu ^> Tools ^> Git kurun.
  pause
  exit /b 1
)

echo [1/5] GitHub main indiriliyor...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ProgressPreference='SilentlyContinue';" ^
  "Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/mamongrup/rezervasyonyap/main/scripts/clone-travel-from-git.ps1' -OutFile '%TEMP_PS%' -UseBasicParsing"
if errorlevel 1 goto :fail

echo [2/5] Repo klonlaniyor / guncelleniyor...
powershell -NoProfile -ExecutionPolicy Bypass -File "%TEMP_PS%" -Force
if errorlevel 1 goto :fail

echo [3/5] Kurulum scriptleri guncelleniyor...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ProgressPreference='SilentlyContinue';" ^
  "Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/mamongrup/rezervasyonyap/main/scripts/finish-laragon-setup.ps1' -OutFile '%TEMP_FINISH%' -UseBasicParsing;" ^
  "New-Item -ItemType Directory -Force -Path '%REPO%\scripts\lib' | Out-Null;" ^
  "Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/mamongrup/rezervasyonyap/main/scripts/lib/Resolve-LaragonPostgresql.ps1' -OutFile '%REPO%\scripts\lib\Resolve-LaragonPostgresql.ps1' -UseBasicParsing"
if errorlevel 1 goto :fail

echo [4/5] PostgreSQL + migration + npm + gleam...
powershell -NoProfile -ExecutionPolicy Bypass -File "%REPO%\scripts\finish-laragon-setup.ps1" -LaragonRoot "%LARAGON%" -RepoRoot "%REPO%"
if errorlevel 1 (
  echo [UYARI] finish-laragon-setup uyarili bitti - npm kontrol ediliyor...
)

if exist "%REPO%\frontend\package.json" (
  echo [5/5] npm install (frontend)...
  set "NODE_DIR="
  if exist "%LARAGON%\bin\nodejs\node-v24\node.exe" set "PATH=%LARAGON%\bin\nodejs\node-v24;%PATH%"
  if exist "%LARAGON%\bin\nodejs\node-v22\node.exe" set "PATH=%LARAGON%\bin\nodejs\node-v22;%PATH%"
  pushd "%REPO%\frontend"
  call npm install
  popd
)

echo.
echo === Kurulum tamam ===
echo.
echo Terminal 1: cd %REPO% ^&^& scripts\start-travel-api.ps1
echo Terminal 2: cd %REPO% ^&^& scripts\start-frontend.ps1
echo Tarayici:   http://localhost:3000
echo.
pause
exit /b 0

:fail
echo.
echo [HATA] Kurulum basarisiz. Ekran goruntusunu paylasin.
pause
exit /b 1
