[CmdletBinding()]
param(
  [ValidateSet('validate', 'build')]
  [string]$Action = 'validate'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$approvedCommit = 'edd07fd62563a3ee4ee2879de1f709c72e9fe109'
$repositoryRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$environmentFile = Join-Path $repositoryRoot 'deploy/.env'
$projectName = 'steplab-docker-verify'
$forbiddenB3Paths = @(
  'client/src/pages/PaymentResultPage.jsx',
  'client/src/services/paymentService.js',
  'server/prisma/migrations/20261029120000_b3_vnpay_sandbox/migration.sql',
  'server/prisma/migrations/20261029120100_b3_allow_vnpay_payment_method/migration.sql',
  'server/src/routes/payment.routes.js',
  'server/src/services/payment.service.js',
  'server/src/services/vnpay-gateway.service.js'
)

if (-not (Test-Path -LiteralPath $environmentFile -PathType Leaf)) {
  throw "Deployment environment file is missing: $environmentFile"
}
if (-not (Select-String -Quiet -LiteralPath $environmentFile -Pattern '^COMPOSE_PROJECT_NAME=steplab-docker-verify$')) {
  throw 'deploy/.env does not identify the approved steplab-docker-verify project.'
}
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw 'Git CLI is unavailable.'
}
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw 'Docker CLI is unavailable.'
}

& git -C $repositoryRoot cat-file -e "$approvedCommit^{commit}"
if ($LASTEXITCODE -ne 0) {
  throw "Approved Docker baseline commit is unavailable: $approvedCommit"
}

$baselinePaths = @(& git -C $repositoryRoot ls-tree -r --name-only $approvedCommit)
if ($LASTEXITCODE -ne 0) {
  throw 'Unable to inspect the approved baseline tree.'
}
foreach ($path in $forbiddenB3Paths) {
  if ($baselinePaths -contains $path) {
    throw "Approved baseline unexpectedly contains B3 path: $path"
  }
}

if ($Action -eq 'validate') {
  Write-Output "APPROVED_BASELINE_COMMIT=$approvedCommit"
  Write-Output 'APPROVED_BASELINE_B3_EXCLUSION=PASS'
  Write-Output 'APPROVED_BASELINE_BUILD=NOT_RUN'
  exit 0
}

$temporaryParent = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
$temporaryRoot = Join-Path $temporaryParent "steplab-docker-build-$([Guid]::NewGuid().ToString('N'))"
$archiveFile = Join-Path $temporaryRoot 'source.zip'
$sourceRoot = Join-Path $temporaryRoot 'source'

try {
  New-Item -ItemType Directory -Path $temporaryRoot, $sourceRoot | Out-Null
  & git -C $repositoryRoot archive --format=zip --output=$archiveFile $approvedCommit
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $archiveFile -PathType Leaf)) {
    throw 'Unable to export the approved baseline source.'
  }

  Expand-Archive -LiteralPath $archiveFile -DestinationPath $sourceRoot
  $composeFile = Join-Path $sourceRoot 'compose.yaml'
  if (-not (Test-Path -LiteralPath $composeFile -PathType Leaf)) {
    throw 'Approved baseline archive does not contain compose.yaml.'
  }

  & docker compose `
    --project-directory $sourceRoot `
    -p $projectName `
    --env-file $environmentFile `
    -f $composeFile `
    build api web
  if ($LASTEXITCODE -ne 0) {
    throw "Approved baseline Docker build failed with exit code $LASTEXITCODE."
  }

  Write-Output "APPROVED_BASELINE_COMMIT=$approvedCommit"
  Write-Output 'APPROVED_BASELINE_BUILD=PASS'
} finally {
  $resolvedTemporaryRoot = [IO.Path]::GetFullPath($temporaryRoot)
  $leaf = Split-Path -Leaf $resolvedTemporaryRoot
  $isInsideTemporaryDirectory = $resolvedTemporaryRoot.StartsWith(
    $temporaryParent,
    [StringComparison]::OrdinalIgnoreCase
  )
  $hasExpectedPrefix = $leaf.StartsWith(
    'steplab-docker-build-',
    [StringComparison]::OrdinalIgnoreCase
  )
  if ($isInsideTemporaryDirectory -and $hasExpectedPrefix -and (Test-Path -LiteralPath $resolvedTemporaryRoot)) {
    Remove-Item -LiteralPath $resolvedTemporaryRoot -Recurse -Force
  }
}
