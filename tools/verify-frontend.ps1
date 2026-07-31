param(
  [string]$Root = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = "Stop"
$docs = Join-Path $Root "docs"
$appDirectory = Join-Path $docs "app"
$compatibilityApps = @(
  (Join-Path $docs "app-20260706.js"),
  (Join-Path $docs "app.js")
) | ForEach-Object { Get-Item -LiteralPath $_ }
$index = Join-Path $docs "index.html"

$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) {
  $bundledNode = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
  if (Test-Path -LiteralPath $bundledNode) { $node = $bundledNode }
}
if (-not $node) { throw "Node.js is required for the JavaScript syntax check." }

$modules = Get-ChildItem -LiteralPath $appDirectory -Filter "*.js" -File | Sort-Object FullName
if (-not $modules) { throw "No JavaScript modules found in docs/app." }

foreach ($script in @($modules) + $compatibilityApps) {
  & $node --check $script.FullName
  if ($LASTEXITCODE) { throw "JavaScript syntax check failed for $($script.Name)." }
}

$appSource = ($modules | ForEach-Object {
  Get-Content -Raw -Encoding utf8 -LiteralPath $_.FullName
}) -join "`n"
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

foreach ($compatibilityApp in $compatibilityApps) {
  $loader = (Get-Content -Raw -Encoding utf8 -LiteralPath $compatibilityApp).Trim()
  if ($loader -ne 'import("./app/main.js");') {
    throw "$($compatibilityApp.Name) must remain a compatibility loader for app/main.js."
  }
}
if ($htmlSource -notmatch '<script type="module" src="app/main\.js\?v=[^"'']+"></script>') {
  throw "The deployed module entry is missing or has no cache-busting version."
}

Write-Output "Frontend verification passed: module syntax, DOM bindings, IDs, compatibility loaders, and cache version."
