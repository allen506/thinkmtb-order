#!/bin/bash
# Backup thinkmtb-order SQLite database
# Runs 2x daily via cron (6:00 AM and 6:00 PM)
# Keeps the last 14 backups (7 days x 2/day), then prunes older ones

DB="/Users/allen/Programming/thinkmtb-order/data/orders.db"
BACKUP_DIR="/Users/allen/Library/Application Support/thinkmtb-order/backups"
LOG="/Users/allen/Programming/thinkmtb-order/logs/backup.log"
KEEP=14   # number of most-recent backup files to retain

mkdir -p "$BACKUP_DIR"
mkdir -p "$(dirname "$LOG")"

TIMESTAMP=$(date '+%Y-%m-%d_%H%M%S')
DEST="$BACKUP_DIR/orders_$TIMESTAMP.db"

# Use SQLite's .backup command — safe with WAL mode and concurrent writes
if sqlite3 "$DB" ".backup '$DEST'"; then
  SIZE=$(du -sh "$DEST" | cut -f1)
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] OK: backup created → $DEST ($SIZE)" >> "$LOG"
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: backup failed for $DB" >> "$LOG"
  exit 1
fi

# Prune old backups, keeping only the most recent $KEEP files
EXISTING=$(ls -1t "$BACKUP_DIR"/orders_*.db 2>/dev/null | wc -l | tr -d ' ')
if [ "$EXISTING" -gt "$KEEP" ]; then
  TO_DELETE=$(ls -1t "$BACKUP_DIR"/orders_*.db | tail -n +"$((KEEP + 1))")
  while IFS= read -r OLD; do
    rm -f "$OLD"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] PRUNED: $OLD" >> "$LOG"
  done <<< "$TO_DELETE"
fi
