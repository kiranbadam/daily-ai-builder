<div align="center">

<img src="brochure/public/logo.svg" alt="RoboDevLoop" width="80" />

# RoboDevLoop

**Your repos drive themselves.**

The autonomous dev loop that analyzes, builds, tests, and ships features to your repos — every single day.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

</div>

---

## One command. That's it.

```bash
npx robodevloop
```

The interactive wizard configures everything — repos, auth, schedule, deploy target — in 60 seconds.

---

## How It Works

RoboDevLoop runs a 5-phase autonomous pipeline on each of your repos:

| Phase | What Happens |
|-------|-------------|
| **1. Ideate** | AI studies your repo and dreams up the highest-impact feature to build next. |
| **2. Analyze** | Turns the idea into a detailed implementation plan with files, steps, and acceptance criteria. |
| **3. Build** | Claude implements the feature with full coding tools — TypeScript, real data, responsive layouts. |
| **4. Verify & Test** | `npm run build` with 3 retries. AI tester runs Playwright visual tests. Up to 2 fix rounds. |
| **5. Ship** | Commits and pushes to main (or opens a PR). Sends webhook notification with full build report. |

The loop runs on your schedule — daily, twice daily, every 6 hours, or any custom cron expression.

---

## Quick Start

### Option 1: Interactive Wizard (Recommended)

```bash
npx robodevloop
```

### Option 2: Manual Setup

1. Clone the repo:
   ```bash
   git clone https://github.com/kiranbadam/daily-ai-builder.git
   cd daily-ai-builder
   ```

2. Copy and edit the config:
   ```bash
   cp .env.example .env
   # Edit .env with your GitHub token, auth mode, schedule, etc.
   ```

3. Add your repos:
   ```bash
   echo "yourname/your-app" >> repos.conf
   ```

4. Deploy:
   ```bash
   # Local
   docker compose up -d

   # Remote server
   ./deploy.sh myserver.local ubuntu
   ```

---

## Configuration

All configuration lives in `.env`. See [`.env.example`](.env.example) for the full template.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GITHUB_TOKEN` | Yes | — | GitHub Personal Access Token |
| `GIT_USER_NAME` | Yes | — | Git commit author name |
| `GIT_USER_EMAIL` | Yes | — | Git commit author email |
| `ANTHROPIC_API_KEY` | No | — | Anthropic API key (alternative to Claude Max login) |
| `SHIP_MODE` | No | `push` | `push` = direct to main, `pr` = open pull requests |
| `BUILD_SCHEDULE` | No | `daily` | `daily`, `twice-daily`, `every-6h`, `hourly`, or cron expression |
| `WEBHOOK_URL` | No | — | Slack/Discord webhook for build notifications |
| `DEPLOY_HOST` | No | — | Remote server hostname (for `deploy.sh`) |
| `DEPLOY_USER` | No | — | Remote server SSH user (for `deploy.sh`) |

### Ship Mode

Choose how RoboDevLoop delivers code:

- **`push`** (default) — Commits and pushes directly to `main`. Fast, zero friction. Best for personal projects.
- **`pr`** — Creates a feature branch and opens a pull request. Best for team repos or when you want to review before merging.

### Build Schedule

| Preset | Cron | When |
|--------|------|------|
| `daily` | `0 5 * * *` | 5:00 AM Pacific |
| `twice-daily` | `0 5,17 * * *` | 5:00 AM + 5:00 PM Pacific |
| `every-6h` | `0 */6 * * *` | Every 6 hours |
| `hourly` | `0 * * * *` | Every hour |
| Custom | Any cron expr | e.g., `30 3 * * 1-5` for 3:30 AM weekdays |

### Auth Modes

- **Claude Max** — Uses your Claude Max subscription (no per-request API costs). Requires one-time `claude login` inside the container.
- **API Key** — Set `ANTHROPIC_API_KEY` in `.env`. No interactive login needed. Uses API credits.

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Docker Container                │
│                                                  │
│  ┌──────────┐    ┌───────────┐    ┌──────────┐  │
│  │  Cron    │───▶│  daily-   │───▶│  build-  │  │
│  │ Scheduler│    │  build.sh │    │  repo.sh │  │
│  └──────────┘    └───────────┘    └──────────┘  │
│                                        │         │
│                    ┌───────────────────┐│         │
│                    │  5-Phase Pipeline ││         │
│                    │                   ││         │
│                    │  1. Ideate   ─────┘│         │
│                    │  2. Analyze        │         │
│                    │  3. Build          │         │
│                    │  4. Verify & Test  │         │
│                    │  5. Ship           │         │
│                    └───────────────────┘│         │
│                                        │         │
│  ┌──────────┐    ┌───────────┐    ┌──────────┐  │
│  │ Dashboard│    │   State   │    │  Webhook │  │
│  │ :8080    │    │ per-repo  │    │  Notify  │  │
│  └──────────┘    └───────────┘    └──────────┘  │
└─────────────────────────────────────────────────┘
```

---

## Monitoring

### Dashboard

Access the live dashboard at `http://your-host:8080`. It shows:
- Repo status cards (current day, last feature)
- Live log streaming via SSE
- Build history

### Webhooks

Configure `WEBHOOK_URL` for Slack/Discord notifications. Each build report includes:
- Feature name and description
- Files changed and commit hash
- Build attempts and test results
- Link to the commit or PR

### Manual Trigger

```bash
docker exec daily-ai-builder /app/daily-build.sh
```

Or restart with immediate build:

```bash
docker compose up -d --build -- --run-now
```

---

## Project Structure

```
daily-ai-builder/
├── cli/                  # npx robodevloop setup wizard
├── brochure/             # Landing page (Next.js)
├── prompts/              # AI prompt templates
│   ├── analyze.md        # Phase 1: Feature planning
│   ├── build-feature.md  # Phase 2: Implementation
│   └── test-review.md    # Phase 3: AI tester
├── scripts/              # Helper scripts
├── entrypoint.sh         # Container startup
├── daily-build.sh        # Multi-repo orchestrator
├── build-repo.sh         # Single repo pipeline
├── test-repo.sh          # AI tester
├── deploy.sh             # Remote deployment
├── dashboard.js          # Live monitoring UI
├── docker-compose.yml    # Container config
├── Dockerfile            # Container image
├── repos.conf            # Repo list
├── .env.example          # Config template
└── LICENSE               # MIT
```

---

## FAQ

**Does it use API credits?**
Supports both Claude Max (no per-request costs) and Anthropic API keys. Choose during setup.

**What if a build fails?**
The builder retries up to 3 times, with Claude fixing errors between attempts. If all 3 fail, changes are reverted and you get notified. Other repos continue unaffected.

**Can I add repos later?**
Yes — edit `repos.conf` and restart the container. Each new repo starts at Day 1.

**Push or PR?**
Set `SHIP_MODE=push` for direct push to main, or `SHIP_MODE=pr` to open pull requests for review.

---

## License

[MIT](LICENSE) — Kiran Badam
