#!/bin/bash
# FameHub Platform Restore Script

if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ]; then
    echo "Usage: $0 <db_backup.sql.gz> <redis_backup.rdb> <uploads_backup.tar.gz>"
    exit 1
fi

DB_BACKUP=$1
REDIS_BACKUP=$2
UPLOADS_BACKUP=$3

echo "=== Starting FameHub Platform Restore ==="

# 1. Restore PostgreSQL
if [ -f "$DB_BACKUP" ] && [ "$(docker ps -q -f name=famehub-postgres)" ]; then
    echo "[1/3] Restoring PostgreSQL database..."
    # Drop and recreate schema to make sure we start fresh
    docker exec -t famehub-postgres psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS famehub;"
    docker exec -t famehub-postgres psql -U postgres -d postgres -c "CREATE DATABASE famehub;"
    gunzip -c "$DB_BACKUP" | docker exec -i famehub-postgres psql -U postgres -d famehub
    echo "PostgreSQL database restore complete."
else
    echo "[1/3] [ERROR] DB backup file missing or PostgreSQL container is offline."
    exit 1
fi

# 2. Restore Redis
if [ -f "$REDIS_BACKUP" ] && [ "$(docker ps -q -f name=famehub-redis)" ]; then
    echo "[2/3] Restoring Redis cached data..."
    docker cp "$REDIS_BACKUP" famehub-redis:/data/dump.rdb
    docker restart famehub-redis
    echo "Redis container restarted and cache populated."
else
    echo "[2/3] [WARNING] Redis backup file missing or Redis container offline."
fi

# 3. Restore Uploads
if [ -f "$UPLOADS_BACKUP" ]; then
    echo "[3/3] Unpackaging static uploads..."
    tar -xzf "$UPLOADS_BACKUP" -C ./backend
    echo "Uploads restored."
else
    echo "[3/3] [WARNING] Uploads archive file missing."
fi

echo "=== Restore Process Completed ==="
