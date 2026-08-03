# Fast 100% Master Article Loader using Generic List
$connStringV11 = "DSN=tlmplusV11;UID=userSQL;PWD=userSQL"
$outputFile = "y:\ANALYTICS\COSTES\datos_costes_actualizados.json"

Write-Host "Iniciando carga ultrarrápida del 100% del Maestro de Artículos (PUB.galartic)..."
$startTime = Get-Date

$conn = New-Object System.Data.Odbc.OdbcConnection($connStringV11)
try {
    $conn.Open()
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT a.cod_art, a.ref_art, a.dep_art, m.nom_mar, a.cod_grc, a.cod_gru, a.cmed_art FROM PUB.galartic a LEFT JOIN PUB.galmarca m ON a.mar_art = m.cod_mar"
    $reader = $cmd.ExecuteReader()

    $items = New-Object System.Collections.Generic.List[PSCustomObject]
    while ($reader.Read()) {
        $code = $reader['cod_art'].ToString().Trim()
        if ($code -ne "") {
            $ref = $reader['ref_art'].ToString().Trim()
            if ($ref -eq "") { $ref = $code }
            $dep = $reader['dep_art'].ToString().Trim()
            $mar = $reader['nom_mar'].ToString().Trim()
            if ($mar -eq "") { $mar = "GENERAL" }
            $cost = [double]$reader['cmed_art']
            if ($cost -lt 0) { $cost = 0 }

            $items.Add([PSCustomObject]@{
                cod_art = $code
                ref_art = $ref
                nom_art = $dep
                cod_mar = $mar
                nom_mar = $mar
                cod_grc = $reader['cod_grc'].ToString().Trim()
                cod_gru = $reader['cod_gru'].ToString().Trim()
                cos_med = [Math]::Round($cost, 4)
                cod_ent = 3
                cod_del = 0
            })
        }
    }
    $reader.Close()
    $conn.Close()

    Write-Host ("Extracción maestra terminada. Total artículos extraídos: " + $items.Count)

    $json = $items | ConvertTo-Json -Compress
    [System.IO.File]::WriteAllText($outputFile, $json, [System.Text.Encoding]::UTF8)

    $fileSize = (Get-Item $outputFile).Length
    $fileSizeMb = [Math]::Round($fileSize / 1MB, 2)
    $duration = [Math]::Round(((Get-Date) - $startTime).TotalSeconds, 2)

    Write-Host ("✅ DATASET MAESTRO 100% COMPLETO GUARDADO (" + $items.Count + " artículos | " + $fileSizeMb + " MB en " + $duration + "s)")
} catch {
    Write-Host ("Error en carga maestra: " + $_.Exception.Message)
}
