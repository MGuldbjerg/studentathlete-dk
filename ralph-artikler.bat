@echo off
REM Ralph-loop: generer feature-artikler for alle atleter i koeen.
REM Koerer 4 iterationer (en per atlet).

echo === StudentAthlete.dk — Ralph artikelgenerering ===
echo Startet: %date% %time%
echo.

REM Kør via WSL (ralph er installeret i Linux)
wsl bash -lc "cd /home/mikkel/projekter/studentathlete-dk && unset CLAUDECODE && ralph run -n 4"

echo.
echo Faerdig: %date% %time%
pause
