$ErrorActionPreference = 'Stop'
$compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\csc.exe'
& $compiler /nologo /target:exe /platform:x86 /reference:System.Web.Extensions.dll "/out:$PSScriptRoot\FNetReader.exe" "$PSScriptRoot\FNetReader.cs"
if ($LASTEXITCODE -ne 0) { throw 'Build FNet reader failed.' }
