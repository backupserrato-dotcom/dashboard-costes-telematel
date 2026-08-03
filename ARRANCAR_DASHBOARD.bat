@echo off
setlocal
title Dashboard Costes Medios Telematel
cd /d "%~dp0"
cls

echo ================================================================
echo   INICIANDO DASHBOARD COSTES MEDIOS TELEMATEL
echo ================================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js no esta instalado o no esta disponible en PATH.
    echo Instale Node.js 22 o superior y vuelva a intentarlo.
    echo.
    pause
    exit /b 1
)

if not exist "dist\index.html" (
    echo [1/3] Compilando el dashboard por primera vez...
    call npm.cmd install
    if errorlevel 1 goto :build_error
    call npm.cmd run build
    if errorlevel 1 goto :build_error
) else (
    echo [1/3] Compilacion encontrada.
)

powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
if errorlevel 1 (
    echo [2/3] Arrancando servidor en el puerto 3000...
    if exist "dashboard-server.log" del /q "dashboard-server.log"
    if exist "dashboard-server-error.log" del /q "dashboard-server-error.log"
    powershell -NoProfile -Command "Start-Process -WindowStyle Hidden -FilePath 'node' -ArgumentList 'server/dbConnectorServer.js' -WorkingDirectory '%~dp0' -RedirectStandardOutput '%~dp0dashboard-server.log' -RedirectStandardError '%~dp0dashboard-server-error.log'"
) else (
    echo [2/3] El servidor ya esta activo en el puerto 3000.
)

echo [3/3] Esperando respuesta del servidor...
powershell -NoProfile -Command "$ok=$false; 1..20 | ForEach-Object { try { $r=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3000' -TimeoutSec 2; if ($r.StatusCode -eq 200) { $ok=$true; return } } catch {}; Start-Sleep -Milliseconds 500 }; if (-not $ok) { exit 1 }"
if errorlevel 1 goto :server_error

echo.
echo Dashboard iniciado correctamente en http://localhost:3000
start "" "http://localhost:3000"
powershell -NoProfile -Command "Start-Sleep -Seconds 3"
exit /b 0

:build_error
echo.
echo [ERROR] No se pudo instalar o compilar el dashboard.
echo Revise los mensajes mostrados arriba.
pause
exit /b 1

:server_error
echo.
echo [ERROR] El servidor no respondio en el puerto 3000.
if exist "dashboard-server-error.log" (
    echo.
    echo Detalle del error:
    type "dashboard-server-error.log"
)
echo.
echo Tambien puede revisar dashboard-server.log y dashboard-server-error.log
pause
exit /b 1
