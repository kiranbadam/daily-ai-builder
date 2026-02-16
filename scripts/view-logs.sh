#!/bin/bash
set -euo pipefail

LOG_DATE="${1:-$(date '+%Y-%m-%d')}"
echo "Tailing log for $LOG_DATE..."
echo "Press Ctrl+C to stop."
echo ""

docker compose exec ai-builder tail -f "/app/logs/${LOG_DATE}.log"
