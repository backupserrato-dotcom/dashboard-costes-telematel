# Complete background downloader script for Telematel ERP
$connString = "DSN=tlmplus1V11;UID=userSQL;PWD=userSQL"
$outputFile = "y:\ANALYTICS\COSTES\datos_costes_actualizados.json"

Write-Host "Iniciando descarga masiva de dataset completo desde tlmplus1V11..."
$conn = New-Object System.Data.Odbc.OdbcConnection($connString)
try {
    $conn.Open()
    $cmd = $conn.CreateCommand()
    # Download top 25000 active cost records for complete coverage across all delegations
    $cmd.CommandText = "SELECT TOP 25000 l.cod_art, l.ref_art, l.nom_mar, l.cos_abl, l.cod_ent, l.cod_del FROM PUB.gvallin l WHERE l.cod_ent IN (3, 4, 5) AND l.cos_abl > 0"
    $reader = $cmd.ExecuteReader()

    $records = @()
    $counter = 0
    while ($reader.Read()) {
        $counter++
        $records += [PSCustomObject]@{
            cod_art = $reader['cod_art'].ToString().Trim()
            ref_art = $reader['ref_art'].ToString().Trim()
            nom_mar = $reader['nom_mar'].ToString().Trim()
            cos_med = [Math]::Round([double]$reader['cos_abl'], 4)
            cod_ent = [int]$reader['cod_ent']
            cod_del = [int]$reader['cod_del']
        }
    }
    $reader.Close()
    $conn.Close()

    $json = $records | ConvertTo-Json -Compress
    [System.IO.File]::WriteAllText($outputFile, $json, [System.Text.Encoding]::UTF8)

    Write-Host ("DESCARGA COMPLETADA. Registros guardados: " + $counter)
} catch {
    Write-Host ("Error descarga masiva: " + $_.Exception.Message)
}
