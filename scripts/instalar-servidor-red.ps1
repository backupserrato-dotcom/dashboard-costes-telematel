param(
    [int]$Port = 3000,
    [string]$TaskName = 'Dashboard Costes Telematel',
    [string]$DailyUpdateAt = '06:00'
)

$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]$identity
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Abra PowerShell como administrador y vuelva a ejecutar el instalador.'
}

$packageJson = Join-Path $root 'package.json'
$packageLock = Join-Path $root 'package-lock.json'
if (-not (Test-Path -LiteralPath $packageJson) -or -not (Test-Path -LiteralPath $packageLock)) {
    throw "La instalación está incompleta: faltan package.json o package-lock.json en $root."
}

$runtime = Join-Path $root 'runtime'
$runtimeNode = Join-Path $runtime 'node.exe'
$nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
$npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue

if ($nodeCommand -and $npmCommand) {
    Write-Host '[1/6] Instalando dependencias verificadas...'
    & $npmCommand.Source ci --prefix $root
    if ($LASTEXITCODE -ne 0) { throw 'No se pudieron instalar las dependencias.' }
    Write-Host '[2/6] Compilando el dashboard...'
    & $npmCommand.Source run build --prefix $root
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo compilar el dashboard.' }
    Write-Host '[3/6] Incluyendo runtime independiente...'
    New-Item -ItemType Directory -Force -Path $runtime | Out-Null
    if ([IO.Path]::GetFullPath($nodeCommand.Source) -ne [IO.Path]::GetFullPath($runtimeNode)) {
        Copy-Item -LiteralPath $nodeCommand.Source -Destination $runtimeNode -Force
    }
} else {
    Write-Host '[1/6] Usando el despliegue portátil existente...'
    $requiredPaths = @($runtimeNode, (Join-Path $root 'node_modules'), (Join-Path $root 'dist'))
    $missingPaths = @($requiredPaths | Where-Object { -not (Test-Path -LiteralPath $_) })
    if ($missingPaths.Count -gt 0) {
        throw "Faltan componentes del despliegue portátil: $($missingPaths -join ', ')"
    }
    Write-Host '[2/6] Dependencias y frontend ya preparados.'
    Write-Host '[3/6] Runtime independiente disponible.'
}

if (-not (Test-Path (Join-Path $root '.env'))) {
    Copy-Item -LiteralPath (Join-Path $root '.env.example') -Destination (Join-Path $root '.env')
    throw "Se ha creado $root\.env. Configure las credenciales y ejecute de nuevo el instalador."
}

Write-Host '[4/6] Registrando arranque automático...'
$server = Join-Path $root 'server\dbConnectorServer.js'
$action = New-ScheduledTaskAction -Execute $runtimeNode -Argument "`"$server`"" -WorkingDirectory $root
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit (New-TimeSpan -Days 3650) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -User 'SYSTEM' -RunLevel Highest -Force | Out-Null

$dailyTime = [TimeSpan]::Zero
if (-not [TimeSpan]::TryParse($DailyUpdateAt, [ref]$dailyTime)) {
    throw "Hora de actualizacion no valida: $DailyUpdateAt"
}
$dailyAt = [DateTime]::Today.Add($dailyTime)
$dailyScript = Join-Path $root 'scripts\actualizar-erp-diario.ps1'
$dailyAction = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$dailyScript`" -Port $Port" -WorkingDirectory $root
$dailyTrigger = New-ScheduledTaskTrigger -Daily -At $dailyAt
$dailySettings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 20) -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName "$TaskName Actualizacion Diaria" -Action $dailyAction -Trigger $dailyTrigger -Settings $dailySettings -User 'SYSTEM' -RunLevel Highest -Force | Out-Null

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
& (Join-Path $PSScriptRoot 'comprobar-despliegue.ps1') -BaseUrl "http://127.0.0.1:$Port"

Write-Host 'Instalación completada. Direcciones disponibles:'
$activeAdapters = Get-NetAdapter | Where-Object Status -eq 'Up' | Select-Object -ExpandProperty ifIndex
Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object {
        $_.InterfaceIndex -in $activeAdapters -and
        $_.AddressState -eq 'Preferred' -and
        -not $_.SkipAsSource -and
        $_.IPAddress -match '^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)'
    } |
    Sort-Object IPAddress -Unique |
    ForEach-Object { Write-Host "  http://$($_.IPAddress):$Port" }
