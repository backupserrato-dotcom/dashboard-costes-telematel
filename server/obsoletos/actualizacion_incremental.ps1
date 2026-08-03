# Incremental Update Engine for Telematel Dashboard
$connString = "DSN=tlmplus1V11;UID=userSQL;PWD=userSQL"
$outputFile = "y:\ANALYTICS\COSTES\datos_costes_actualizados.json"

$conn = New-Object System.Data.Odbc.OdbcConnection($connString)
try {
    $conn.Open()
    $cmd = $conn.CreateCommand()
    # Fetch recent updates / lines
    $cmd.CommandText = "SELECT TOP 500 l.cod_art, l.ref_art, l.nom_mar, l.cos_abl, l.cod_ent, l.cod_del FROM PUB.gvallin l WHERE l.cod_ent IN (3, 4, 5) AND l.cos_abl > 0"
    $reader = $cmd.ExecuteReader()

    $newItems = @()
    while ($reader.Read()) {
        $newItems += [PSCustomObject]@{
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

    # Merge incremental updates with existing dataset
    if (Test-Path $outputFile) {
        $existingJson = Get-Content $outputFile -Raw | ConvertFrom-Json
        $merged = @($newItems) + @($existingJson)
        $json = $merged | ConvertTo-Json -Compress
        [System.IO.File]::WriteAllText($outputFile, $json, [System.Text.Encoding]::UTF8)
        [PSCustomObject]@{ success = $true; incrementalCount = $newItems.Count; totalRecords = $merged.Count; mode = 'INCREMENTAL' } | ConvertTo-Json
    } else {
        $json = $newItems | ConvertTo-Json -Compress
        [System.IO.File]::WriteAllText($outputFile, $json, [System.Text.Encoding]::UTF8)
        [PSCustomObject]@{ success = $true; incrementalCount = $newItems.Count; totalRecords = $newItems.Count; mode = 'INITIAL' } | ConvertTo-Json
    }
} catch {
    [PSCustomObject]@{ success = $false; error = $_.Exception.Message } | ConvertTo-Json
}
