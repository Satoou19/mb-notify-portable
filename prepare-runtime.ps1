param([string]$Version='26.13.0')
$ErrorActionPreference='Stop'
if($Version -notmatch '^\d+\.\d+\.\d+$'){throw 'Invalid Node version.'}
$runtime=Join-Path $PSScriptRoot 'runtime'
New-Item -ItemType Directory -Path $runtime -Force | Out-Null
$binary="node-v$Version-win-x64.zip"
$base="https://nodejs.org/dist/v$Version"
$work=Join-Path ([IO.Path]::GetTempPath()) ('mbnotify-node-'+[guid]::NewGuid())
New-Item -ItemType Directory -Path $work | Out-Null
$zip=Join-Path $work $binary
Invoke-WebRequest -UseBasicParsing -Uri "$base/$binary" -OutFile $zip
$checks=(Invoke-WebRequest -UseBasicParsing -Uri "$base/SHASUMS256.txt").Content
$line=($checks -split "`n" | Where-Object {$_ -match ('\s'+[regex]::Escape($binary)+'\s*$')} | Select-Object -First 1)
if(!$line){throw 'Node checksum not found.'}
$expected=($line.Trim() -split '\s+')[0]
if((Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash -ne $expected){throw 'Node checksum mismatch.'}
Expand-Archive -LiteralPath $zip -DestinationPath $work
$folder=Join-Path $work "node-v$Version-win-x64"
Copy-Item -LiteralPath (Join-Path $folder 'node.exe') -Destination (Join-Path $runtime 'node.exe') -Force
Copy-Item -LiteralPath (Join-Path $folder 'LICENSE') -Destination (Join-Path $runtime 'NODE-LICENSE.txt') -Force
Write-Output "Prepared Node.js $Version in runtime; verified SHA-256."
