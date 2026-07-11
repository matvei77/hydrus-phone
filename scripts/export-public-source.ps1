param([Parameter(Mandatory = $true)][string]$Destination)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$destinationPath = [System.IO.Path]::GetFullPath($Destination)
if (Test-Path $destinationPath) { throw "Destination already exists: $destinationPath" }

& (Join-Path $PSScriptRoot "audit-public-release.ps1")
if ($LASTEXITCODE -ne 0) { throw "Public-release audit failed." }

New-Item -ItemType Directory -Path $destinationPath | Out-Null
$archive = Join-Path ([System.IO.Path]::GetTempPath()) "hydrus-pocket-public-$([guid]::NewGuid()).zip"
try {
  Set-Location $root
  git archive --format=zip --output=$archive HEAD
  if ($LASTEXITCODE -ne 0) { throw "git archive failed" }
  Expand-Archive -LiteralPath $archive -DestinationPath $destinationPath
} finally {
  Remove-Item -LiteralPath $archive -Force -ErrorAction SilentlyContinue
}

Write-Host "Clean source exported to $destinationPath"
Write-Host "Initialize a new Git repository there for public launch; do not copy .git or .env."
