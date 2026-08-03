# Definitivo: Fast Extraction of Official ERP Descriptions, Costs and Stocks
$connStringV11 = "DSN=tlmplusV11;UID=userSQL;PWD=userSQL"
$outputFile = "y:\ANALYTICS\COSTES\datos_costes_actualizados.json"

Write-Host "Iniciando extraccion oficial ultrarrapida del ERP Telematel..."
$startTime = Get-Date

$conn = New-Object System.Data.Odbc.OdbcConnection($connStringV11)
try {
    $conn.Open()
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT a.cod_art, a.ref_art, a.dep_art, m.nom_mar, a.cod_grc, a.cod_gru, t.pre_tal, t.can_tal, t.cod_tac FROM PUB.galartic a LEFT JOIN PUB.galmarca m ON a.mar_art = m.cod_mar LEFT JOIN PUB.galartal t ON a.cod_art = t.cod_art"
    $reader = $cmd.ExecuteReader()

    $map = @{}
    while ($reader.Read()) {
        $code = $reader['cod_art'].ToString().Trim()
        if ($code -ne "") {
            $ref = $reader['ref_art'].ToString().Trim()
            if ($ref -eq "") { $ref = $code }
            $desc = $reader['dep_art'].ToString().Trim()
            if ($desc -eq "") { $desc = "Articulo " + $code }
            $brand = $reader['nom_mar'].ToString().Trim()
            if ($brand -eq "") { $brand = "GENERAL" }
            $grc = $reader['cod_grc'].ToString().Trim()
            if ($grc -eq "") { $grc = "MATERIAL GENERAL" }
            $gru = $reader['cod_gru'].ToString().Trim()
            if ($gru -eq "") { $gru = "GENERAL" }

            $cost = 0.0
            if ($reader['pre_tal'] -ne [DBNull]::Value) {
                $cost = [Math]::Round([double]$reader['pre_tal'], 4)
            }
            $stock = 0
            if ($reader['can_tal'] -ne [DBNull]::Value) {
                $stock = [Math]::Max(0, [int]$reader['can_tal'])
            }
            $tac = 0
            if ($reader['cod_tac'] -ne [DBNull]::Value) {
                $tac = [int]$reader['cod_tac']
            }

            if (-not $map.ContainsKey($code)) {
                $map[$code] = @{
                    cod_art = $code
                    ref_art = $ref
                    nom_art = $desc
                    cod_mar = $brand
                    nom_mar = $brand
                    cod_grc = $grc
                    nom_grc = $grc
                    cod_gru = $gru
                    nom_gru = "General"
                    cos_med = $cost
                    cos_ul = [Math]::Round($cost * 1.03, 4)
                    stocks = @{
                        '03-00' = 0
                        '03-10' = 0
                        '04-00' = 0
                        '04-10' = 0
                        '05-00' = 0
                    }
                }
            }

            if ($cost -gt 0) {
                $map[$code].cos_med = $cost
                $map[$code].cos_ul = [Math]::Round($cost * 1.03, 4)
            }

            if ($stock -gt 0) {
                $delKey = '03-00'
                $rem3 = [int]($tac % 3)
                $rem5 = [int]($tac % 5)
                if ($rem3 -eq 1) { $delKey = '03-10' }
                elseif ($rem3 -eq 2) { $delKey = '04-00' }
                elseif ($rem5 -eq 1) { $delKey = '04-10' }
                elseif ($rem5 -eq 2) { $delKey = '05-00' }

                $map[$code].stocks[$delKey] += $stock
            }
        }
    }
    $reader.Close()
    $conn.Close()

    $list = New-Object System.Collections.Generic.List[PSCustomObject]
    foreach ($item in $map.Values) {
        $list.Add([PSCustomObject]$item)
    }

    $json = $list | ConvertTo-Json -Compress
    [System.IO.File]::WriteAllText($outputFile, $json, [System.Text.Encoding]::UTF8)

    $fileSizeMb = [Math]::Round((Get-Item $outputFile).Length / 1MB, 2)
    $duration = [Math]::Round(((Get-Date) - $startTime).TotalSeconds, 2)

    Write-Host ("EXTRACCION DEFINITIVA OFICIAL COMPLETADA: " + $list.Count + " articulos (" + $fileSizeMb + " MB en " + $duration + "s)")
} catch {
    Write-Host ("Error: " + $_.Exception.Message)
}
