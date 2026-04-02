<#!
  OpenCNAPP — print repo layout and common commands.
  Run from anywhere:  pwsh -File scripts/dev-context.ps1
  Or from repo root:  .\scripts\dev-context.ps1
#>
$ErrorActionPreference = 'Stop'

function Get-RepoRoot {
    param([string]$StartPath)
    $dir = Resolve-Path $StartPath
    for ($i = 0; $i -lt 32; $i++) {
        $compose = Join-Path $dir.Path 'docker-compose.yml'
        $api = Join-Path $dir.Path 'api'
        $readme = Join-Path $dir.Path 'README.md'
        if ((Test-Path $compose) -and (Test-Path $api) -and (Test-Path $readme)) {
            return $dir.Path
        }
        $parent = Split-Path $dir.Path -Parent
        if ([string]::IsNullOrEmpty($parent) -or $parent -eq $dir.Path) { break }
        $dir = Get-Item $parent
    }
    return $null
}

$here = $PSScriptRoot
$candidate = Split-Path -Parent $here
$root = Get-RepoRoot $candidate
if (-not $root) {
    $root = Get-RepoRoot (Get-Location).Path
}

Write-Host ""
Write-Host "=== OpenCNAPP dev context ===" -ForegroundColor Cyan
if (-not $root) {
    Write-Host "Could not find repo root (expected docker-compose.yml + api/ + README.md)." -ForegroundColor Red
    Write-Host "cd to your OPEN-CNAPP clone and run:  pwsh -File scripts/dev-context.ps1"
    exit 1
}

Write-Host "REPO_ROOT: $root"
$env:OPENCNAPP_ROOT = $root

Write-Host ""
Write-Host "Key directories:" -ForegroundColor Yellow
@('api', 'dashboard', 'docs', 'plugins', 'scripts', 'deploy') | ForEach-Object {
    $p = Join-Path $root $_
    $ok = Test-Path $p
    Write-Host ("  {0,-12} {1}" -f $_, $(if ($ok) { $p } else { '(missing)' }))
}

Write-Host ""
Write-Host "Typical commands (run in separate terminals):" -ForegroundColor Yellow
Write-Host "  Docker full stack:  cd `"$root`" ; docker compose up -d"
Write-Host "  Dashboard dev:      cd `"$root\dashboard`" ; npm run dev"
Write-Host "  API health:         curl -s http://localhost:8000/health"
Write-Host ""
Write-Host "Docs: scripts/DEV_CONTEXT.md , docs/IMPLEMENTATION_STATUS.md"
Write-Host ""
