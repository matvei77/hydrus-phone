param([string[]]$ForbiddenText = @())

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$required = @(
  "LICENSE", "NOTICE", "README.md", "SECURITY.md", "SUPPORT.md",
  "CONTRIBUTING.md", "CODE_OF_CONDUCT.md", "THIRD_PARTY_NOTICES.md",
  ".github/ISSUE_TEMPLATE/bug_report.yml", ".github/PULL_REQUEST_TEMPLATE.md"
)
$missing = $required | Where-Object { -not (Test-Path $_) }
if ($missing) { throw "Missing public-release files: $($missing -join ', ')" }

$trackedUnsafe = git ls-files -- .env .env.local .hydrus-pocket prompt.txt node_modules dist
if ($trackedUnsafe) { throw "Ignored/private material is tracked. Review git ls-files output locally." }

$trackedFiles = git ls-files
$secretPattern = '(' +
  ('HYDRUS_' + 'ACCESS_KEY\s*=\s*[0-9a-fA-F]{64}') + '|' +
  ('tskey-' + '(auth|client|api)-[A-Za-z0-9_-]{16,}') + '|' +
  ('-----BEGIN ' + '(RSA|OPENSSH|EC)' + ' PRIVATE KEY-----') + ')'
foreach ($file in $trackedFiles) {
  if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { continue }
  $extension = [System.IO.Path]::GetExtension($file).ToLowerInvariant()
  if ($extension -in @('.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico')) { continue }
  $content = Get-Content -LiteralPath $file -Raw -ErrorAction SilentlyContinue
  if ($content -match $secretPattern) { throw "Potential secret found in the tracked working tree. Run the documented local scan to identify and rotate it." }
  foreach ($forbidden in $ForbiddenText) {
    if ($forbidden -and $content.Contains($forbidden)) { throw "Forbidden private text remains in tracked source." }
  }
}

$history = git log -p --all --format=
if (($history -join "`n") -match $secretPattern) {
  throw "Potential credential material exists in Git history. Rotate it and publish from a clean-history export."
}

npm run check:licenses
if ($LASTEXITCODE -ne 0) { throw "License metadata check failed." }
npm audit --omit=dev
if ($LASTEXITCODE -ne 0) { throw "Production dependency audit failed." }

Write-Host "Public-release audit passed. Existing history may still contain non-secret machine names; use the clean export procedure before changing visibility."
