@echo off
echo ========================================
echo    UniTrack Frontend Starter
echo ========================================
echo.
echo  Frontend will be available at http://localhost:5173
echo  Make sure backend is running first (START-BACKEND.bat)
echo.

cd /d "d:\UniTrack\frontend"

echo Starting Vite dev server...
echo.

npm run dev

pause
