$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$logDir = Join-Path $root ".hydrus-pocket\logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir "gateway.log"
$errorLog = Join-Path $logDir "gateway-error.log"

function Rotate-Log([string]$Path) {
  if (-not (Test-Path $Path)) { return }
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $extension = [System.IO.Path]::GetExtension($Path)
  $stem = [System.IO.Path]::GetFileNameWithoutExtension($Path)
  Move-Item -Force -LiteralPath $Path -Destination (Join-Path $logDir "$stem-$stamp$extension")
  Get-ChildItem -LiteralPath $logDir -Filter "$stem-*.log" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -Skip 5 |
    Remove-Item -Force
}

Set-Location $root
$runtimeDir = Join-Path $root ".hydrus-pocket"
$pidFile = Join-Path $runtimeDir "supervisor.pid"
[System.IO.File]::WriteAllText($pidFile, [string]$PID)
try {
  while ($true) {
    Rotate-Log $log
    Rotate-Log $errorLog
    $child = Start-Process -FilePath (Get-Command node).Source `
      -ArgumentList "dist\server\index.js" `
      -WorkingDirectory $root `
      -WindowStyle Hidden `
      -RedirectStandardOutput $log `
      -RedirectStandardError $errorLog `
      -PassThru
    while (-not $child.HasExited) {
      Start-Sleep -Seconds 2
      $tooLarge = ((Test-Path $log) -and (Get-Item $log).Length -gt 10MB) -or
        ((Test-Path $errorLog) -and (Get-Item $errorLog).Length -gt 10MB)
      if ($tooLarge) { Stop-Process -Id $child.Id -Force }
    }
    Start-Sleep -Seconds 5
  }
} finally {
  if ($child -and -not $child.HasExited) { Stop-Process -Id $child.Id -Force }
  Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
}
