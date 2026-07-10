$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not (Test-Path ".env")) { throw "Missing .env. Run scripts/request-hydrus-access.ps1 after opening Hydrus permission registration." }

Get-CimInstance Win32_Process |
  Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine -like "*scripts\start-production.ps1*" } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
$listener = Get-NetTCPConnection -LocalPort 47810 -State Listen -ErrorAction SilentlyContinue
if ($listener) { Stop-Process -Id $listener.OwningProcess -Force -ErrorAction SilentlyContinue }

$rollback = Join-Path $root ".hydrus-pocket\rollback\dist"
if (Test-Path "dist") {
  Remove-Item -LiteralPath $rollback -Recurse -Force -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $rollback) | Out-Null
  Copy-Item -LiteralPath "dist" -Destination $rollback -Recurse -Force
}
try {
  npm ci
  if ($LASTEXITCODE -ne 0) { throw "npm ci failed" }
  npm run check
  if ($LASTEXITCODE -ne 0) { throw "release checks failed" }
} catch {
  if (Test-Path $rollback) {
    Remove-Item -LiteralPath "dist" -Recurse -Force -ErrorAction SilentlyContinue
    Copy-Item -LiteralPath $rollback -Destination "dist" -Recurse -Force
    Start-Process powershell.exe -WindowStyle Hidden -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "`"$root\scripts\start-production.ps1`""
  }
  throw
}

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
