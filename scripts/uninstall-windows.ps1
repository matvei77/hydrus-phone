$ErrorActionPreference = "SilentlyContinue"
Stop-ScheduledTask -TaskName "Hydrus Pocket Gateway"
Unregister-ScheduledTask -TaskName "Hydrus Pocket Gateway" -Confirm:$false
Remove-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "HydrusPocket"
$root = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $root ".hydrus-pocket\supervisor.pid"
if (Test-Path $pidFile) { Stop-Process -Id ([int](Get-Content $pidFile)) -Force }
Get-CimInstance Win32_Process |
  Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine -like "*scripts\start-production.ps1*" } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
$listener = Get-NetTCPConnection -LocalPort 47810 -State Listen
if ($listener) { Stop-Process -Id $listener.OwningProcess -Force }
& tailscale serve reset
Write-Host "Hydrus Pocket service and Tailscale mapping removed. Source files and Hydrus data were not changed."
