#!/bin/bash
set -euo pipefail

echo "Resetting AI Builder state..."

docker compose exec ai-builder bash -c '
  echo "1" > /app/state/day.txt
  rm -f /app/state/changelog.md
  rm -f /app/state/next-feature.md
  echo "State reset complete:"
  echo "  - Day counter: 1"
  echo "  - Changelog: removed"
  echo "  - Feature plan: removed"
'

echo "Done. Next build will start from Day 1."
