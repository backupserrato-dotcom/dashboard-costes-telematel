param([string]$BaseUrl = 'http://127.0.0.1:3000')

$ErrorActionPreference = 'Stop'
$base = $BaseUrl.TrimEnd('/')
$health = Invoke-RestMethod -Uri "$base/api/health" -TimeoutSec 10
if ($health.status -ne 'ONLINE') { throw "Estado inesperado de la API: $($health.status)" }

$webResponse = Invoke-WebRequest -Uri "$base/" -UseBasicParsing -TimeoutSec 10
if ($webResponse.StatusCode -ne 200 -or $webResponse.Content -notmatch '<div id="root">') {
    throw 'La interfaz web no devolvió la aplicación esperada.'
}

$orders = Invoke-RestMethod -Uri "$base/api/pedidos-pendientes" -TimeoutSec 30
if ($orders.success -ne $true -or $orders.totalLineas -lt 0) {
    throw 'El endpoint de pedidos no devolvió un resultado válido.'
}

$sync = Invoke-RestMethod -Uri "$base/api/incremental-sync?page=1&pageSize=1" -TimeoutSec 30
if ($sync.success -ne $true -or $sync.data.Count -gt 1) {
    throw 'El endpoint de costes no superó la prueba de paginación.'
}

[pscustomobject]@{
    Estado = $health.status
    RegistrosCostes = $health.cachedRecords
    LineasPedidos = $orders.totalLineas
    CacheObsoleta = $health.cacheStale
    SoloCache = $health.cacheOnly
    WebHttp = $webResponse.StatusCode
} | Format-List
