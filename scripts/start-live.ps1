param(
  [int]$ApiPort = 8080,
  [int]$DashboardPort = 8081,
  [string]$EnvFile = ".env"
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $root

if (Test-Path $EnvFile) {
  Get-Content $EnvFile | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) {
      return
    }
    $parts = $line.Split("=", 2)
    [Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim(), "Process")
  }
}

$pnpm = Get-Command pnpm.cmd -ErrorAction SilentlyContinue
if (-not $pnpm) {
  $pnpm = Get-Command pnpm -ErrorAction SilentlyContinue
}
if (-not $pnpm) {
  throw "pnpm was not found. Run pnpm run setup:windows first."
}

$env:NODE_ENV = "development"

Write-Host "Starting API on http://localhost:$ApiPort"
Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  "Set-Location '$root'; `$env:API_PORT='$ApiPort'; `$env:PORT='$ApiPort'; & '$($pnpm.Source)' --filter @workspace/api-server run dev"
)

Write-Host "Starting dashboard on http://localhost:$DashboardPort"
Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  "Set-Location '$root'; `$env:DASHBOARD_PORT='$DashboardPort'; `$env:PORT='$DashboardPort'; `$env:BASE_PATH='/'; & '$($pnpm.Source)' --filter @workspace/security-dashboard run dev"
)

Write-Host ""
Write-Host "Services launched. Close the two PowerShell windows to stop them."
