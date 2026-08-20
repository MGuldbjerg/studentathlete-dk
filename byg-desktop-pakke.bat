@echo off
title StudentAthlete - Byg pakke til Claude Desktop
cd /d "\\wsl$\Ubuntu\home\mikkel\projekter\studentathlete-dk"

echo.
echo  ==========================================================
echo   Bygger kontekstpakken til Claude Desktop
echo  ==========================================================
echo.

wsl -e bash -c "cd ~/projekter/studentathlete-dk && ./scripts/build-desktop-pack.sh"

echo.
echo  Filen ligger i mappen desktop-pakke:
echo    StudentAthlete-til-Claude-Desktop.md
echo.
echo  Laeg den i Claude Desktop under Projektviden.
echo.

explorer "\\wsl$\Ubuntu\home\mikkel\projekter\studentathlete-dk\desktop-pakke"
pause
