#!/bin/bash
set -euo pipefail

# ============================================
# Daily AI Builder — Single Repo Build (Hardened)
# Usage: build-repo.sh owner/repo
# ============================================

GITHUB_REPO="$1"
REPO_SLUG=$(echo "$GITHUB_REPO" | tr '/' '-')

# Directories scoped per repo
STATE_DIR="/app/state/$REPO_SLUG"
PROJECT_DIR="/app/projects/$REPO_SLUG"
FEATURE_FILE="$STATE_DIR/next-feature.md"

mkdir -p "$STATE_DIR" "$PROJECT_DIR"

# Export for use in prompts and notifications
export GITHUB_REPO

# --- Notify functions ---
notify_success() {
  local feature="$1"
  local files_changed="$2"
  local build_attempts="$3"
  if [ -n "${WEBHOOK_URL:-}" ]; then
    local feature_plan
    feature_plan=$(cat "$FEATURE_FILE" 2>/dev/null | head -50)
    local commit_hash
    commit_hash=$(cd "$PROJECT_DIR" && git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    local repo_url="https://github.com/$GITHUB_REPO"

    curl -s -X POST "$WEBHOOK_URL" \
      -H "Content-Type: application/json" \
      -d "$(jq -n \
        --arg day "$DAY" \
        --arg date "$(date '+%Y-%m-%d')" \
        --arg feature "$feature" \
        --arg files "$files_changed" \
        --arg attempts "$build_attempts" \
        --arg hash "$commit_hash" \
        --arg repo "$GITHUB_REPO" \
        --arg repo_url "$repo_url" \
        --arg plan "$feature_plan" \
        '{
          blocks: [
            {type:"header", text:{type:"plain_text", text:("🚀 AI Builder — Day " + $day + " Complete"), emoji:true}},
            {type:"section", text:{type:"mrkdwn", text:("*Repo:* " + $repo + "\n*Feature:* " + $feature)}},
            {type:"section", fields:[
              {type:"mrkdwn", text:("*📅 Date:*\n" + $date)},
              {type:"mrkdwn", text:("*📦 Commit:*\n<" + $repo_url + "/commit/" + $hash + "|" + $hash + ">")},
              {type:"mrkdwn", text:("*📁 Files Changed:*\n" + $files)},
              {type:"mrkdwn", text:("*🔨 Build Attempts:*\n" + $attempts + "/3")}
            ]},
            {type:"section", text:{type:"mrkdwn", text:("*What was built:*\n```" + ($plan | .[0:1500]) + "```")}},
            {type:"section", text:{type:"mrkdwn", text:("*✅ Verification:*\n• `npm run build` passed\n• Pushed to <" + $repo_url + "|" + $repo + "> main branch\n• Vercel auto-deploy triggered")}},
            {type:"divider"},
            {type:"context", elements:[{type:"mrkdwn", text:("Next build: tomorrow at 5:00 AM Pacific (Day " + (($day | tonumber) + 1 | tostring) + ")")}]}
          ]
        }')" || true
  fi
}

notify_failure() {
  local message="$1"
  if [ -n "${WEBHOOK_URL:-}" ]; then
    curl -s -X POST "$WEBHOOK_URL" \
      -H "Content-Type: application/json" \
      -d "$(jq -n \
        --arg day "$DAY" \
        --arg date "$(date '+%Y-%m-%d')" \
        --arg msg "$message" \
        --arg repo "$GITHUB_REPO" \
        '{
          blocks: [
            {type:"header", text:{type:"plain_text", text:("❌ AI Builder — Day " + $day + " Failed"), emoji:true}},
            {type:"section", text:{type:"mrkdwn", text:("*Repo:* " + $repo + "\n*Error:* " + $msg)}},
            {type:"section", fields:[
              {type:"mrkdwn", text:("*📅 Date:*\n" + $date)},
              {type:"mrkdwn", text:("*📦 Repo:*\n" + $repo)}
            ]},
            {type:"context", elements:[{type:"mrkdwn", text:"No changes were pushed. The build will retry tomorrow at 5:00 AM Pacific."}]}
          ]
        }')" || true
  fi
}

# --- Helper: find feature plan wherever Claude may have written it ---
recover_feature_plan() {
  # Already in the right place
  if [ -f "$FEATURE_FILE" ]; then
    return 0
  fi

  # Search common places Claude might write it
  local candidates=(
    "$PROJECT_DIR/next-feature.md"
    "$PROJECT_DIR/state/next-feature.md"
    "/app/state/next-feature.md"
    "/tmp/next-feature.md"
  )

  for candidate in "${candidates[@]}"; do
    if [ -f "$candidate" ]; then
      echo "RECOVERY: Found feature plan at $candidate — copying to $FEATURE_FILE"
      cp "$candidate" "$FEATURE_FILE"
      rm -f "$candidate"
      return 0
    fi
  done

  return 1
}

# --- Read state ---
DAY=$(cat "$STATE_DIR/day.txt" 2>/dev/null || echo "1")
CHANGELOG=$(cat "$STATE_DIR/changelog.md" 2>/dev/null || echo "None yet")
echo "Repo: $GITHUB_REPO | Day: $DAY"

# --- Clone or pull ---
if [ ! -d "$PROJECT_DIR/.git" ]; then
  echo "Cloning $GITHUB_REPO..."
  gh repo clone "$GITHUB_REPO" "$PROJECT_DIR"
else
  cd "$PROJECT_DIR"
  git fetch origin
  git reset --hard origin/main
fi
echo "Repo synced to origin/main"

cd "$PROJECT_DIR"

# --- Clean stale state ---
rm -f "$FEATURE_FILE"
rm -f "$PROJECT_DIR/next-feature.md"

# --- Phase 1: Analysis (with retry) ---
echo ""
echo ">>> Phase 1: Analysis [$GITHUB_REPO]"
echo "--------------------------------------------"

export DAY_NUMBER="$DAY"
export FEATURE_PLAN_PATH="$FEATURE_FILE"
export GIT_LOG="$(git log --oneline -30 2>/dev/null || echo 'No commits yet')"
export FILE_TREE="$(find . -type f -not -path './.git/*' -not -path './node_modules/*' | head -200 | sort)"
export README_CONTENT="$(cat README.md 2>/dev/null || echo 'No README')"
export CHANGELOG_CONTENT="$CHANGELOG"

ANALYSIS_PROMPT=$(envsubst '${GITHUB_REPO} ${DAY_NUMBER} ${FEATURE_PLAN_PATH} ${GIT_LOG} ${FILE_TREE} ${README_CONTENT} ${CHANGELOG_CONTENT}' < /app/prompts/analyze.md)

ANALYSIS_OK=false
for analysis_attempt in 1 2; do
  echo "Analysis attempt $analysis_attempt..."
  claude -p "$ANALYSIS_PROMPT" \
    --allowedTools "Bash(read-only),Read,Glob,Grep,Write" \
    --max-turns 40 || true

  if recover_feature_plan; then
    ANALYSIS_OK=true
    break
  fi

  if [ "$analysis_attempt" -eq 1 ]; then
    echo "Feature plan not found. Retrying with explicit instruction..."
    ANALYSIS_PROMPT="You MUST write a feature plan to the file $FEATURE_FILE using the Write tool. This is critical. $ANALYSIS_PROMPT"
  fi
done

if [ "$ANALYSIS_OK" = false ]; then
  echo "ERROR: Analysis failed after 2 attempts — no feature plan produced"
  notify_failure "Analysis failed after 2 attempts on Day $DAY"
  exit 1
fi

echo "Analysis complete. Feature plan:"
cat "$FEATURE_FILE"
echo ""

# --- Phase 2: Build ---
echo ""
echo ">>> Phase 2: Build [$GITHUB_REPO]"
echo "--------------------------------------------"

FEATURE_PLAN=$(cat "$FEATURE_FILE")
export FEATURE_PLAN

BUILD_PROMPT=$(envsubst '${FEATURE_PLAN}' < /app/prompts/build-feature.md)

echo "Running Claude build..."
claude -p "$BUILD_PROMPT" \
  --allowedTools "Bash,Read,Glob,Grep,Edit,Write" \
  --max-turns 80

echo "Build phase complete."

# --- Phase 3: Verify with retries ---
echo ""
echo ">>> Phase 3: Verify [$GITHUB_REPO]"
echo "--------------------------------------------"

# Clean stale build locks
rm -f "$PROJECT_DIR/.next/lock"

BUILD_SUCCESS=false
BUILD_ATTEMPTS=0
for attempt in 1 2 3; do
  BUILD_ATTEMPTS=$attempt
  echo "Build attempt $attempt..."

  # Clean lock before each attempt
  rm -f "$PROJECT_DIR/.next/lock"

  if npm run build 2>/tmp/build-error.log; then
    BUILD_SUCCESS=true
    echo "Build succeeded on attempt $attempt!"
    break
  fi
  BUILD_ERROR=$(cat /tmp/build-error.log)
  echo "Build failed (attempt $attempt). Asking Claude to fix..."
  claude -p "The build failed with these errors. Fix them:\n\n$BUILD_ERROR" \
    --allowedTools "Bash,Read,Glob,Grep,Edit,Write" \
    --max-turns 20
done

if [ "$BUILD_SUCCESS" = false ]; then
  echo "FAILED: All 3 build attempts failed. Reverting."
  git checkout .
  notify_failure "Build failed after 3 attempts on Day $DAY"
  exit 1
fi

# --- Phase 4: Commit & Push ---
echo ""
echo ">>> Phase 4: Commit & Push [$GITHUB_REPO]"
echo "--------------------------------------------"

FEATURE_SUMMARY=$(head -1 "$FEATURE_FILE" | sed 's/^#* *//' | sed 's/^Next Feature: //')

# Check if there are actual changes to commit
if git diff --quiet HEAD && [ -z "$(git ls-files --others --exclude-standard)" ]; then
  echo "WARNING: No changes detected after build. Skipping commit."
  notify_failure "Build produced no changes on Day $DAY"
  exit 1
fi

FILES_CHANGED=$(git diff --stat | tail -1 | sed 's/^ *//')
git add -A
git commit -m "Day $DAY: $FEATURE_SUMMARY"

# Push with retry (in case of transient network issues)
PUSH_OK=false
for push_attempt in 1 2 3; do
  if git push origin main 2>/tmp/push-error.log; then
    PUSH_OK=true
    break
  fi
  echo "Push failed (attempt $push_attempt), retrying in 5s..."
  sleep 5
done

if [ "$PUSH_OK" = false ]; then
  echo "FAILED: Could not push after 3 attempts."
  PUSH_ERROR=$(cat /tmp/push-error.log)
  echo "$PUSH_ERROR"
  notify_failure "Push failed after 3 attempts on Day $DAY: $PUSH_ERROR"
  exit 1
fi

echo "Pushed to origin/main"

# --- Update state ---
echo $((DAY + 1)) > "$STATE_DIR/day.txt"
echo -e "\n## Day $DAY — $(date '+%Y-%m-%d')\n$FEATURE_SUMMARY\n" >> "$STATE_DIR/changelog.md"
echo "State updated. Next run will be Day $((DAY + 1))."

# --- Notify ---
notify_success "$FEATURE_SUMMARY" "$FILES_CHANGED" "$BUILD_ATTEMPTS"

echo ""
echo "============================================"
echo "Build Complete — $GITHUB_REPO — Day $DAY"
echo "Feature: $FEATURE_SUMMARY"
echo "============================================"
