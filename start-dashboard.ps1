# Launcher Script for Dashboard Costes Medios Telematel
# Inicia el servidor unificado (API + frontend estático) en el puerto 3000,
# abre el navegador y detiene el proceso al cerrar.

$Host.UI.RawUI.WindowTitle = "Dashboard Costes Medios Telematel"

Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "Iniciando Dashboard Costes Medios (servidor unificado)" -ForegroundColor Yellow
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""

$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectDir

Write-Host "[1/2] Iniciando servidor (API + frontend) en http://localhost:3000/ ..." -ForegroundColor Gray
$serverProcess = Start-Process -FilePath "node.exe" -ArgumentList "server/dbConnectorServer.js" -WorkingDirectory $projectDir -PassThru -WindowStyle Hidden

Start-Sleep -Seconds 2

Write-Host "[2/2] Abriendo navegador en http://localhost:3000/ ..." -ForegroundColor Green
Start-Process "http://localhost:3000/"

Write-Host ""
Write-Host "====================================================================" -ForegroundColor Green
Write-Host "Dashboard en ejecucion: http://localhost:3000/" -ForegroundColor Green
Write-Host "====================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Presione [ENTER] o cierre esta ventana para detener el servidor..." -ForegroundColor Yellow

$null = Read-Host

Write-Host ""
Write-Host "Deteniendo el servidor..." -ForegroundColor Red
try {
    if ($serverProcess -and -not $serverProcess.HasExited) {
        Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
    }
} catch {
    # Ignorar errores de limpieza
}
Write-Host "Servidor detenido." -ForegroundColor Green
Start-Sleep -Seconds 1
