# ===========================================================================
# Extractor unificado de Telematel ERP (Dashboard de Costes Medios y Compras)
# ===========================================================================

$envFile = Join-Path $PSScriptRoot "..\.env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$') {
            Set-Item -Path ("env:" + $matches[1]) -Value $matches[2]
        }
    }
}

$dsn        = $env:TLM_DSN
if (-not $dsn) { $dsn = 'tlmplusV11' }
$user       = if ($env:TLM_USER)       { $env:TLM_USER }       else { 'userSQL' }
$password   = if ($env:TLM_PASSWORD)   { $env:TLM_PASSWORD }   else { 'userSQL' }

$dsnInc     = if ($env:TLM_DSN_INCREMENTAL) { $env:TLM_DSN_INCREMENTAL } else { 'tlmplus1V11' }

$outputFile        = Join-Path $PSScriptRoot "..\datos_costes_actualizados.json"
$outputPedidosFile = Join-Path $PSScriptRoot "..\datos_pedidos_pendientes.json"
$auditFile         = Join-Path $PSScriptRoot "..\datos_costes_calidad.json"
$lecturaTs         = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")

$ubicaciones = @(
    @{ empresa_id = '03'; delegacion_id = '00'; empresa_nombre = '03 San Pedro'; delegacion_nombre = '00 Electricidad' },
    @{ empresa_id = '03'; delegacion_id = '10'; empresa_nombre = '03 San Pedro'; delegacion_nombre = '10 Fontanería' },
    @{ empresa_id = '04'; delegacion_id = '00'; empresa_nombre = '04 Estepona'; delegacion_nombre = '00 Electricidad' },
    @{ empresa_id = '04'; delegacion_id = '10'; empresa_nombre = '04 Estepona'; delegacion_nombre = '10 Fontanería' },
    @{ empresa_id = '05'; delegacion_id = '00'; empresa_nombre = '05 Marbella'; delegacion_nombre = '00 Marbella' }
)
$ubicacionKeys = @()
$ubicNombres = @{}
foreach ($u in $ubicaciones) {
    $k = $u.empresa_id + '-' + $u.delegacion_id
    $ubicacionKeys += $k
    $ubicNombres[$k] = $u
}

$connString = "DSN=$dsn;UID=$user;PWD=$password"
$conn = New-Object System.Data.Odbc.OdbcConnection($connString)

try {
    $startTime = Get-Date
    $conn.Open()

    # 1) Maestro de artículos desde galartic
    $cmd1 = $conn.CreateCommand()
    $cmd1.CommandText = @"
        SELECT a.cod_art, a.ref_art, a.dep_art, a.mar_art,
               m.nom_mar,
               a.cod_grc, a.cod_gru
        FROM PUB.galartic a
        LEFT JOIN PUB.galmarca m ON a.mar_art = m.cod_mar
"@
    $reader1 = $cmd1.ExecuteReader()

    $articulos = @{}
    while ($reader1.Read()) {
        $code = $reader1['cod_art'].ToString().Trim()
        if ($code -eq '') { continue }

        $articulos[$code] = [ordered]@{
            cod_art            = $code
            ref_art            = $reader1['ref_art'].ToString().Trim()
            nom_art            = $reader1['dep_art'].ToString().Trim()
            cod_mar            = $reader1['mar_art'].ToString().Trim()
            nom_mar            = $reader1['nom_mar'].ToString().Trim()
            cod_grc            = $reader1['cod_grc'].ToString().Trim()
            nom_grc            = $reader1['cod_grc'].ToString().Trim()
            cod_gru            = $reader1['cod_gru'].ToString().Trim()
            nom_gru            = $reader1['cod_gru'].ToString().Trim()
            moneda             = 'EUR'
            fecha_actualizacion = $lecturaTs
        }
    }
    $reader1.Close()
    Write-Host ("Maestro de articulos leido: " + $articulos.Count)

    # 2) Costes y Stocks por ubicacion desde galardel
    $datosPorUbic = @{}
    $conCosteCombinaciones = 0
    $conStockCombinaciones = 0
    $articulosConCoste = @{}
    $articulosConStock = @{}

    $cmd2 = $conn.CreateCommand()
    $cmd2.CommandText = "SELECT cod_art, cos_art, sre_art, cod_Ent, cod_del FROM PUB.galardel"
    $reader2 = $cmd2.ExecuteReader()
    while ($reader2.Read()) {
        $code = $reader2['cod_art'].ToString().Trim()
        if (-not $articulos.ContainsKey($code)) { continue }

        $cos = 0.0
        if ($reader2['cos_art'] -ne $DBNull.Value) {
            $cos = [Math]::Round([double]$reader2['cos_art'], 4)
        }

        $stk = 0
        if ($reader2['sre_art'] -ne $DBNull.Value) {
            $stk = [Math]::Max(0, [int][double]$reader2['sre_art'])
        }

        if ($cos -le 0 -and $stk -le 0) { continue }

        $ent = [int]$reader2['cod_Ent']
        $del = [int]$reader2['cod_del']
        $key = ('{0:00}-{1:00}' -f $ent, $del)
        if (-not $ubicacionKeys -contains $key) { continue }

        $ak = "$code|$key"
        $datosPorUbic[$ak] = @{ cos = $cos; stk = $stk }
        if ($cos -gt 0) { $conCosteCombinaciones++; $articulosConCoste[$code] = $true }
        if ($stk -gt 0) { $conStockCombinaciones++; $articulosConStock[$code] = $true }
    }
    $reader2.Close()
    $conn.Close()

    # 3) Construir filas de detalle
    $finalList = New-Object System.Collections.Generic.List[object]

    foreach ($code in $articulos.Keys) {
        $art = $articulos[$code]
        $tuvoFilas = $false

        foreach ($u in $ubicaciones) {
            $k = $u.empresa_id + '-' + $u.delegacion_id
            $ak = "$code|$k"
            $tieneDatos = $datosPorUbic.ContainsKey($ak)
            if (-not $tieneDatos) { continue }

            $cos = $datosPorUbic[$ak]['cos']
            $stk = $datosPorUbic[$ak]['stk']
            $sinCoste = ($cos -le 0)
            $val = [Math]::Round($cos * $stk, 2)

            $finalList.Add([PSCustomObject][ordered]@{
                cod_art            = $art.cod_art
                ref_art            = $art.ref_art
                nom_art            = $art.nom_art
                cod_mar            = $art.cod_mar
                nom_mar            = $art.nom_mar
                cod_grc            = $art.cod_grc
                nom_grc            = $art.nom_grc
                cod_gru            = $art.cod_gru
                nom_gru            = $art.nom_gru
                empresa_id         = $u.empresa_id
                empresa_nombre     = $u.empresa_nombre
                delegacion_id      = $u.delegacion_id
                delegacion_nombre  = $u.delegacion_nombre
                cos_art            = $cos
                stock_disp         = $stk
                valoracion         = $val
                moneda             = $art.moneda
                sin_coste          = $sinCoste
                fecha_actualizacion = $art.fecha_actualizacion
            }) | Out-Null
            $tuvoFilas = $true
        }

        if (-not $tuvoFilas) {
            $finalList.Add([PSCustomObject][ordered]@{
                cod_art            = $art.cod_art
                ref_art            = $art.ref_art
                nom_art            = $art.nom_art
                cod_mar            = $art.cod_mar
                nom_mar            = $art.nom_mar
                cod_grc            = $art.cod_grc
                nom_grc            = $art.nom_grc
                cod_gru            = $art.cod_gru
                nom_gru            = $art.nom_gru
                empresa_id         = ''
                empresa_nombre     = ''
                delegacion_id      = ''
                delegacion_nombre  = ''
                cos_art            = 0.0
                stock_disp         = 0
                valoracion         = 0
                moneda             = $art.moneda
                sin_coste          = $true
                fecha_actualizacion = $art.fecha_actualizacion
            }) | Out-Null
        }
    }

    # Guardar datos_costes_actualizados.json
    $json = $finalList | ConvertTo-Json -Compress -Depth 6
    [System.IO.File]::WriteAllText($outputFile, $json, [System.Text.Encoding]::UTF8)

    # 4) Extracción de Pedidos de Compras a Proveedores Pendientes desde tlmplus1V11 (PUB.gcpplin + PUB.gcppcab)
    Write-Host "Extrayendo pedidos reales de compras a proveedores desde PUB.gcpplin y PUB.gcppcab..."
    $connIncString = "DSN=$dsnInc;UID=$user;PWD=$password"
    $connInc = New-Object System.Data.Odbc.OdbcConnection($connIncString)
    $connInc.Open()

    $cmdPed = $connInc.CreateCommand()
    $cmdPed.CommandText = "
        SELECT 
            l.num_cpp, l.lin_lpp, l.cod_art, l.ref_lpp, l.dep_lpp, 
            l.cpe_lpp, l.cse_lpp, l.pre_lpp, l.dt1_lpp, l.dt2_lpp, l.dt3_lpp, 
            l.cod_uea, l.cuea_lpp, l.cod_ent, l.cod_del, l.cod_mar, l.cer_lpp,
            c.cod_pro, c.fec_cpp, c.imp_cpp, c.raz_mer, c.nom_mer
        FROM PUB.gcpplin l
        LEFT JOIN PUB.gcppcab c ON l.num_cpp = c.num_cpp AND l.cod_ent = c.cod_ent AND l.cod_del = c.cod_del
        WHERE l.cer_lpp = 0 AND (l.cpe_lpp - l.cse_lpp) > 0 AND l.cod_ent IN (3, 4, 5)
    "
    $readerPed = $cmdPed.ExecuteReader()
    $pedidosList = New-Object System.Collections.Generic.List[object]

    while ($readerPed.Read()) {
        $cpp = $readerPed["num_cpp"].ToString().Trim()
        $lin = [int]$readerPed["lin_lpp"]
        $code = $readerPed["cod_art"].ToString().Trim()
        $ref = $readerPed["ref_lpp"].ToString().Trim()
        if ($ref -eq "") { $ref = $code }
        $desc = $readerPed["dep_lpp"].ToString().Trim()
        if ($desc -eq "") { $desc = "Artículo " + $code }
        
        $brandCode = $readerPed["cod_mar"].ToString().Trim()
        $brandName = if ($articulos.ContainsKey($code) -and $articulos[$code].nom_mar -ne "") { $articulos[$code].nom_mar } else { $brandCode }
        if ($brandName -eq "") { $brandName = "GENERAL" }

        $codGrc = if ($articulos.ContainsKey($code)) { $articulos[$code].cod_grc } else { "MATERIAL GENERAL" }
        $codGru = if ($articulos.ContainsKey($code)) { $articulos[$code].cod_gru } else { "GENERAL" }

        $proId = $readerPed["cod_pro"].ToString().Trim()
        $proName = $readerPed["nom_mer"].ToString().Trim()
        if ($proName -eq "") { $proName = $readerPed["raz_mer"].ToString().Trim() }
        if ($proName -eq "") { $proName = "Proveedor " + $proId }

        $ordered = [double]$readerPed["cpe_lpp"]
        $served = [double]$readerPed["cse_lpp"]
        $pendingQty = $ordered - $served
        if ($pendingQty -le 0) { continue }

        $price = [Math]::Round([double]$readerPed["pre_lpp"], 4)
        $dt1 = [double]$readerPed["dt1_lpp"]
        $dt2 = [double]$readerPed["dt2_lpp"]
        $dt3 = [double]$readerPed["dt3_lpp"]
        $cuea = [double]$readerPed["cuea_lpp"]
        if ($cuea -le 0) { $cuea = 1.0 }

        # Cálculo neto exacto contemplando el divisor cuea_lpp (por 1000m o 100u) y los descuentos
        $netDiscount = (1 - ($dt1 / 100)) * (1 - ($dt2 / 100)) * (1 - ($dt3 / 100))
        $unitNetPrice = ($price / $cuea) * $netDiscount
        $impLineTotal = [Math]::Round($ordered * $unitNetPrice, 2)
        $impPendiente = [Math]::Round($pendingQty * $unitNetPrice, 2)

        $ent = [int]$readerPed["cod_ent"]
        $del = [int]$readerPed["cod_del"]
        $empStr = if ($ent -lt 10) { "0$ent" } else { "$ent" }
        $delStr = if ($del -lt 10) { "0$del" } else { "$del" }
        
        $uObj = $ubicNombres["$empStr-$delStr"]
        $empNombre = if ($uObj) { $uObj.empresa_nombre } else { $empStr }
        $delNombre = if ($uObj) { $uObj.delegacion_nombre } else { $delStr }

        $fecStr = if ($readerPed["fec_cpp"] -ne [DBNull]::Value) { ([DateTime]$readerPed["fec_cpp"]).ToString("yyyy-MM-dd") } else { "" }

        $pedidosList.Add([PSCustomObject][ordered]@{
            pedido_id          = $cpp
            linea_num          = $lin
            cod_art            = $code
            ref_art            = $ref
            nom_art            = $desc
            cod_mar            = $brandCode
            nom_mar            = $brandName
            cod_grc            = $codGrc
            cod_gru            = $codGru
            proveedor_id       = $proId
            razon_social       = $proName
            empresa_id         = $empStr
            empresa_nombre     = $empNombre
            delegacion_id      = $delStr
            delegacion_nombre  = $delNombre
            unidades_pedidas   = $ordered
            unidades_servidas  = $served
            unidades_pendientes= $pendingQty
            unidad_medida      = $readerPed["cod_uea"].ToString().Trim()
            precio_unitario    = $price
            descuento_pct      = [Math]::Round($dt1, 2)
            importe_linea_total= $impLineTotal
            importe_pendiente  = $impPendiente
            fecha_pedido       = $fecStr
            fecha_actualizacion= $lecturaTs
        }) | Out-Null
    }
    $readerPed.Close()
    $connInc.Close()

    # Guardar datos_pedidos_pendientes.json
    $jsonPed = $pedidosList | ConvertTo-Json -Compress -Depth 6
    [System.IO.File]::WriteAllText($outputPedidosFile, $jsonPed, [System.Text.Encoding]::UTF8)

    # 5) Escribir indicadores de calidad
    $totalFilas = $finalList.Count
    $totalArticulos = $articulos.Count
    $conCoste = $articulosConCoste.Count
    $conStock = $articulosConStock.Count
    $hostName = if ($env:TLM_HOST_NAME) { $env:TLM_HOST_NAME } else { 'dataserver' }
    $calidad = [ordered]@{
        fecha                  = $lecturaTs
        fuente                 = ("ODBC " + $dsn + " @ " + $hostName)
        total_filas            = $totalFilas
        total_articulos        = $totalArticulos
        total_pedidos_lineas   = $pedidosList.Count
        porcentaje_con_coste   = [Math]::Round(($conCoste / [Math]::Max(1,$totalArticulos)) * 100, 2)
        porcentaje_sin_coste   = [Math]::Round((($totalArticulos - $conCoste) / [Math]::Max(1,$totalArticulos)) * 100, 2)
        porcentaje_con_stock   = [Math]::Round(($conStock / [Math]::Max(1,$totalArticulos)) * 100, 2)
        porcentaje_sin_stock   = [Math]::Round((($totalArticulos - $conStock) / [Math]::Max(1,$totalArticulos)) * 100, 2)
    }
    [System.IO.File]::WriteAllText($auditFile, ($calidad | ConvertTo-Json -Compress), [System.Text.Encoding]::UTF8)

    $duration = [Math]::Round(((Get-Date) - $startTime).TotalSeconds, 2)
    $fileSizeMb = [Math]::Round((Get-Item $outputFile).Length / 1MB, 2)

    Write-Host ("------------------------------------------------------------------")
    Write-Host ("EXTRACCION COMPLETADA: " + $totalFilas + " filas de detalle, " + $pedidosList.Count + " lineas de pedidos de compras a proveedores (" + $duration + "s)")
    Write-Host ("==================================================================")

    [PSCustomObject]@{
        success         = $true
        mode            = 'ERP_LIVE'
        source          = $calidad.fuente
        totalFilas      = $totalFilas
        totalArticulos  = $totalArticulos
        totalPedidos    = $pedidosList.Count
        conCoste        = $conCoste
        conStock        = $conStock
        fecha           = $lecturaTs
        durationSeconds = $duration
        fileSizeMb      = $fileSizeMb
    } | ConvertTo-Json
} catch {
    Write-Host ("Error: " + $_.Exception.Message)
    [PSCustomObject]@{ success = $false; error = $_.Exception.Message; mode = 'ERROR' } | ConvertTo-Json
} finally {
    if ($conn.State -ne 'Closed') { $conn.Close() }
}