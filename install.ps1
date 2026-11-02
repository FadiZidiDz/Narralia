# Narralia — first-time setup (Windows)
# Prerequisite: Docker Desktop installed and running

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot
Set-Location $ProjectRoot

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }

Write-Host "Narralia — Docker setup" -ForegroundColor White

# Docker CLI
Write-Step "Checking Docker..."
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Host "Docker is not installed or not on PATH." -ForegroundColor Red
  Write-Host "Install Docker Desktop: https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
  Start-Process "https://www.docker.com/products/docker-desktop/"
  exit 1
}

try {
  docker info 2>&1 | Out-Null
} catch {
  Write-Host "Docker Desktop is not running. Start Docker Desktop, wait until it is ready, then run install again." -ForegroundColor Red
  exit 1
}

# Compose plugin
Write-Step "Checking Docker Compose..."
docker compose version 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host "docker compose is not available. Update Docker Desktop." -ForegroundColor Red
  exit 1
}

# .env bootstrap
$envFile = Join-Path $ProjectRoot ".env"
$envExample = Join-Path $ProjectRoot ".env.example"
if (-not (Test-Path $envFile)) {
  if (Test-Path $envExample) {
    Copy-Item $envExample $envFile
    Write-Host "Created .env from .env.example" -ForegroundColor Green
  } else {
    Write-Host ".env.example not found." -ForegroundColor Red
    exit 1
  }
} else {
  Write-Host ".env already exists — keeping your settings." -ForegroundColor Gray
}

Write-Step "Before continuing, edit .env with your secrets:"
Write-Host "  - JWT_SECRET (long random string)" -ForegroundColor Yellow
Write-Host "  - GROQ_API_KEY" -ForegroundColor Yellow
Write-Host "  - CLOUDINARY_* (for teacher reference images, optional for student illustrations)" -ForegroundColor Yellow
Write-Host "  - FRONTEND_PORT if 3000 is busy (e.g. 3002)" -ForegroundColor Yellow
$null = Read-Host "Press Enter when .env is ready (or to continue with current .env)"

# FRONTEND_PORT for browser
$frontendPort = "3000"
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*FRONTEND_PORT\s*=\s*(\d+)') { $frontendPort = $Matches[1] }
  }
}

Write-Step "Building and starting containers (first run may take several minutes)..."
docker compose up --build -d
if ($LASTEXITCODE -ne 0) {
  Write-Host "docker compose up failed." -ForegroundColor Red
  exit 1
}

Write-Step "Waiting for backend on port 5000..."
$deadline = (Get-Date).AddMinutes(3)
$ready = $false
while ((Get-Date) -lt $deadline) {
  try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $tcp.Connect("127.0.0.1", 5000)
    $tcp.Close()
    $ready = $true
    break
  } catch {
    Start-Sleep -Seconds 3
  }
}

if (-not $ready) {
  Write-Host "Backend did not respond on port 5000 in time. Check: docker compose logs backend" -ForegroundColor Yellow
} else {
  Write-Host "Backend is up." -ForegroundColor Green
}

$url = "http://localhost:$frontendPort"
Write-Step "Opening $url"
Start-Process $url

Write-Host "`nDone. Use start.bat to run again, stop.bat to shut down." -ForegroundColor Green
Write-Host "Optional demo data: docker exec narralia_backend node src/scripts/seed.js" -ForegroundColor Gray
