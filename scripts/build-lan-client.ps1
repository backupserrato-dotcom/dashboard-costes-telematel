param([string]$DashboardUrl = 'http://192.168.1.57:3000')

$ErrorActionPreference = 'Stop'
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$releaseRoot = Join-Path $projectRoot 'release'
$packageName = 'DashboardCostes-Cliente-LAN-win-x64'
$packageDir = Join-Path $releaseRoot $packageName
$zipPath = Join-Path $releaseRoot "$packageName.zip"

if (-not $packageDir.StartsWith($projectRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Ruta de salida no segura: $packageDir"
}

New-Item -ItemType Directory -Force -Path $releaseRoot | Out-Null
if (Test-Path -LiteralPath $packageDir) { Remove-Item -LiteralPath $packageDir -Recurse -Force }
if (Test-Path -LiteralPath $zipPath) { Remove-Item -LiteralPath $zipPath -Force }
New-Item -ItemType Directory -Path $packageDir | Out-Null

$source = Get-Content -Raw -LiteralPath (Join-Path $projectRoot 'packaging\windows\DashboardCostesLanClient.cs')
$executable = Join-Path $packageDir 'DashboardCostes-Cliente-LAN.exe'
Add-Type -TypeDefinition $source -Language CSharp -ReferencedAssemblies 'System.dll', 'System.Windows.Forms.dll' -OutputAssembly $executable -OutputType WindowsApplication

Set-Content -LiteralPath (Join-Path $packageDir 'dashboard-url.txt') -Value $DashboardUrl -Encoding ASCII
Copy-Item -LiteralPath (Join-Path $projectRoot 'packaging\windows\LEEME-CLIENTE-LAN.txt') -Destination $packageDir

& tar.exe -a -c -f $zipPath -C $releaseRoot $packageName
if ($LASTEXITCODE -ne 0) { throw 'No se pudo crear el ZIP del cliente LAN.' }

$hash = Get-FileHash -Algorithm SHA256 -LiteralPath $zipPath
Set-Content -LiteralPath "$zipPath.sha256" -Value "$($hash.Hash.ToLowerInvariant())  $([IO.Path]::GetFileName($zipPath))" -Encoding ASCII

Get-Item -LiteralPath $zipPath | Select-Object FullName, Length, LastWriteTime
$hash
