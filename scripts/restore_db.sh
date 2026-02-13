#!/usr/bin/env bash
set -euo pipefail

FILE=${1:-}
DB_NAME=${DB_NAME:-apischeduler}
DB_USER=${DB_USER:-postgres}
DB_HOST=${DB_HOST:-localhost}

if [[ -z "$FILE" ]]; then
  echo "Usage: ./scripts/restore_db.sh <backup.sql>"
  exit 1
fi

if [[ ! -f "$FILE" ]]; then
  echo "Backup file not found: $FILE"
  exit 1
fi

echo "Restoring $DB_NAME from $FILE"
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" < "$FILE"

echo "Done"
