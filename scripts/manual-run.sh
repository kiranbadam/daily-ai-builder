#!/bin/bash
set -euo pipefail

echo "Triggering manual build..."
echo "Log will be written to: /app/logs/$(date '+%Y-%m-%d').log"
echo ""

docker compose exec ai-builder /app/daily-build.sh

echo ""
echo "Build complete. Check logs with: ./scripts/view-logs.sh"
