#!/bin/bash
# FameHub Platform Backup Script

BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_BACKUP_FILE="$BACKUP_DIR/db_backup_$TIMESTAMP.sql.gz"
REDIS_BACKUP_FILE="$BACKUP_DIR/redis_backup_$TIMESTAMP.rdb"
UPLOADS_BACKUP_FILE="$BACKUP_DIR/uploads_backup_$TIMESTAMP.tar.gz"

echo "=== Starting FameHub Platform Backup ==="

# 1. Backup PostgreSQL
if [ "$(docker ps -q -f name=famehub-postgres)" ]; then
    echo "[1/3] Backing up PostgreSQL..."
    docker exec -t famehub-postgres pg_dump -U postgres famehub | gzip > "$DB_BACKUP_FILE"
    echo "PostgreSQL backup completed: $DB_BACKUP_FILE"
else
    echo "[1/3] [WARNING] PostgreSQL container is not running. Skipping DB dump."
fi

# 2. Backup Redis
if [ "$(docker ps -q -f name=famehub-redis)" ]; then
    echo "[2/3] Triggering Redis BGSAVE..."
    docker exec -t famehub-redis redis-cli BGSAVE
    sleep 2
    docker cp famehub-redis:/data/dump.rdb "$REDIS_BACKUP_FILE"
    echo "Redis backup completed: $REDIS_BACKUP_FILE"
else
    echo "[2/3] [WARNING] Redis container is not running. Skipping cache dump."
fi

# 3. Backup Uploads
if [ -d "./backend/uploads" ]; then
    echo "[3/3] Packaging static uploads folder..."
    tar -czf "$UPLOADS_BACKUP_FILE" -C ./backend uploads
    echo "Static uploads backup completed: $UPLOADS_BACKUP_FILE"
else
    echo "[3/3] [WARNING] Uploads folder not found. Skipping."
fi

echo "=== Backup Process Completed ==="
