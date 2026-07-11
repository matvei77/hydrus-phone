$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$port = 47810
$environmentFile = Join-Path $root ".env"
if (Test-Path $environmentFile) {
  $portLine = Get-Content $environmentFile | Where-Object { $_ -match '^PORT=' } | Select-Object -First 1
  if ($portLine) { $port = [int]($portLine -replace '^PORT=', '') }
}
$rollback = Join-Path $root ".hydrus-pocket\rollback\dist"
if (-not (Test-Path $rollback)) { throw "No previous production build is available to roll back." }

Get-CimInstance Win32_Process |
  Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine -like "*scripts\start-production.ps1*" } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
$listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if ($listener) { Stop-Process -Id $listener.OwningProcess -Force -ErrorAction SilentlyContinue }

$failed = Join-Path $root ".hydrus-pocket\failed-dist"
Remove-Item -LiteralPath $failed -Recurse -Force -ErrorAction SilentlyContinue
if (Test-Path (Join-Path $root "dist")) { Move-Item -LiteralPath (Join-Path $root "dist") -Destination $failed }
Copy-Item -LiteralPath $rollback -Destination (Join-Path $root "dist") -Recurse -Force

Start-Process powershell.exe -WindowStyle Hidden -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "`"$root\scripts\start-production.ps1`""
Write-Host "Hydrus Pocket rolled back to the previous production build. The replaced build is in .hydrus-pocket\failed-dist."
