#!/bin/bash
set -euo pipefail

echo "=== AI Builder Container Starting ==="
echo "Time: $(date '+%Y-%m-%d %H:%M:%S %Z')"

# Step 1: Dump env vars for cron (cron runs in a clean env with no variables)
printenv | grep -E '^[A-Z_]+=' | sed 's/^/export /' > /app/.env.sh
echo "Environment captured to /app/.env.sh"

# Step 2: Auth GitHub CLI (GITHUB_TOKEN env var is used automatically by gh)
gh auth status
echo "GitHub CLI authenticated"

# Step 3: Configure git (use gh as credential helper so git fetch/push work with GITHUB_TOKEN)
git config --global user.name "kiranbadam"
git config --global user.email "kiranbadam@gmail.com"
gh auth setup-git
echo "Git configured"

# Step 4: Clone or pull all repos from repos.conf
echo "Syncing repos..."
mkdir -p /app/projects
while IFS= read -r line; do
  line=$(echo "$line" | sed 's/#.*//' | xargs)
  [ -z "$line" ] && continue

  REPO_SLUG=$(echo "$line" | tr '/' '-')
  PROJECT_DIR="/app/projects/$REPO_SLUG"
  STATE_DIR="/app/state/$REPO_SLUG"
  mkdir -p "$STATE_DIR"

  if [ ! -d "$PROJECT_DIR/.git" ]; then
    echo "  Cloning $line..."
    gh repo clone "$line" "$PROJECT_DIR"
  else
    echo "  Pulling $line..."
    cd "$PROJECT_DIR"
    git fetch origin
    git reset --hard origin/main
  fi

  # Init state if missing
  if [ ! -f "$STATE_DIR/day.txt" ]; then
    echo "1" > "$STATE_DIR/day.txt"
    echo "  Initialized $line at Day 1"
  fi
done < /app/repos.conf
echo "All repos ready"

# Step 5: Install cron job (5 AM Pacific every day)
echo "0 5 * * * /app/daily-build.sh >> /app/logs/cron.log 2>&1" | crontab -
echo "Cron job installed: 0 5 * * * (5 AM Pacific)"

# Step 6: Check for manual trigger
if [ "${1:-}" = "--run-now" ]; then
  echo "Manual trigger detected, running build now..."
  exec /app/daily-build.sh
fi

# Step 7: Start dashboard
echo "Starting dashboard on port 8080..."
node /app/dashboard.js &

# Step 8: Start cron in foreground (keeps container alive)
echo "Starting cron daemon in foreground..."
echo "Container ready. Next build at 5:00 AM Pacific."
cron -f
