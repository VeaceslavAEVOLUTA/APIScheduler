#!/usr/bin/env bash
set -euo pipefail

DB_NAME=${DB_NAME:-apischeduler}
DB_USER=${DB_USER:-postgres}
DB_HOST=${DB_HOST:-localhost}
BACKUP_DIR=${BACKUP_DIR:-./backups}

mkdir -p "$BACKUP_DIR"
TS=$(date +%Y%m%d_%H%M%S)
FILE="$BACKUP_DIR/${DB_NAME}_${TS}.sql"

echo "Backing up $DB_NAME to $FILE"
pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" > "$FILE"

echo "Done"
