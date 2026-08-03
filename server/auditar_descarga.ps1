$connStringV11 = "DSN=tlmplusV11;UID=userSQL;PWD=userSQL"
$outputFile = "y:\ANALYTICS\COSTES\datos_costes_actualizados.json"

$conn = New-Object System.Data.Odbc.OdbcConnection($connStringV11)
try {
    $conn.Open()
    $cmdCount = $conn.CreateCommand()
    $cmdCount.CommandText = "SELECT COUNT(*) FROM PUB.galartic"
    $totalMasterInDb = [int]$cmdCount.ExecuteScalar()
    $conn.Close()

    $currentDownloaded = 0
    if (Test-Path $outputFile) {
        $json = Get-Content $outputFile -Raw | ConvertFrom-Json
        $currentDownloaded = $json.Count
    }

    $percentage = 0
    if ($totalMasterInDb -gt 0) {
        $percentage = [Math]::Round(($currentDownloaded / $totalMasterInDb) * 100, 2)
        if ($percentage -gt 100) { $percentage = 100 }
    }

    $res = [PSCustomObject]@{
        totalInDb = $totalMasterInDb
        downloaded = $currentDownloaded
        percentage = $percentage
        timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    }
    $res | ConvertTo-Json
} catch {
    Write-Host ("Error auditoria: " + $_.Exception.Message)
}
