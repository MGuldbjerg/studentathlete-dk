@echo off
title StudentAthlete - Threads setup
echo.
echo  Paste the Threads token for the market you choose.
echo  The script shows which profile it belongs to before writing anything.
echo.
set /p CC=Market (DK or UK):
wsl -e bash -c "cd ~/projekter/studentathlete-dk && source ~/.bashrc && npx tsx pipeline/social/setup-threads.ts --country %CC%"
pause
