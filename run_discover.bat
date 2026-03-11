@echo off
REM Token-fri discovery — tjekker kilder for nye historier.
REM Kræver .env med Cloudflare credentials.

cd /d "%~dp0"

REM Load .env hvis den findes
if exist .env (
    for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
        set "%%A=%%B"
    )
)

echo === StudentAthlete.dk — Discovery ===
echo Startet: %date% %time%
echo.

call npx tsx pipeline/discover/check-sources.ts

echo.
echo Faerdig: %date% %time%
pause
