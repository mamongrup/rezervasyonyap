@echo off
setlocal EnableExtensions
title Travel - Laragon otomatik kurulum
echo.
echo === Travel Laragon tam kurulum (otomatik) ===
echo.

set "LARAGON=C:\laragon"
set "REPO=%LARAGON%\www\travel"
set "GIT=%LARAGON%\bin\git\bin\git.exe"
set "TEMP_PS=%TEMP%\clone-travel.ps1"

if not exist "%LARAGON%" (
  echo [HATA] Laragon bulunamadi: %LARAGON%
  pause
  exit /b 1
)

if not exist "%GIT%" (
  echo [HATA] Git bulunamadi: %GIT%
  pause
  exit /b 1
)

echo [1/4] GitHub main indiriliyor...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference='SilentlyContinue'; Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/mamongrup/rezervasyonyap/main/scripts/clone-travel-from-git.ps1' -OutFile '%TEMP_PS%' -UseBasicParsing"
if errorlevel 1 goto :fail

echo [2/4] Proje klonlaniyor (main)...
powershell -NoProfile -ExecutionPolicy Bypass -File "%TEMP_PS%" -Force
if errorlevel 1 goto :fail

echo [3/4] npm install...
set "PATH=%LARAGON%\bin\nodejs\node-v24;%LARAGON%\bin\nodejs\node-v22;%PATH%"
if exist "%REPO%\frontend\package.json" (
  pushd "%REPO%\frontend"
  call npm install
  if errorlevel 1 goto :fail
  popd
)

echo [4/4] Servisler baslatiliyor...
start "travel-api" cmd /k "cd /d %REPO% && powershell -ExecutionPolicy Bypass -File scripts\start-travel-api.ps1"
timeout /t 8 /nobreak >nul
start "travel-frontend" cmd /k "cd /d %REPO% && powershell -ExecutionPolicy Bypass -File scripts\start-frontend.ps1"
timeout /t 5 /nobreak >nul
start "" "http://localhost:3000"

echo.
echo === Tamam ===
echo API:      http://127.0.0.1:8080
echo Vitrin:   http://localhost:3000
echo.
exit /b 0

:fail
echo.
echo [HATA] Kurulum basarisiz.
pause
exit /b 1
