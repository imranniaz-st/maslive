param(
  [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $root

Write-Host "Checking Node.js..."
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  throw "Node.js was not found. Install Node.js 22 LTS or newer, then run this script again."
}

$nodeVersion = (& node --version).Trim()
Write-Host "Found $nodeVersion"

Write-Host "Enabling Corepack/pnpm..."
corepack enable
corepack prepare pnpm@latest --activate

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Created .env from .env.example"
} else {
  Write-Host ".env already exists; leaving it unchanged"
}

if (-not $SkipInstall) {
  Write-Host "Installing workspace dependencies with pnpm..."
  pnpm install
}

Write-Host ""
Write-Host "Windows setup complete."
Write-Host "Edit .env for DATABASE_URL and tool paths like MSFCONSOLE_PATH."
Write-Host "Start both local services with: pnpm run dev:windows"
Write-Host "Start the single live API server after build with: pnpm run start:live"
