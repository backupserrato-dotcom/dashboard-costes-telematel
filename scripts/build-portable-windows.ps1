param(
    [string]$NodeExecutable = "C:\Program Files\nodejs\node.exe"
)

$ErrorActionPreference = 'Stop'
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$releaseRoot = Join-Path $projectRoot 'release'
$packageName = 'DashboardCostes-Portable-win-x64'
$packageDir = Join-Path $releaseRoot $packageName
$zipPath = Join-Path $releaseRoot "$packageName.zip"

if (-not $packageDir.StartsWith($projectRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Ruta de salida no segura: $packageDir"
}

if (-not (Test-Path -LiteralPath $NodeExecutable)) {
    throw "No se encontró Node.js en $NodeExecutable"
}

Write-Host '[1/6] Instalando dependencias reproducibles...'
& npm.cmd ci
if ($LASTEXITCODE -ne 0) { throw 'npm ci ha fallado.' }

Write-Host '[2/6] Compilando el frontend...'
& npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw 'La compilación ha fallado.' }

Write-Host '[3/6] Preparando la carpeta portátil...'
New-Item -ItemType Directory -Force -Path $releaseRoot | Out-Null
if (Test-Path -LiteralPath $packageDir) { Remove-Item -LiteralPath $packageDir -Recurse -Force }
if (Test-Path -LiteralPath $zipPath) { Remove-Item -LiteralPath $zipPath -Force }
New-Item -ItemType Directory -Force -Path $packageDir, (Join-Path $packageDir 'runtime') | Out-Null

Copy-Item -LiteralPath (Join-Path $projectRoot 'dist') -Destination $packageDir -Recurse
Copy-Item -LiteralPath (Join-Path $projectRoot 'server') -Destination $packageDir -Recurse
Copy-Item -LiteralPath (Join-Path $projectRoot 'package.json') -Destination $packageDir
Copy-Item -LiteralPath (Join-Path $projectRoot 'package-lock.json') -Destination $packageDir
Copy-Item -LiteralPath (Join-Path $projectRoot 'datos_costes_actualizados.json') -Destination $packageDir
Copy-Item -LiteralPath (Join-Path $projectRoot 'datos_pedidos_pendientes.json') -Destination $packageDir
Copy-Item -LiteralPath (Join-Path $projectRoot 'datos_costes_calidad.json') -Destination $packageDir
Copy-Item -LiteralPath (Join-Path $projectRoot 'packaging\windows\LEEME-PORTABLE.txt') -Destination $packageDir
Copy-Item -LiteralPath $NodeExecutable -Destination (Join-Path $packageDir 'runtime\node.exe')

Write-Host '[4/6] Instalando solo dependencias de producción...'
& npm.cmd ci --omit=dev --ignore-scripts --prefix $packageDir
if ($LASTEXITCODE -ne 0) { throw 'La instalación de producción ha fallado.' }

Write-Host '[5/6] Compilando DashboardCostes.exe...'
$launcherSource = Get-Content -Raw -LiteralPath (Join-Path $projectRoot 'packaging\windows\DashboardCostesLauncher.cs')
$launcherPath = Join-Path $packageDir 'DashboardCostes.exe'
Add-Type -TypeDefinition $launcherSource -Language CSharp -ReferencedAssemblies 'System.dll', 'System.Windows.Forms.dll' -OutputAssembly $launcherPath -OutputType WindowsApplication

Write-Host '[6/6] Creando ZIP distribuible...'
& tar.exe -a -c -f $zipPath -C $releaseRoot $packageName
if ($LASTEXITCODE -ne 0) { throw 'No se pudo crear el archivo ZIP.' }

$zip = Get-Item -LiteralPath $zipPath
Write-Host "Paquete creado: $($zip.FullName)"
Write-Host "Tamaño: $([Math]::Round($zip.Length / 1MB, 1)) MB"
