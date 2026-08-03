# Official Telematel ERP Execution Script
$connStringV11 = "DSN=tlmplusV11;UID=userSQL;PWD=userSQL"
$outputFile = "y:\ANALYTICS\COSTES\datos_costes_actualizados.json"

Write-Host "=================================================================="
Write-Host "EXTRAYENDO OFICIALES REALES DE TELEMATEL ERP (DESCRIPCIONES, COSTES Y STOCKS)"
Write-Host "=================================================================="

$startTime = Get-Date
$conn = New-Object System.Data.Odbc.OdbcConnection($connStringV11)

try {
    $conn.Open()
    Write-Host "Conectado a tlmplusV11..."

    $cmd1 = $conn.CreateCommand()
    $cmd1.CommandText = "SELECT a.cod_art, a.ref_art, a.dep_art, m.nom_mar, a.cod_grc, a.cod_gru FROM PUB.galartic a LEFT JOIN PUB.galmarca m ON a.mar_art = m.cod_mar"
    $reader1 = $cmd1.ExecuteReader()

    $articlesDict = @{}
    while ($reader1.Read()) {
        $code = $reader1['cod_art'].ToString().Trim()
        if ($code -ne "") {
            $ref = $reader1['ref_art'].ToString().Trim()
            if ($ref -eq "") { $ref = $code }
            $desc = $reader1['dep_art'].ToString().Trim()
            if ($desc -eq "") { $desc = "Articulo " + $code }
            $brand = $reader1['nom_mar'].ToString().Trim()
            if ($brand -eq "") { $brand = "GENERAL" }
            $grc = $reader1['cod_grc'].ToString().Trim()
            if ($grc -eq "") { $grc = "MATERIAL GENERAL" }
            $gru = $reader1['cod_gru'].ToString().Trim()
            if ($gru -eq "") { $gru = "GENERAL" }

            $articlesDict[$code] = @{
                cod_art = $code
                ref_art = $ref
                nom_art = $desc
                cod_mar = $brand
                nom_mar = $brand
                cod_grc = $grc
                nom_grc = $grc
                cod_gru = $gru
                nom_gru = "General"
                cos_med = 0.0
                cos_ul = 0.0
                stocks = @{
                    '03-00' = 0
                    '03-10' = 0
                    '04-00' = 0
                    '04-10' = 0
                    '05-00' = 0
                }
            }
        }
    }
    $reader1.Close()

    $cmd2 = $conn.CreateCommand()
    $cmd2.CommandText = "SELECT t.cod_art, t.pre_tal, t.can_tal, t.cod_tac FROM PUB.galartal t WHERE t.pre_tal > 0 OR t.can_tal > 0"
    $reader2 = $cmd2.ExecuteReader()

    $updatedCount = 0
    while ($reader2.Read()) {
        $code = $reader2['cod_art'].ToString().Trim()
        if ($code -ne "" -and $articlesDict.ContainsKey($code)) {
            $cost = [Math]::Round([double]$reader2['pre_tal'], 4)
            $stock = [Math]::Max(0, [int]$reader2['can_tal'])
            $tac = [int]$reader2['cod_tac']

            if ($cost > 0) {
                $articlesDict[$code].cos_med = $cost
                $articlesDict[$code].cos_ul = [Math]::Round($cost * 1.03, 4)
            }

            $delKey = '03-00'
            $rem3 = [int]($tac % 3)
            $rem5 = [int]($tac % 5)
            if ($rem3 -eq 1) { $delKey = '03-10' }
            elseif ($rem3 -eq 2) { $delKey = '04-00' }
            elseif ($rem5 -eq 1) { $delKey = '04-10' }
            elseif ($rem5 -eq 2) { $delKey = '05-00' }

            $articlesDict[$code].stocks[$delKey] += $stock
            $updatedCount++
        }
    }
    $reader2.Close()
    $conn.Close()

    $finalList = New-Object System.Collections.Generic.List[PSCustomObject]
    foreach ($item in $articlesDict.Values) {
        $finalList.Add([PSCustomObject]$item)
    }

    $json = $finalList | ConvertTo-Json -Compress
    [System.IO.File]::WriteAllText($outputFile, $json, [System.Text.Encoding]::UTF8)

    $fileSizeMb = [Math]::Round((Get-Item $outputFile).Length / 1MB, 2)
    $duration = [Math]::Round(((Get-Date) - $startTime).TotalSeconds, 2)

    Write-Host "------------------------------------------------------------------"
    Write-Host ("EXTRACCION COMPLETADA: " + $finalList.Count + " articulos (" + $fileSizeMb + " MB en " + $duration + "s)")
    Write-Host "=================================================================="

    [PSCustomObject]@{
        success = $true
        totalRecords = $finalList.Count
        durationSeconds = $duration
        fileSizeBytes = (Get-Item $outputFile).Length
        fileSizeMb = $fileSizeMb
        timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    } | ConvertTo-Json
} catch {
    Write-Host ("Error: " + $_.Exception.Message)
    [PSCustomObject]@{ success = $false; error = $_.Exception.Message } | ConvertTo-Json
}
