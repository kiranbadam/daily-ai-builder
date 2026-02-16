# Autonomous Daily AI Builder

An autonomous system that uses Claude Code CLI to analyze your GitHub repos, decide on the best next feature for each, implement it, and push — every day at 5 AM Pacific. Supports multiple repos in a single container.

```
┌─────────────────────────────────────────────────────────────────┐
│                     Remote Server (Ubuntu)                       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Docker Container                      │    │
│  │                                                         │    │
│  │  Cron (5 AM PT)                    Dashboard (:8080)    │    │
│  │       │                                                 │    │
│  │       ▼                                                 │    │
│  │  daily-build.sh ──► repos.conf                          │    │
│  │       │                                                 │    │
│  │       ├──► build-repo.sh (repo 1)                       │    │
│  │       ├──► build-repo.sh (repo 2)                       │    │
│  │       └──► build-repo.sh (repo N)                       │    │
│  │                 │                                       │    │
│  │                 ├─► Phase 1: Analyze (read-only)        │    │
│  │                 ├─► Phase 2: Build Feature               │    │
│  │                 ├─► Phase 3: Verify (3 retries)         │    │
│  │                 └─► Phase 4: Commit & Push              │    │
│  │                          │                              │    │
│  └──────────────────────────┼──────────────────────────────┘    │
│                              │                                  │
└──────────────────────────────┼──────────────────────────────────┘
                               │
                               ▼
                        GitHub (main branch)
                               │
                               ▼
                        Vercel (auto-deploy)
```

## Prerequisites

- An always-on Ubuntu server (e.g., DGX Spark, VPS, home server)
- Docker and Docker Compose on the server
- Claude Max plan ($100/month) — no API key needed
- GitHub personal access token (with `repo` scope)
- (Optional) Slack webhook URL for daily build notifications
- (Optional) Vercel connected to your repos for auto-deploy

## Quick Start

### 1. Configure

```bash
cp .env.example .env
```

Edit `.env`:
```bash
# Required — GitHub personal access token with repo scope
# Get one at: Settings → Developer settings → Personal access tokens → Fine-grained tokens
GITHUB_TOKEN=ghp_xxxxx

# Optional — Slack webhook for notifications
WEBHOOK_URL=https://hooks.slack.com/services/...

# Remote server connection (used by deploy.sh)
DEPLOY_HOST=192.168.1.100   # IP or hostname of your server
DEPLOY_USER=ubuntu           # SSH username
```

### 2. Configure repos

Edit `repos.conf` — one repo per line in `owner/repo` format:
```
# Lines starting with # are ignored
yourname/my-app
yourname/another-project
```

### 3. Deploy to server

```bash
./deploy.sh
```

You'll be prompted for your SSH password 3 times:
1. **Copy files** — sends all project files to `~/daily-ai-builder/` on the server
2. **Build & start** — builds the Docker image and starts the container
3. **Claude login** — opens an interactive shell inside the container

In the interactive shell, run:
```bash
claude login
```
This shows a URL — copy it to any browser, log in with your Anthropic account, and paste the code back. This is a one-time setup. Auth persists in a Docker volume across container restarts.

### 4. Walk away

The container runs autonomously. Every day at 5 AM Pacific, it builds the next feature for each repo. No human interaction required.

## Live Dashboard

Access the build dashboard at:
```
http://YOUR_SERVER:8080
```

The dashboard shows:
- Status cards for each repo (current day, last feature built)
- Live log streaming during builds (real-time via SSE)
- Log file selector for viewing previous days' builds

## Managing Repos

### Adding a repo

**Option A: Edit locally and redeploy**
```bash
# On your laptop, edit repos.conf
echo "yourname/new-repo" >> repos.conf

# Copy to server (will prompt for SSH password)
scp repos.conf $DEPLOY_USER@$DEPLOY_HOST:~/daily-ai-builder/repos.conf
```

**Option B: Edit directly on the server**
```bash
ssh $DEPLOY_USER@$DEPLOY_HOST

# Edit inside the container
docker exec -it daily-ai-builder bash -c 'echo "yourname/new-repo" >> /app/repos.conf'

# Restart to pick up changes
cd ~/daily-ai-builder && docker compose restart
```

The new repo will be cloned automatically on the next build. No redeployment needed.

### Removing a repo

Same as above — edit `repos.conf` and remove the line. Existing state (day counter, changelog) is preserved in case you re-add it later.

### Checking repo status

```bash
ssh $DEPLOY_USER@$DEPLOY_HOST 'docker exec daily-ai-builder cat /app/state/yourname-repo/day.txt'
```

## Manual Trigger

Run a build immediately (for all repos):
```bash
ssh $DEPLOY_USER@$DEPLOY_HOST 'docker exec daily-ai-builder /app/daily-build.sh'
```

Or use the helper script:
```bash
./scripts/manual-run.sh
```

## Monitoring

### Live dashboard
```
http://YOUR_SERVER:8080
```

### View today's log
```bash
./scripts/view-logs.sh
```

### View a specific day's log
```bash
./scripts/view-logs.sh 2026-02-14
```

### Container status
```bash
ssh $DEPLOY_USER@$DEPLOY_HOST 'cd ~/daily-ai-builder && docker compose ps'
```

## How It Works

Each day, the system reads `repos.conf` and builds each repo sequentially:

1. **Analysis** — Claude reads the repo (read-only), identifies gaps and opportunities, and picks the single highest-impact feature. Writes a detailed plan to `/app/state/{repo}/next-feature.md`. Includes retry logic if the plan isn't produced on the first attempt.

2. **Build** — Claude implements the feature following the project's existing patterns, design system, and coding standards. Full tool access (Bash, Read, Edit, Write, etc.) with up to 80 turns.

3. **Verify** — Runs `npm run build`. If it fails, Claude gets up to 3 attempts to fix the errors. If all fail, changes are reverted and the next repo is attempted.

4. **Commit & Push** — Commits with message `Day N: Feature Name` and pushes to main. Vercel auto-deploys. Push retries 3 times on transient network failures.

State is isolated per repo — each has its own day counter, changelog, and project directory.

## Authentication

This system uses the **Claude Max plan** ($100/month), not API credits. You authenticate once via `claude login` during deployment. Auth is stored in a Docker volume (`ai-builder-claude-auth`) and persists across container restarts.

If auth expires, re-authenticate:
```bash
ssh $DEPLOY_USER@$DEPLOY_HOST 'docker exec -it daily-ai-builder claude login'
```

## Change Schedule

The cron schedule is set in `entrypoint.sh`. Default: `0 5 * * *` (5 AM Pacific daily).

To change, edit the cron line in `entrypoint.sh` and redeploy:
```bash
./deploy.sh
```

## Reset State

Start a specific repo over from Day 1:
```bash
ssh $DEPLOY_USER@$DEPLOY_HOST 'docker exec daily-ai-builder bash -c "echo 1 > /app/state/yourname-repo/day.txt && rm -f /app/state/yourname-repo/changelog.md"'
```

Or reset all repos:
```bash
./scripts/reset-state.sh
```

## Troubleshooting

### Container won't start
```bash
ssh $DEPLOY_USER@$DEPLOY_HOST 'cd ~/daily-ai-builder && docker compose logs'
```

### Build keeps failing
Check the log for the specific day. The system automatically reverts on failure and continues to the next repo. You can reset state and retry:
```bash
./scripts/reset-state.sh
./scripts/manual-run.sh
```

### Claude auth expired
```bash
ssh $DEPLOY_USER@$DEPLOY_HOST 'docker exec -it daily-ai-builder claude login'
```

### GitHub push failures
Verify your `GITHUB_TOKEN` has `repo` scope and hasn't expired. Generate a new one at Settings > Developer settings > Personal access tokens.

### Vercel deploy check fails
Make sure the git commit author email matches a GitHub account connected to Vercel. The email is set in `entrypoint.sh` (`git config --global user.email`).

## File Structure

```
daily-ai-builder/
├── .env.example          # Template for environment variables
├── .env                  # Your actual config (git-ignored)
├── repos.conf            # List of repos to build (owner/repo per line)
├── Dockerfile            # Container image definition
├── docker-compose.yml    # Container orchestration (4 volumes, port 8080)
├── entrypoint.sh         # Container bootstrap (env, auth, cron, dashboard)
├── daily-build.sh        # Multi-repo orchestrator
├── build-repo.sh         # Single-repo builder (hardened, with retries)
├── dashboard.js          # Live web dashboard (SSE log streaming)
├── deploy.sh             # SSH deployment to remote server
├── prompts/
│   ├── analyze.md        # Analysis phase prompt template
│   └── build-feature.md  # Build phase prompt template
├── scripts/
│   ├── manual-run.sh     # Trigger a build manually
│   ├── view-logs.sh      # Tail today's log
│   └── reset-state.sh    # Reset day counter and changelog
└── README.md             # This file
```

## Docker Volumes

| Volume | Path | Purpose |
|--------|------|---------|
| `ai-builder-state` | `/app/state/` | Day counters, changelogs, feature plans per repo |
| `ai-builder-logs` | `/app/logs/` | Daily build logs |
| `ai-builder-projects` | `/app/projects/` | Cloned repo working directories |
| `ai-builder-claude-auth` | `/root/.claude/` | Claude Max plan OAuth session |
