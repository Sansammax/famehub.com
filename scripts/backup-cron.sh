#!/bin/bash
# FameHub Backup Cron Registration Script

BASE_PATH=$(pwd)
BACKUP_SCRIPT="$BASE_PATH/scripts/backup.sh"
LOGS_DIR="$BASE_PATH/logs"

mkdir -p "$LOGS_DIR"

CRON_JOB="0 2 * * * cd $BASE_PATH && ./scripts/backup.sh >> $LOGS_DIR/backup_cron.log 2>&1"

if command -v crontab >/dev/null 2>&1; then
    (crontab -l 2>/dev/null | grep -F "$BACKUP_SCRIPT") >/dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "Daily backup cron job is already configured."
    else
        (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
        echo "Daily backup cron job has been scheduled successfully at 02:00 UTC."
    fi
else
    echo "[WARNING] crontab command not found. Manually configure your scheduler with the following job:"
    echo "$CRON_JOB"
fi
