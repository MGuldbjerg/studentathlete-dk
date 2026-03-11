#!/usr/bin/env bash
# Opsætter discovery som planlagt opgave.
# Linux/WSL: crontab
# Windows: Task Scheduler via schtasks

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if command -v schtasks.exe &>/dev/null; then
  # Windows Task Scheduler — kør hver 6. time
  WIN_PATH="$(wslpath -w "$SCRIPT_DIR/run_discover.bat")"

  schtasks.exe /Create /F \
    /TN "StudentAthlete-Discovery" \
    /TR "$WIN_PATH" \
    /SC HOURLY /MO 6 \
    /ST 06:00 \
    /RL HIGHEST \
    /V1 /Z

  echo "Windows Task Scheduler-opgave oprettet: StudentAthlete-Discovery"
  echo "Kører hver 6. time fra kl. 06:00"
  echo ""
  echo "Administrer med:"
  echo "  schtasks.exe /Query /TN StudentAthlete-Discovery"
  echo "  schtasks.exe /Delete /TN StudentAthlete-Discovery /F"

else
  # Linux/Mac — crontab
  CRON_LINE="0 */6 * * * cd $SCRIPT_DIR && bash run_discover.sh >> logs/cron.log 2>&1"

  # Tilføj til crontab hvis den ikke allerede er der
  if crontab -l 2>/dev/null | grep -q "StudentAthlete.*run_discover"; then
    echo "Cron-job eksisterer allerede."
  else
    (crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -
    echo "Cron-job tilføjet: kører hver 6. time"
    echo "Tjek med: crontab -l"
  fi
fi
