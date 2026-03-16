#!/bin/bash
# Health check for thinkmtb-order
# Curls localhost:3000; if no HTTP 200, restarts the PM2 process and logs the event.

APP_NAME="thinkmtb-order"
URL="http://localhost:3000"
LOG="/Users/allen/Programming/thinkmtb-order/logs/healthcheck.log"
PM2="/opt/homebrew/lib/node_modules/pm2/bin/pm2"

mkdir -p "$(dirname "$LOG")"

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$URL")

if [ "$HTTP_STATUS" != "200" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARN: $APP_NAME not responding (status: $HTTP_STATUS). Restarting..." >> "$LOG"
  "$PM2" restart "$APP_NAME" >> "$LOG" 2>&1
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] INFO: Restart triggered." >> "$LOG"
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] OK: $APP_NAME responding (status: $HTTP_STATUS)" >> "$LOG"
fi
