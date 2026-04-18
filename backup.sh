#!/usr/bin/env bash
# PinoyPool MySQL backup script
# Usage:   ./backup.sh
# Cron example (daily at 2 AM):
#   0 2 * * * /path/to/PinoyPool/backup.sh >> /path/to/PinoyPool/backup.log 2>&1

set -euo pipefail

# ── Load env vars from "Pinoy Pool.env" if present, else fall back to .env ──
ENV_FILE="$(dirname "$0")/Pinoy Pool.env"
[ -f "$ENV_FILE" ] || ENV_FILE="$(dirname "$0")/.env"
if [ -f "$ENV_FILE" ]; then
  # Export only DB_* and relevant vars; skip blank lines and comments
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:?DB_USER not set}"
DB_PASS="${DB_PASS:?DB_PASS not set}"
DB_NAME="${DB_NAME:?DB_NAME not set}"

BACKUP_DIR="$(dirname "$0")/backups"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
OUTFILE="$BACKUP_DIR/pinoypool_${TIMESTAMP}.sql.gz"

echo "[$(date -u +%FT%TZ)] Starting backup → $OUTFILE"

mysqldump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --user="$DB_USER" \
  --password="$DB_PASS" \
  --single-transaction \
  --routines \
  --triggers \
  "$DB_NAME" | gzip > "$OUTFILE"

SIZE=$(du -sh "$OUTFILE" | cut -f1)
echo "[$(date -u +%FT%TZ)] Backup complete — $OUTFILE ($SIZE)"

# ── Keep only the 30 most recent backups ──
ls -tp "$BACKUP_DIR"/pinoypool_*.sql.gz 2>/dev/null | tail -n +31 | xargs -r rm --
echo "[$(date -u +%FT%TZ)] Cleanup done — keeping latest 30 backups"
