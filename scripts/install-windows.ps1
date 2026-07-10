$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not (Test-Path ".env")) { throw "Missing .env. Run scripts/request-hydrus-access.ps1 after opening Hydrus permission registration." }
npm ci
npm run check

$taskName = "Hydrus Pocket Gateway"
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$root\scripts\start-production.ps1`""
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -RestartCount 5 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit (New-TimeSpan -Days 0) -StartWhenAvailable
try {
  Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description "Private same-origin gateway for Hydrus Pocket" -Force -ErrorAction Stop | Out-Null
  Start-ScheduledTask -TaskName $taskName -ErrorAction Stop
} catch {
  $runCommand = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$root\scripts\start-production.ps1`""
  New-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "HydrusPocket" -Value $runCommand -PropertyType String -Force | Out-Null
  Start-Process powershell.exe -WindowStyle Hidden -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "`"$root\scripts\start-production.ps1`""
  Write-Host "Scheduled Task creation was unavailable; installed the no-admin per-user startup supervisor instead."
}

& tailscale serve --bg http://127.0.0.1:47810
Write-Host "Hydrus Pocket installed. Open https://desktop-gtpsl86-1.tailddb64.ts.net"
