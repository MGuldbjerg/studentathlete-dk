@echo off
title StudentAthlete.dk - Dev Server
cd /d "\\wsl$\Ubuntu\home\mikkel\projekter\studentathlete-dk"

echo.
echo  ========================================
echo   StudentAthlete.dk - Starter dev server
echo  ========================================
echo.
echo  Aabner http://localhost:3000 om 8 sekunder...
echo.

start "" cmd /c "timeout /t 8 /nobreak >nul && start http://localhost:3000"

wsl -e bash -c "cd ~/projekter/studentathlete-dk && npm run dev"

pause
