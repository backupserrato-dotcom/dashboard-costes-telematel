@echo off
title Dashboard Costes Medios Telematel
cd /d "%~dp0"
cls
echo ================================================================
echo   INICIANDO DASHBOARD COSTES MEDIOS TELEMATEL
echo ================================================================
echo.

:: Verificar si el servidor en puerto 3000 ya esta escuchando
netstat -ano | findstr ":3000" >nul 2>&1
if %errorlevel% neq 0 (
    echo [1/2] Arrancando Servidor Unificado Node.js (puerto 3000)...
    powershell -Command "Start-Process -WindowStyle Hidden node -ArgumentList 'server/dbConnectorServer.js' -WorkingDirectory '%~dp0'"
    timeout /t 2 /nobreak >nul
) else (
    echo [1/2] El servidor Node.js ya esta activo en el puerto 3000.
)

echo [2/2] Abriendo navegador web en http://localhost:3000...
start http://localhost:3000

echo.
echo ================================================================
echo   Dashboard iniciado con exito en http://localhost:3000
echo ================================================================
timeout /t 3 >nul
exit
