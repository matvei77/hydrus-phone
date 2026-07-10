$response = Invoke-RestMethod -Uri "http://127.0.0.1:47810/api/health" -TimeoutSec 10
$readiness = Invoke-RestMethod -Uri "http://127.0.0.1:47810/api/ready" -TimeoutSec 10
$response | ConvertTo-Json -Depth 8
if ($response.gateway -ne "ok" -or $response.hydrus -ne "ok" -or -not $readiness.ready) { exit 1 }
