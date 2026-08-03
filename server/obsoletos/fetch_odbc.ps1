$connString1 = "DSN=tlmplus1V11;UID=userSQL;PWD=userSQL"
Write-Host "Iniciando extracción y actualización completa de datos desde tlmplus1V11 (dataserver)..."

$conn1 = New-Object System.Data.Odbc.OdbcConnection($connString1)
try {
    $conn1.Open()
    $cmd1 = $conn1.CreateCommand()
    # Query ALL records for Companies 03 (San Pedro), 04 (Estepona), and 05 (Marbella)
    $cmd1.CommandText = "SELECT l.cod_art, l.ref_art, l.nom_mar, l.cos_abl, l.cod_ent, l.cod_del FROM PUB.gvallin l WHERE l.cod_ent IN (3, 4, 5) AND l.cos_abl > 0"
    $reader1 = $cmd1.ExecuteReader()

    $items = @()
    while ($reader1.Read()) {
        $items += [PSCustomObject]@{
            cod_art = $reader1['cod_art'].ToString().Trim()
            ref_art = $reader1['ref_art'].ToString().Trim()
            nom_mar = $reader1['nom_mar'].ToString().Trim()
            cos_med = [double]$reader1['cos_abl']
            cod_ent = [int]$reader1['cod_ent']
            cod_del = [int]$reader1['cod_del']
        }
    }
    $reader1.Close()
    $conn1.Close()

    Write-Host "Extracción completada. Total registros procesados: $($items.Count)"
    $items | ConvertTo-Json -Compress
} catch {
    [PSCustomObject]@{ error = $_.Exception.Message } | ConvertTo-Json
}
