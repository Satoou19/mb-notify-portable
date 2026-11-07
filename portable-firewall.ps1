# Run manually as Administrator on the destination computer.
$ErrorActionPreference = 'Stop'
$nodePath = Join-Path $PSScriptRoot 'runtime\node.exe'
if (!(Test-Path -LiteralPath $nodePath)) { throw 'Khong tim thay runtime\node.exe.' }
$ruleName = 'MBNotify-Portable-' + ([BitConverter]::ToString([Security.Cryptography.SHA256]::Create().ComputeHash([Text.Encoding]::UTF8.GetBytes($nodePath))).Replace('-','').Substring(0,12))
if (!(Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue)) {
  New-NetFirewallRule -Name $ruleName -DisplayName 'MB Notify Portable LAN 3189' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3189 -Profile Private -RemoteAddress LocalSubnet -Program $nodePath | Out-Null
}
Write-Host 'Da cho phep MB Notify tren mang Private/LAN, cong 3189.'
