param(
  [string]$OutputDirectory = (Join-Path $PSScriptRoot 'dist'),
  [string]$NodePath
)
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
if (!$NodePath) {
  $bundledNode = Join-Path $root 'runtime\node.exe'
  if (Test-Path -LiteralPath $bundledNode) { $NodePath = $bundledNode }
  else { $NodePath = (Get-Command node.exe -ErrorAction Stop).Source }
}
$destination = [System.IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Path $destination -Force | Out-Null
$version=(Get-Content -LiteralPath (Join-Path $root 'VERSION') -Raw).Trim()
if($version -notmatch '^\d+\.\d+\.\d+$'){throw 'Version khong hop le.'}
$packageName = 'MB-Notify-Portable-v' + $version + '-win-x64'
$stage = Join-Path ([System.IO.Path]::GetTempPath()) ($packageName+'-'+[guid]::NewGuid().ToString('N'))
if (Test-Path -LiteralPath $stage) { throw 'Thu muc dong goi da ton tai.' }
New-Item -ItemType Directory -Path $stage | Out-Null
foreach ($name in @('server.js','diagnostics.js','launch.js','excel.js','excel-bridge.ps1','fnet.js','FNetReader.exe','FNetReader.cs','build-fnet-reader.ps1','start.cmd','start.vbs','stop.cmd','stop.vbs','background.ps1','MB-Notify.apk','PORTABLE-README.txt','portable-firewall.ps1','dong-goi.bat','package-portable.ps1')) {
  Copy-Item -LiteralPath (Join-Path $root $name) -Destination $stage
}
foreach($name in @('VERSION','README.md','CHANGELOG.md','prepare-runtime.ps1')){Copy-Item -LiteralPath (Join-Path $root $name) -Destination $stage}
Copy-Item -LiteralPath (Join-Path $root 'public') -Destination $stage -Recurse
New-Item -ItemType Directory -Path (Join-Path $stage 'runtime') | Out-Null
Copy-Item -LiteralPath $NodePath -Destination (Join-Path $stage 'runtime/node.exe')
$nodeVersion = & $NodePath --version
if ($LASTEXITCODE -ne 0 -or $nodeVersion -notmatch '^v\d+\.\d+\.\d+$') { throw 'Khong doc duoc phien ban Node.js.' }
$existingLicense = Join-Path (Split-Path -Parent $NodePath) 'NODE-LICENSE.txt'
if (Test-Path -LiteralPath $existingLicense) {
  Copy-Item -LiteralPath $existingLicense -Destination (Join-Path $stage 'runtime/NODE-LICENSE.txt')
} else {
  Invoke-WebRequest -UseBasicParsing -Uri "https://raw.githubusercontent.com/nodejs/node/$nodeVersion/LICENSE" -OutFile (Join-Path $stage 'runtime/NODE-LICENSE.txt')
}
$archive = Join-Path $destination ($packageName + '.zip')
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $archive -CompressionLevel Optimal -Force
Get-Item -LiteralPath $archive | Select-Object FullName,Length
