param(
  [string]$Root = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = "Stop"
$docs = Join-Path $Root "docs"
$canonicalApp = Join-Path $docs "app-20260706.js"
$mirrorApp = Join-Path $docs "app.js"
$index = Join-Path $docs "index.html"

$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) {
  $bundledNode = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
  if (Test-Path -LiteralPath $bundledNode) { $node = $bundledNode }
}
if (-not $node) { throw "Node.js is required for the JavaScript syntax check." }

& $node --check $canonicalApp
if ($LASTEXITCODE) { throw "JavaScript syntax check failed for app-20260706.js." }
& $node --check $mirrorApp
if ($LASTEXITCODE) { throw "JavaScript syntax check failed for app.js." }

$appSource = Get-Content -Raw -Encoding utf8 -LiteralPath $canonicalApp
$htmlSource = Get-Content -Raw -Encoding utf8 -LiteralPath $index
$appIds = [regex]::Matches($appSource, 'getElementById\("([^"]+)"\)') |
  ForEach-Object { $_.Groups[1].Value } |
  Sort-Object -Unique
$htmlIds = [regex]::Matches($htmlSource, 'id="([^"]+)"') |
  ForEach-Object { $_.Groups[1].Value }

$missingIds = $appIds | Where-Object { $_ -notin $htmlIds }
if ($missingIds) { throw "Missing HTML IDs: $($missingIds -join ', ')" }
$duplicateIds = $htmlIds | Group-Object | Where-Object Count -gt 1
if ($duplicateIds) { throw "Duplicate HTML IDs: $($duplicateIds.Name -join ', ')" }

$canonicalHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $canonicalApp).Hash
$mirrorHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $mirrorApp).Hash
if ($canonicalHash -ne $mirrorHash) { throw "docs/app.js is out of sync with app-20260706.js." }
if ($htmlSource -notmatch 'app-20260706\.js\?v=[^"'']+') { throw "The deployed script is missing a cache-busting version." }

Write-Output "Frontend verification passed: JavaScript syntax, DOM bindings, IDs, mirror, and cache version."
