param([int]$Port = 3000, [string]$TaskName = 'Dashboard Costes Telematel')

$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if ($root -ne 'C:\Costes') { throw "Ejecute esta instalación desde C:\Costes (ruta actual: $root)." }

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]$identity
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Abra PowerShell como administrador y vuelva a ejecutar el instalador.'
}

$node = (Get-Command node.exe -ErrorAction Stop).Source
$npm = (Get-Command npm.cmd -ErrorAction Stop).Source

Write-Host '[1/6] Instalando dependencias verificadas...'
& $npm ci
if ($LASTEXITCODE -ne 0) { throw 'No se pudieron instalar las dependencias.' }
Write-Host '[2/6] Compilando el dashboard...'
& $npm run build
if ($LASTEXITCODE -ne 0) { throw 'No se pudo compilar el dashboard.' }

Write-Host '[3/6] Incluyendo runtime independiente...'
$runtime = Join-Path $root 'runtime'
New-Item -ItemType Directory -Force -Path $runtime | Out-Null
Copy-Item -LiteralPath $node -Destination (Join-Path $runtime 'node.exe') -Force

if (-not (Test-Path (Join-Path $root '.env'))) {
    Copy-Item -LiteralPath (Join-Path $root '.env.example') -Destination (Join-Path $root '.env')
    throw 'Se ha creado C:\Costes\.env. Configure las credenciales y ejecute de nuevo el instalador.'
}

Write-Host '[4/6] Registrando arranque automático...'
$runtimeNode = Join-Path $runtime 'node.exe'
$server = Join-Path $root 'server\dbConnectorServer.js'
$action = New-ScheduledTaskAction -Execute $runtimeNode -Argument "`"$server`"" -WorkingDirectory $root
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit (New-TimeSpan -Days 3650)
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -User 'SYSTEM' -RunLevel Highest -Force | Out-Null

Write-Host '[5/6] Abriendo el puerto solo a la subred privada...'
$ruleName = "Dashboard Costes TCP $Port"
Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue | Remove-NetFirewallRule
New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow -Profile Private -RemoteAddress LocalSubnet | Out-Null

Write-Host '[6/6] Iniciando y comprobando...'
Start-ScheduledTask -TaskName $TaskName
$ready = $false
1..30 | ForEach-Object {
    if (-not $ready) {
        try { $ready = (Invoke-RestMethod -Uri "http://127.0.0.1:$Port/api/health" -TimeoutSec 2).status -eq 'ONLINE' } catch { Start-Sleep -Milliseconds 500 }
    }
}
if (-not $ready) { throw 'El servicio no respondió. Revise el historial de la tarea programada.' }

Write-Host 'Instalación completada. Direcciones disponibles:'
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -match '^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)' } | ForEach-Object { Write-Host "  http://$($_.IPAddress):$Port" }
