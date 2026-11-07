$ErrorActionPreference = 'Stop'
$project = $PSScriptRoot
$tools = Join-Path $project '.tools'
if (!$env:JAVA_HOME) { $env:JAVA_HOME = (Get-ChildItem -LiteralPath $tools -Directory -Filter 'jdk-*' -ErrorAction SilentlyContinue | Select-Object -First 1).FullName }
if (!$env:JAVA_HOME) { throw 'Cai JDK 17 va thiet lap JAVA_HOME, hoac mo android bang Android Studio.' }
if (!$env:ANDROID_HOME) { if (Test-Path -LiteralPath (Join-Path $tools 'android-sdk')) {$env:ANDROID_HOME=Join-Path $tools 'android-sdk'} }
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
Push-Location (Join-Path $project 'android')
try {
  & '.\gradlew.bat' --no-daemon assembleDebug
  if ($LASTEXITCODE -ne 0) { throw 'Build APK that bai' }
  Copy-Item -LiteralPath '.\app\build\outputs\apk\debug\app-debug.apk' -Destination (Join-Path $project 'MB-Notify.apk') -Force
} finally { Pop-Location }
