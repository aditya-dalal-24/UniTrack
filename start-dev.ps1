# start-dev.ps1 — Launch UniTrack locally (backend + frontend)
# Run from the project root: .\start-dev.ps1
# Requires: Java 17+, Maven (or uses ./mvnw), Node.js 18+

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  UniTrack Dev Environment" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Backend  -> http://localhost:8081" -ForegroundColor Green
Write-Host "  Frontend -> http://localhost:5173" -ForegroundColor Green
Write-Host "  Secrets  -> loaded from backend/.env" -ForegroundColor Yellow
Write-Host ""

# Validate backend/.env exists
if (-not (Test-Path ".\backend\.env")) {
    Write-Host "[ERROR] backend/.env not found!" -ForegroundColor Red
    Write-Host "  Copy backend/.env.example to backend/.env and fill in your values." -ForegroundColor Yellow
    exit 1
}

# Start backend in a new window
Write-Host "Starting backend (Spring Boot)..." -ForegroundColor Cyan
Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d "\backend" && mvnw.cmd spring-boot:run" -WindowStyle Normal

# Give backend a head start
Write-Host "Waiting 5s before starting frontend..." -ForegroundColor Gray
Start-Sleep -Seconds 5

# Start frontend in a new window
Write-Host "Starting frontend (Vite)..." -ForegroundColor Cyan
Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d "\frontend" && npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "Both services are starting in separate windows." -ForegroundColor Green
Write-Host "Backend health: http://localhost:8081/actuator/health" -ForegroundColor Gray
Write-Host ""
