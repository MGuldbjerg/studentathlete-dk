@echo off
title StudentAthlete.dk - Pipeline Server
echo.
echo  ========================================
echo   Pipeline-server starter...
echo  ========================================
echo.
echo  Admin-panelet kan nu starte pipeline-trin via knapper.
echo  Luk dette vindue for at stoppe serveren.
echo.

wsl -e bash -c "cd ~/projekter/studentathlete-dk && source ~/.bashrc && npx tsx pipeline/server.ts"

pause
