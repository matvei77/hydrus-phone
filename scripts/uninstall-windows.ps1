$ErrorActionPreference = "SilentlyContinue"
Stop-ScheduledTask -TaskName "Hydrus Pocket Gateway"
Unregister-ScheduledTask -TaskName "Hydrus Pocket Gateway" -Confirm:$false
Remove-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "HydrusPocket"
$root = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $root ".hydrus-pocket\supervisor.pid"
if (Test-Path $pidFile) { Stop-Process -Id ([int](Get-Content $pidFile)) -Force }
$listener = Get-NetTCPConnection -LocalPort 47810 -State Listen
if ($listener) { Stop-Process -Id $listener.OwningProcess -Force }
& tailscale serve reset
Write-Host "Hydrus Pocket service and Tailscale mapping removed. Source files and Hydrus data were not changed."
