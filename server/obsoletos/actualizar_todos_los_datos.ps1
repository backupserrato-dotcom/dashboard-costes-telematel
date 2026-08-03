# Script de actualización completa de todos los datos desde TELEMATEL / Progress OpenEdge ODBC
$connString = "DSN=tlmplus1V11;UID=userSQL;PWD=userSQL"
$outputFile = "y:\ANALYTICS\COSTES\datos_costes_actualizados.json"

Write-Host "=================================================================="
Write-Host "INICIANDO ACTUALIZACION COMPLETA DE TODOS LOS DATOS DESDE ODBC"
Write-Host "Servidor: dataserver (192.168.1.3) | DSN: tlmplus1V11 | UID: userSQL"
Write-Host "=================================================================="

$conn = New-Object System.Data.Odbc.OdbcConnection($connString)
try {
    $conn.Open()
    Write-Host "Conexion ODBC establecida con exito."
    
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT TOP 2000 l.cod_art, l.ref_art, l.nom_mar, l.cos_abl, l.cod_ent, l.cod_del FROM PUB.gvallin l WHERE l.cod_ent IN (3, 4, 5) AND l.cos_abl > 0"
    
    Write-Host "Ejecutando consulta SQL masiva a PUB.gvallin..."
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
    
    Write-Host "------------------------------------------------------------------"
    Write-Host "EXTRACCION FINALIZADA. TOTAL REGISTROS RECOPILADOS: $counter"
    Write-Host "Guardando archivo consolidado en: $outputFile"
    
    $json = $records | ConvertTo-Json -Compress
    [System.IO.File]::WriteAllText($outputFile, $json, [System.Text.Encoding]::UTF8)
    
    Write-Host "ARCHIVO GUARDADO Y ACTUALIZACION COMPLETADA CON EXITO."
    Write-Host "=================================================================="
} catch {
    Write-Host ("Error en actualizacion: " + $_.Exception.Message)
}
