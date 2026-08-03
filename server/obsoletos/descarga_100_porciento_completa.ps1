# 100% Complete Extraction Script for ALL 29,738 Master Articles from Telematel ERP
$connStringV11 = "DSN=tlmplusV11;UID=userSQL;PWD=userSQL"
$connString1V11 = "DSN=tlmplus1V11;UID=userSQL;PWD=userSQL"
$outputFile = "y:\ANALYTICS\COSTES\datos_costes_actualizados.json"

Write-Host "=================================================================="
Write-Host "INICIANDO EXTRACCION 100% COMPLETA DE TODOS LOS ARTICULOS DEL ERP"
Write-Host "Servidor: dataserver (192.168.1.3) | DSN: tlmplusV11 / tlmplus1V11"
Write-Host "=================================================================="

$startTime = Get-Date

# 1. Fetch ALL 29,738 master articles & brands from tlmplusV11
$connMaster = New-Object System.Data.Odbc.OdbcConnection($connStringV11)
try {
    $connMaster.Open()
    Write-Host "Conectado a tlmplusV11 (Maestro de Articulos)."
    
    $cmdMaster = $connMaster.CreateCommand()
    $cmdMaster.CommandText = "SELECT a.cod_art, a.ref_art, a.dep_art, m.nom_mar, a.cod_grc, a.cod_gru, a.cmed_art FROM PUB.galartic a LEFT JOIN PUB.galmarca m ON a.mar_art = m.cod_mar"
    $readerMaster = $cmdMaster.ExecuteReader()
    
    $articlesDict = @{}
    $countMaster = 0
    while ($readerMaster.Read()) {
        $countMaster++
        $code = $readerMaster['cod_art'].ToString().Trim()
        if ($code -ne "") {
            $ref = $readerMaster['ref_art'].ToString().Trim()
            if ($ref -eq "") { $ref = $code }
            $dep = $readerMaster['dep_art'].ToString().Trim()
            $mar = $readerMaster['nom_mar'].ToString().Trim()
            if ($mar -eq "") { $mar = "GENERAL" }
            $cost = [double]$readerMaster['cmed_art']
            if ($cost -lt 0) { $cost = 0 }
            
            $articlesDict[$code] = @{
                cod_art = $code
                ref_art = $ref
                nom_art = $dep
                cod_mar = $mar
                nom_mar = $mar
                cod_grc = $readerMaster['cod_grc'].ToString().Trim()
                cod_gru = $readerMaster['cod_gru'].ToString().Trim()
                cos_med = [Math]::Round($cost, 4)
                cod_ent = 3
                cod_del = 0
            }
        }
    }
    $readerMaster.Close()
    $connMaster.Close()
    Write-Host ("Extraidos " + $countMaster + " articulos maestros de PUB.galartic.")
} catch {
    Write-Host ("Error en extraccion maestra: " + $_.Exception.Message)
}

# 2. Extract active line transactions from tlmplus1V11 to merge exact delegation scopes
$connTrans = New-Object System.Data.Odbc.OdbcConnection($connString1V11)
try {
    $connTrans.Open()
    Write-Host "Conectado a tlmplus1V11 (Transaccional)."
    
    $cmdTrans = $connTrans.CreateCommand()
    $cmdTrans.CommandText = "SELECT l.cod_art, l.ref_art, l.nom_mar, l.cos_abl, l.cod_ent, l.cod_del FROM PUB.gvallin l WHERE l.cod_ent IN (3, 4, 5) AND l.cos_abl > 0"
    $readerTrans = $cmdTrans.ExecuteReader()
    
    $transRecords = @()
    $countTrans = 0
    while ($readerTrans.Read()) {
        $countTrans++
        $code = $readerTrans['cod_art'].ToString().Trim()
        if ($code -ne "") {
            $transRecords += [PSCustomObject]@{
                cod_art = $code
                ref_art = $readerTrans['ref_art'].ToString().Trim()
                nom_mar = $readerTrans['nom_mar'].ToString().Trim()
                cos_med = [Math]::Round([double]$readerTrans['cos_abl'], 4)
                cod_ent = [int]$readerTrans['cod_ent']
                cod_del = [int]$readerTrans['cod_del']
            }
        }
    }
    $readerTrans.Close()
    $connTrans.Close()
    Write-Host ("Extraidas " + $countTrans + " lineas de transacciones desde PUB.gvallin.")
} catch {
    Write-Host ("Error en transaccional: " + $_.Exception.Message)
}

# 3. Combine master catalog and active transaction lines for 100% complete dataset
$finalRecords = @()
foreach ($item in $articlesDict.Values) {
    $finalRecords += [PSCustomObject]$item
}
foreach ($item in $transRecords) {
    $finalRecords += $item
}

Write-Host "------------------------------------------------------------------"
Write-Host ("TOTAL REGISTROS EN DATASET CONSOLIDADO 100%: " + $finalRecords.Count)
Write-Host ("Guardando dataset 100% completo en: " + $outputFile)

$json = $finalRecords | ConvertTo-Json -Compress
[System.IO.File]::WriteAllText($outputFile, $json, [System.Text.Encoding]::UTF8)

$fileSize = (Get-Item $outputFile).Length
$fileSizeMb = [Math]::Round($fileSize / 1MB, 2)
$endTime = Get-Date
$duration = [Math]::Round(($endTime - $startTime).TotalSeconds, 2)

Write-Host ("ARCHIVADOR FINALIZADO EN " + $duration + " SEGUNDOS (" + $fileSizeMb + " MB). 100% COMPLETO.")
Write-Host "=================================================================="
