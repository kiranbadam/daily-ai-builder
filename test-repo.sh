#!/bin/bash
set -euo pipefail

# ============================================
# AI Tester — Per-Repo Test & Review (Local Only)
# Uses Claude Code CLI to review uncommitted changes,
# run tests, and identify bugs.
# Writes AI_BUILDER_FEEDBACK.md locally if issues found.
# Does NOT commit or push — caller handles that.
# Usage: test-repo.sh owner/repo
# ============================================

GITHUB_REPO="$1"
REPO_SLUG=$(echo "$GITHUB_REPO" | tr '/' '-')
PROJECT_DIR="/app/projects/$REPO_SLUG"
STATE_DIR="/app/state/$REPO_SLUG"

cd "$PROJECT_DIR"

# Clean any previous feedback
rm -f "$PROJECT_DIR/AI_BUILDER_FEEDBACK.md"

# Gather context about uncommitted changes (not yet committed)
UNCOMMITTED_DIFF=$(git diff HEAD --stat 2>/dev/null || echo "No changes")
CHANGED_FILES=$(git diff HEAD --name-only 2>/dev/null || echo "")
UNTRACKED_FILES=$(git ls-files --others --exclude-standard 2>/dev/null || echo "")
CHANGELOG=$(cat "$STATE_DIR/changelog.md" 2>/dev/null || echo "None")
FEATURE_PLAN=$(cat "$STATE_DIR/next-feature.md" 2>/dev/null || echo "Unknown")

# Combine changed + untracked for full picture
ALL_CHANGED_FILES="${CHANGED_FILES}"
if [ -n "$UNTRACKED_FILES" ]; then
  ALL_CHANGED_FILES="${ALL_CHANGED_FILES}
${UNTRACKED_FILES}"
fi

# Build test prompt
export GITHUB_REPO UNCOMMITTED_DIFF CHANGED_FILES ALL_CHANGED_FILES CHANGELOG FEATURE_PLAN
TEST_PROMPT=$(envsubst '${GITHUB_REPO} ${UNCOMMITTED_DIFF} ${ALL_CHANGED_FILES} ${CHANGELOG} ${FEATURE_PLAN}' < /app/prompts/test-review.md)

echo "Running AI Tester (Claude) on $GITHUB_REPO..."
claude -p "$TEST_PROMPT" \
  --allowedTools "Bash,Read,Glob,Grep,Edit,Write" \
  --max-turns 40 || true

# Report result (caller checks for the file)
if [ -f "$PROJECT_DIR/AI_BUILDER_FEEDBACK.md" ]; then
  echo "AI Tester found issues — feedback written to AI_BUILDER_FEEDBACK.md"
  exit 0
else
  echo "AI Tester found no issues — all clear."
  exit 0
fi
