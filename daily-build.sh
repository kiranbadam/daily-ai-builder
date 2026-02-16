#!/bin/bash
set -euo pipefail

# ============================================
# Daily AI Builder — Multi-Repo Orchestrator
# ============================================

# --- Step A: Source environment ---
source /app/.env.sh

# --- Pre-flight: Check Claude auth ---
echo "Checking Claude authentication..."
if ! claude -p "reply with OK" --max-turns 1 2>/tmp/claude-auth-check.log; then
  echo "ERROR: Claude authentication failed. Session may have expired."
  echo "SSH into the DGX Spark and run: docker exec -it daily-ai-builder claude login"
  cat /tmp/claude-auth-check.log
  if [ -n "${WEBHOOK_URL:-}" ]; then
    curl -s -X POST "$WEBHOOK_URL" \
      -H "Content-Type: application/json" \
      -d "{\"text\":\"❌ AI Builder — Claude auth expired. SSH in and run: docker exec -it daily-ai-builder claude login\"}" || true
  fi
  exit 1
fi
echo "Claude auth OK"

# --- Set up log ---
LOG_FILE="/app/logs/$(date '+%Y-%m-%d').log"
exec >> "$LOG_FILE" 2>&1
echo "============================================"
echo "Daily Build Orchestrator — $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "============================================"

# --- Read repos ---
if [ ! -f /app/repos.conf ]; then
  echo "ERROR: /app/repos.conf not found"
  exit 1
fi

REPOS=()
while IFS= read -r line; do
  # Skip empty lines and comments
  line=$(echo "$line" | sed 's/#.*//' | xargs)
  [ -n "$line" ] && REPOS+=("$line")
done < /app/repos.conf

echo "Repos to build: ${REPOS[*]}"
echo "Total: ${#REPOS[@]}"
echo ""

# --- Build each repo sequentially ---
PASSED=0
FAILED=0
SKIPPED=0

for REPO in "${REPOS[@]}"; do
  echo "============================================"
  echo ">>> Starting: $REPO"
  echo "============================================"

  if /app/build-repo.sh "$REPO"; then
    echo ">>> $REPO — SUCCESS"
    PASSED=$((PASSED + 1))
  else
    echo ">>> $REPO — FAILED (continuing to next repo)"
    FAILED=$((FAILED + 1))
  fi
  echo ""
done

# --- Summary ---
echo "============================================"
echo "Daily Build Summary — $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "============================================"
echo "Total repos: ${#REPOS[@]}"
echo "Passed: $PASSED"
echo "Failed: $FAILED"
echo "============================================"
