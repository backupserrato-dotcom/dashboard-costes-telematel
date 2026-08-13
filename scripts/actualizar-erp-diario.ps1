param(
    [int]$Port = 3000,
    [string]$LogFile = 'C:\Costes\actualizacion-erp-diaria.log'
)

$ErrorActionPreference = 'Stop'
$baseUrl = "http://127.0.0.1:$Port"

function Write-UpdateLog([string]$Message) {
    $timestamp = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
    Add-Content -LiteralPath $LogFile -Value "[$timestamp] $Message" -Encoding UTF8
}

try {
    $online = $false
    1..12 | ForEach-Object {
        if (-not $online) {
            try {
                $health = Invoke-RestMethod -Uri "$baseUrl/api/health" -TimeoutSec 5
                $online = $health.status -eq 'ONLINE'
            } catch {
                Start-Sleep -Seconds 5
            }
        }
    }
    if (-not $online) { throw 'El servidor del dashboard no esta disponible.' }

    Write-UpdateLog 'Inicio de actualizacion automatica del ERP.'
    $result = Invoke-RestMethod -Method Post -Uri "$baseUrl/api/refresh-erp" -TimeoutSec 900
    if ($result.success -ne $true) { throw 'El extractor no confirmo la actualizacion.' }

    $health = Invoke-RestMethod -Uri "$baseUrl/api/health" -TimeoutSec 10
    Write-UpdateLog "Actualizacion completada. Costes=$($health.cachedRecords); pedidos=$($health.cachedPedidos); fecha=$($health.cacheDate)."
} catch {
    Write-UpdateLog "ERROR: $($_.Exception.Message)"
    exit 1
}
