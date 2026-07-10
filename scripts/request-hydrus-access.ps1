param(
  [string]$HydrusUrl = "http://127.0.0.1:45869",
  [string]$EnvironmentFile = ".env"
)

$ErrorActionPreference = "Stop"
$query = [System.Uri]::EscapeDataString('[1,2,3]')
$deadline = (Get-Date).AddMinutes(5)
$response = $null
while (-not $response -and (Get-Date) -lt $deadline) {
  try {
    $response = Invoke-RestMethod -Uri "$HydrusUrl/request_new_permissions?name=Hydrus%20Pocket&basic_permissions=$query" -TimeoutSec 180
  } catch {
    if ($_.Exception.Response.StatusCode.value__ -ne 409) { throw }
    Write-Host "Waiting for Hydrus: services > review services > client api > add > from api request"
    Start-Sleep -Seconds 2
  }
}

if (-not $response) { throw "Timed out waiting for the Hydrus permission-registration window." }

if (-not $response.access_key) {
  throw "Hydrus did not return an access key. Approve the request in the Hydrus client and try again."
}

$contents = @(
  "HYDRUS_URL=$HydrusUrl"
  "HYDRUS_ACCESS_KEY=$($response.access_key)"
  "HOST=127.0.0.1"
  "PORT=47810"
  "APP_URL=https://desktop-gtpsl86-1.tailddb64.ts.net"
) -join [Environment]::NewLine

[System.IO.File]::WriteAllText((Join-Path (Get-Location) $EnvironmentFile), $contents + [Environment]::NewLine)
Write-Host "Hydrus Pocket access approved and saved to $EnvironmentFile."
