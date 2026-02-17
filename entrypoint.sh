#!/bin/bash
set -euo pipefail

echo "=== AI Builder Container Starting ==="
echo "Time: $(date '+%Y-%m-%d %H:%M:%S %Z')"

# Step 1: Dump env vars for cron (cron runs in a clean env with no variables)
printenv | grep -E '^[A-Z_]+=' | sed 's/=\(.*\)/="\1"/' | sed 's/^/export /' > /app/.env.sh
echo "Environment captured to /app/.env.sh"

# Step 2: Auth GitHub CLI (GITHUB_TOKEN env var is used automatically by gh)
gh auth status
echo "GitHub CLI authenticated"

# Step 3: Configure git (use gh as credential helper so git fetch/push work with GITHUB_TOKEN)
git config --global user.name "${GIT_USER_NAME:-RoboDevLoop}"
git config --global user.email "${GIT_USER_EMAIL:-robodevloop@users.noreply.github.com}"
gh auth setup-git
echo "Git configured (user: ${GIT_USER_NAME:-RoboDevLoop}, email: ${GIT_USER_EMAIL:-robodevloop@users.noreply.github.com})"

# Step 4: Authenticate Claude
if [ -n "${ANTHROPIC_API_KEY:-}" ]; then
  echo "Using API key authentication"
else
  # Check if Claude is already authenticated via interactive login
  if claude auth status >/dev/null 2>&1; then
    echo "Claude authenticated via interactive login"
  else
    echo "WARNING: No Claude authentication found."
    echo "  Option 1: Set ANTHROPIC_API_KEY environment variable"
    echo "  Option 2: Run 'claude login' interactively"
  fi
fi

# Step 5: Clone or pull all repos from repos.conf
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

# Step 6: Resolve build schedule
BUILD_SCHEDULE="${BUILD_SCHEDULE:-daily}"
case "$BUILD_SCHEDULE" in
  daily|"")
    CRON_EXPR="0 5 * * *"
    SCHEDULE_LABEL="daily at 5 AM"
    ;;
  twice-daily)
    CRON_EXPR="0 5,17 * * *"
    SCHEDULE_LABEL="twice daily at 5 AM and 5 PM"
    ;;
  every-6h)
    CRON_EXPR="0 */6 * * *"
    SCHEDULE_LABEL="every 6 hours"
    ;;
  hourly)
    CRON_EXPR="0 * * * *"
    SCHEDULE_LABEL="every hour"
    ;;
  *)
    CRON_EXPR="$BUILD_SCHEDULE"
    SCHEDULE_LABEL="custom ($CRON_EXPR)"
    ;;
esac

# Step 7: Install cron job
echo "$CRON_EXPR /app/daily-build.sh >> /app/logs/cron.log 2>&1" | crontab -
echo "Cron job installed: $CRON_EXPR ($SCHEDULE_LABEL)"

# Step 8: Check for manual trigger
if [ "${1:-}" = "--run-now" ]; then
  echo "Manual trigger detected, running build now..."
  exec /app/daily-build.sh
fi

# Step 9: Start dashboard
echo "Starting dashboard on port 8080..."
node /app/dashboard.js &

# Step 10: Start cron in foreground (keeps container alive)
echo "Starting cron daemon in foreground..."
echo "Container ready. Next build: $SCHEDULE_LABEL."
cron -f
