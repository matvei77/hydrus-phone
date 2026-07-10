$response = Invoke-RestMethod -Uri "http://127.0.0.1:47810/api/health" -TimeoutSec 10
$response | ConvertTo-Json -Depth 8
if ($response.gateway -ne "ok" -or $response.hydrus -ne "ok") { exit 1 }
