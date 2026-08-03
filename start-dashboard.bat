@echo off
title Dashboard Costes Medios Telematel
pushd "%~dp0"

echo ====================================================================
echo 🚀 INICIANDO DASHBOARD COSTES MEDIOS TELEMATEL (ODBC INCR.)
echo ====================================================================
echo.

echo [1/2] Iniciando Servidor Dashboard y Conector ODBC en Puerto 3000...
start "Servidor Dashboard Telematel" /min node server/dbConnectorServer.js

ping 127.0.0.1 -n 3 >nul

echo [2/2] Abriendo Navegador Web en http://localhost:3000/ ...
start http://localhost:3000/

echo.
echo ====================================================================
echo ✅ DASHBOARD EN EJECUCIÓN CORRECTAMENTE
echo  - Aplicación Web y Servidor ODBC: http://localhost:3000/
echo ====================================================================
echo.
echo 📌 PRESIONE CUALQUIER TECLA O CIERRE ESTA VENTANA PARA FINALIZAR TODOS LOS PROCESOS.
echo.
pause

echo.
echo ⏹ Finalizando procesos en segundo plano...
taskkill /F /FI "WINDOWTITLE eq Servidor Dashboard Telematel*" /T >nul 2>&1
taskkill /F /IM node.exe /T >nul 2>&1
echo ✅ Procesos finalizados con éxito.
