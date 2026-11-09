[CmdletBinding()]
param(
  [ValidateSet('validate', 'status', 'start', 'stop', 'logs', 'health')]
  [string]$Action = 'status'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repositoryRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$composeFile = Join-Path $repositoryRoot 'compose.yaml'
$environmentFile = Join-Path $repositoryRoot 'deploy/.env'
$projectName = 'steplab-docker-verify'

if (-not (Test-Path -LiteralPath $composeFile -PathType Leaf)) {
  throw "Compose file is missing: $composeFile"
}
if (-not (Test-Path -LiteralPath $environmentFile -PathType Leaf)) {
  throw "Deployment environment file is missing: $environmentFile"
}
if (-not (Select-String -Quiet -LiteralPath $environmentFile -Pattern '^COMPOSE_PROJECT_NAME=steplab-docker-verify$')) {
  throw 'deploy/.env does not identify the approved steplab-docker-verify project.'
}
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw 'Docker CLI is unavailable.'
}

$baseArguments = @(
  'compose',
  '--project-directory', $repositoryRoot,
  '-p', $projectName,
  '--env-file', $environmentFile,
  '-f', $composeFile
)

function Invoke-ApprovedCompose {
  param([string[]]$Arguments)

  & docker @baseArguments @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Docker Compose command failed with exit code $LASTEXITCODE."
  }
}

switch ($Action) {
  'validate' {
    Invoke-ApprovedCompose -Arguments @('config', '--quiet')
    Write-Output 'DOCKER_COMPOSE_CONFIG=PASS'
  }
  'status' {
    Invoke-ApprovedCompose -Arguments @('ps')
  }
  'start' {
    # Start only existing approved containers. This action never builds, creates, or migrates.
    Invoke-ApprovedCompose -Arguments @('start', 'db', 'api', 'web')
  }
  'stop' {
    # Keep PostgreSQL running and preserve every named volume.
    Invoke-ApprovedCompose -Arguments @('stop', 'web', 'api')
  }
  'logs' {
    Invoke-ApprovedCompose -Arguments @('logs', '--tail=200', 'web', 'api', 'db')
  }
  'health' {
    Invoke-ApprovedCompose -Arguments @('ps')
    $response = Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:18080/api/health' -TimeoutSec 10
    if ($response.StatusCode -ne 200) {
      throw "Docker health endpoint returned HTTP $($response.StatusCode)."
    }
    Write-Output 'DOCKER_HEALTH=PASS'
  }
}
