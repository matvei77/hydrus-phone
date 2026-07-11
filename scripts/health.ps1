param([int]$Port = 0)

if (-not $Port -and (Test-Path ".env")) {
  $portLine = Get-Content ".env" | Where-Object { $_ -match '^PORT=' } | Select-Object -First 1
  if ($portLine) { $Port = [int]($portLine -replace '^PORT=', '') }
}
if (-not $Port) { $Port = 47810 }

$response = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/api/health" -TimeoutSec 10
$readiness = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/api/ready" -TimeoutSec 10
$response | ConvertTo-Json -Depth 8
if ($response.gateway -ne "ok" -or $response.hydrus -ne "ok" -or -not $readiness.ready) { exit 1 }
