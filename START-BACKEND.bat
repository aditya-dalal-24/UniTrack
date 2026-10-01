@echo off
echo ========================================
echo    UniTrack Backend Starter
echo ========================================
echo.
echo  Secrets loaded automatically from backend/.env
echo  Backend will be available at http://localhost:8081
echo.

cd /d "d:\UniTrack\backend"

echo Starting Spring Boot backend...
echo This may take up to 30 seconds on first run...
echo.

call mvnw.cmd spring-boot:run

pause
