param([ValidateSet('start','stop')][string]$Mode='start')
$ErrorActionPreference='Stop'
$root=$PSScriptRoot
$logs=Join-Path $root 'logs'
New-Item -ItemType Directory -Path $logs -Force | Out-Null
function Write-LauncherLog([string]$EventName,[object]$Details){try{[ordered]@{at=[DateTime]::UtcNow.ToString('o');event=$EventName;helperPid=$PID;mode=$Mode;details=$Details}|ConvertTo-Json -Compress -Depth 5|Add-Content -LiteralPath (Join-Path $logs 'launcher-events.jsonl') -Encoding UTF8}catch{}}
Write-LauncherLog 'launcher_invoked' @{}
$port=3189
if($env:PORT){$port=[int]$env:PORT}
$sha=[Security.Cryptography.SHA256]::Create()
try{$key=([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($root.ToLowerInvariant())))).Replace('-','')}finally{$sha.Dispose()}
$mutex=New-Object Threading.Mutex($false,('Local\MBNotify-'+$key))
$locked=$false
try{
  try{$locked=$mutex.WaitOne(10000)}catch [Threading.AbandonedMutexException]{$locked=$true}
  if(!$locked){throw 'MB Notify dang khoi dong. Thu lai sau vai giay.'}
  $bundled=Join-Path $root 'runtime\node.exe'
  $node=if(Test-Path -LiteralPath $bundled){$bundled}else{(Get-Command node.exe -ErrorAction Stop).Source}
  $launch=Join-Path $root 'launch.js'
  $listeners=@(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique)
  $owned=@()
  foreach($serverPid in $listeners){
    $p=Get-CimInstance Win32_Process -Filter "ProcessId=$serverPid"
    if($p -and (($p.CommandLine -and $p.CommandLine.Contains($launch)) -or ($p.ExecutablePath -eq $bundled -and $p.CommandLine -match '(launch|server)\.js'))){$owned+=,$p}
  }
  if($Mode -eq 'stop'){
    Write-LauncherLog 'stop_requested' @{serverPids=@($owned | ForEach-Object {$_.ProcessId})}
    foreach($p in $owned){Stop-Process -Id $p.ProcessId -ErrorAction Stop}
    if($listeners.Count -gt 0 -and $owned.Count -eq 0){throw 'Cong dang duoc chuong trinh khac su dung; khong dung tien trinh khong thuoc project nay.'}
    'Stopped '+(Get-Date -Format o) | Set-Content -LiteralPath (Join-Path $logs 'launcher-status.txt') -Encoding UTF8
    return
  }
  if($owned.Count -gt 0){
    Write-LauncherLog 'already_running' @{serverPid=$owned[0].ProcessId}
    ('Running PID '+$owned[0].ProcessId+' '+(Get-Date -Format o)) | Set-Content -LiteralPath (Join-Path $logs 'launcher-status.txt') -Encoding UTF8
    if($env:MB_NOTIFY_NO_BROWSER -ne '1'){Start-Process -FilePath explorer.exe -ArgumentList "http://localhost:$port" -WindowStyle Hidden}
    return
  }
  if($listeners.Count -gt 0){throw "Cong $port dang duoc project/chuong trinh khac su dung. Hay dung ban cu truoc."}
  $child=Start-Process -FilePath $node -ArgumentList ('"'+$launch+'"') -WorkingDirectory $root -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logs 'server.log') -RedirectStandardError (Join-Path $logs 'server-error.log')
  $ready=$false
  for($i=0;$i -lt 30;$i++){
    Start-Sleep -Milliseconds 300
    $child.Refresh();if($child.HasExited){throw 'Server khong khoi dong duoc. Xem logs\server-error.log.'}
    $client=New-Object Net.Sockets.TcpClient
    try{$connect=$client.ConnectAsync('127.0.0.1',$port);if($connect.Wait(500) -and $client.Connected){$ready=$true;break}}catch{}finally{$client.Dispose()}
  }
  if(!$ready){throw 'Server chua phan hoi. Xem thu muc logs.'}
  Write-LauncherLog 'server_started' @{serverPid=$child.Id;port=$port}
  ('Running PID '+$child.Id+' '+(Get-Date -Format o)) | Set-Content -LiteralPath (Join-Path $logs 'launcher-status.txt') -Encoding UTF8
}catch{
  Write-LauncherLog 'launcher_error' @{message=$_.Exception.Message}
  $_.Exception.Message | Set-Content -LiteralPath (Join-Path $logs 'launcher-error.txt') -Encoding UTF8
  if($env:MB_NOTIFY_NO_BROWSER -ne '1'){
    $shell=New-Object -ComObject WScript.Shell
    [void]$shell.Popup($_.Exception.Message,0,'MB Notify',16)
  }
  exit 1
}finally{if($locked){$mutex.ReleaseMutex()};$mutex.Dispose()}
