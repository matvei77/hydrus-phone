$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$logDir = Join-Path $root ".hydrus-pocket\logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir "gateway.log"

if ((Test-Path $log) -and (Get-Item $log).Length -gt 10MB) {
  for ($i = 4; $i -ge 1; $i--) {
    $source = "$log.$i"
    if (Test-Path $source) { Move-Item -Force -LiteralPath $source -Destination "$log.$($i + 1)" }
  }
  Move-Item -Force -LiteralPath $log -Destination "$log.1"
}

Set-Location $root
$runtimeDir = Join-Path $root ".hydrus-pocket"
$pidFile = Join-Path $runtimeDir "supervisor.pid"
[System.IO.File]::WriteAllText($pidFile, [string]$PID)
try {
  while ($true) {
    & (Get-Command node).Source "dist\server\index.js" *>> $log
    Add-Content -Path $log -Value "$(Get-Date -Format o) gateway exited; restarting in five seconds"
    Start-Sleep -Seconds 5
  }
} finally {
  Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
}
