#!/bin/bash
set -euo pipefail

# ============================================
# Deploy AI Builder to remote server via SSH
# Uses password prompt — 2-3 password entries needed
# ============================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load config from .env if it exists
if [ -f "$SCRIPT_DIR/.env" ]; then
  DEPLOY_HOST=$(grep '^DEPLOY_HOST=' "$SCRIPT_DIR/.env" | cut -d'=' -f2 || true)
  DEPLOY_USER=$(grep '^DEPLOY_USER=' "$SCRIPT_DIR/.env" | cut -d'=' -f2 || true)
  HAS_API_KEY=$(grep '^ANTHROPIC_API_KEY=' "$SCRIPT_DIR/.env" | cut -d'=' -f2 || true)
fi

# Allow overrides via args
DEPLOY_HOST="${1:-${DEPLOY_HOST:-}}"
DEPLOY_USER="${2:-${DEPLOY_USER:-}}"

if [ -z "$DEPLOY_HOST" ] || [ -z "$DEPLOY_USER" ]; then
  echo "Usage: ./deploy.sh [DEPLOY_HOST] [DEPLOY_USER]"
  echo ""
  echo "Or set DEPLOY_HOST and DEPLOY_USER in your .env file."
  echo ""
  echo "Example: ./deploy.sh 192.168.1.100 ubuntu"
  exit 1
fi

REMOTE_DIR="daily-ai-builder"

echo "============================================"
echo "Deploying AI Builder"
echo "============================================"
echo "Host: $DEPLOY_HOST"
echo "User: $DEPLOY_USER"
echo "Remote dir: ~/$REMOTE_DIR"
echo ""
if [ -n "${HAS_API_KEY:-}" ]; then
  echo "You will be prompted for your SSH password 2 times."
  echo "  1) To copy files"
  echo "  2) To build and start the container"
else
  echo "You will be prompted for your SSH password 3 times."
  echo "  1) To copy files"
  echo "  2) To build and start the container"
  echo "  3) To log into Claude (one-time, inside the container)"
fi
echo ""

# Step 1: Bundle all files and send in one shot via tar pipe
echo ">>> Step 1: Copying all project files (password prompt 1 of 3)..."
tar -cf - \
  -C "$SCRIPT_DIR" \
  Dockerfile \
  docker-compose.yml \
  entrypoint.sh \
  daily-build.sh \
  build-repo.sh \
  test-repo.sh \
  repos.conf \
  dashboard.js \
  .env \
  README.md \
  prompts/analyze.md \
  prompts/build-feature.md \
  prompts/test-review.md \
  scripts/manual-run.sh \
  scripts/view-logs.sh \
  scripts/reset-state.sh \
| ssh "$DEPLOY_USER@$DEPLOY_HOST" "mkdir -p ~/$REMOTE_DIR && tar -xf - -C ~/$REMOTE_DIR"

echo "Files copied."

# Step 2: Set permissions, build image, start container
echo ""
echo ">>> Step 2: Building and starting Docker container (password prompt 2 of 3)..."
ssh "$DEPLOY_USER@$DEPLOY_HOST" "cd ~/$REMOTE_DIR && chmod +x *.sh scripts/*.sh && docker compose up -d --build"

# Step 3: Claude login inside the container
echo ""
if [ -n "${HAS_API_KEY:-}" ]; then
  echo ">>> Step 3: Skipping Claude Code login — ANTHROPIC_API_KEY is set in .env"
else
  echo ">>> Step 3: Claude Code login (password prompt 3 of 3)..."
  echo ""
  echo "This will open an interactive session inside the container."
  echo "Run 'claude login' and follow the prompts to authenticate."
  echo "Once done, type 'exit' to return."
  echo ""
  ssh -t "$DEPLOY_USER@$DEPLOY_HOST" "cd ~/$REMOTE_DIR && docker compose exec -it ai-builder bash -c 'echo \"Run: claude login\" && echo \"Then type: exit\" && echo \"\" && bash'"
fi

echo ""
echo "============================================"
echo "Deployment complete!"
echo "============================================"
echo ""
echo "The container is now running on $DEPLOY_HOST."
echo "It will build autonomously every day at 5:00 AM Pacific."
echo "No human interaction required — it runs on its own."
echo ""
echo "Dashboard: http://$DEPLOY_HOST:8080"
echo ""
echo "Claude auth is stored in a Docker volume and persists across restarts."
echo "If auth expires, SSH in and run:"
echo "  ssh $DEPLOY_USER@$DEPLOY_HOST 'docker exec -it daily-ai-builder claude login'"
echo ""
echo "Other remote commands (each will prompt for password):"
echo "  Manual build:  ssh $DEPLOY_USER@$DEPLOY_HOST 'docker exec daily-ai-builder /app/daily-build.sh'"
echo "  View logs:     ssh $DEPLOY_USER@$DEPLOY_HOST 'docker exec daily-ai-builder tail -100 /app/logs/\$(date +%Y-%m-%d).log'"
echo "  Stop:          ssh $DEPLOY_USER@$DEPLOY_HOST 'cd ~/daily-ai-builder && docker compose down'"
