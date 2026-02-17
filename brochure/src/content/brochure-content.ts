export const brand = {
  name: "RoboDevLoop",
  tagline: "Ship While You Sleep",
  subhead: "An autonomous agent that {dreams} up features, builds them, tests them, and ships them to your repos — while you sleep.",
  eyebrow: "// autonomous coding engaged",
  ctaPrimary: { label: "Get Started", href: "#one-command" },
  ctaSecondary: { label: "See How It Works", href: "#how-it-works" },
  ctaGithub: { label: "Star on GitHub", href: "https://github.com/kiranbadam/daily-ai-builder" },
};

export const stats = [
  { value: "5-Phase", label: "Pipeline", description: "Ideate \u2192 Analyze \u2192 Build \u2192 Verify \u2192 Ship" },
  { value: "3x", label: "Build Recovery", description: "Self-healing with automatic retries" },
  { value: "AI-Powered", label: "QA", description: "Automated test and fix loop" },
  { value: "Zero", label: "Daily Effort", description: "Wake up to shipped features" },
];

export const pipeline = [
  {
    phase: "01",
    title: "Ideate",
    summary: "AI studies your repo and {dreams} up the highest-impact feature to build next.",
    details: "Reads git history, file tree, README, changelog, and owner feedback. Weighs gaps, user needs, and momentum. Picks ONE idea that moves the needle most.",
    icon: "\uD83D\uDCA1",
  },
  {
    phase: "02",
    title: "Analyze",
    summary: "Turns the idea into a detailed implementation plan with files, steps, and acceptance criteria.",
    details: "Maps out exactly which files to create or modify, implementation details, edge cases, and what 'done' looks like. No ambiguity — a blueprint Claude can execute.",
    icon: "\uD83D\uDD0D",
  },
  {
    phase: "03",
    title: "Build",
    summary: "Claude implements the feature with full coding tools \u2014 edit, write, test, iterate.",
    details: "Uses TypeScript, matches your design system, handles responsive layouts, wires real data. No mock data, no TODOs, no placeholders.",
    icon: "\uD83D\uDD28",
  },
  {
    phase: "04",
    title: "Verify & Test",
    summary: "Automated build checks + AI tester reviews every change before shipping.",
    details: "npm run build with 3 retries. AI Tester runs Playwright visual tests on every route. Checks for overflow, empty sections, dead UI. Up to 2 fix rounds.",
    icon: "\uD83E\uDDEA",
  },
  {
    phase: "05",
    title: "Ship",
    summary: "Commits, pushes to main (or opens a PR), and notifies your team via webhook.",
    details: "Atomic commits with descriptive messages. Push with network retry. Slack notifications with full build report. Vercel auto-deploy ready.",
    icon: "\uD83D\uDE80",
  },
];

export const features = [
  {
    title: "Multi-Repo Orchestration",
    description: "Configure multiple repos in repos.conf. Each gets its own isolated state, day counter, and changelog.",
    icon: "\uD83D\uDCE6",
  },
  {
    title: "Daily Automated Scheduling",
    description: "Configurable cron schedule \u2014 daily, twice daily, every 6 hours, or any custom cron expression.",
    icon: "\u23F0",
  },
  {
    title: "Self-Healing Builds",
    description: "Build fails? Claude reads the error and fixes it. Up to 3 automatic retries before giving up.",
    icon: "\uD83D\uDD04",
  },
  {
    title: "AI Tester Feedback Loop",
    description: "An AI tester reviews code quality, runs Playwright tests, catches visual bugs, and feeds fixes back to the builder.",
    icon: "\uD83E\uDDEA",
  },
  {
    title: "Push or Pull Request",
    description: "Choose your ship mode: direct push to main for speed, or open pull requests for review-first workflows.",
    icon: "\uD83D\uDD00",
  },
  {
    title: "Live Dashboard",
    description: "Real-time web dashboard with repo status cards, live log streaming via SSE, and build history.",
    icon: "\uD83D\uDCCA",
  },
  {
    title: "Webhook Notifications",
    description: "Slack, Discord, or any webhook. Get detailed build reports with feature summary, files changed, and commit links.",
    icon: "\uD83D\uDD14",
  },
  {
    title: "Owner Feedback",
    description: "Drop an AI_BUILDER_FEEDBACK.md in any repo to steer what gets built next. Your agent reads it, prioritizes it, and acts on it.",
    icon: "\uD83D\uDCAC",
  },
  {
    title: "Per-Repo Isolated State",
    description: "Each repo tracks its own day counter, changelog, and feature plan. One failure never blocks another.",
    icon: "\uD83D\uDDC2\uFE0F",
  },
];

export const setupSteps = [
  {
    step: "1",
    title: "Run one command",
    command: "npx robodevloop",
    description: "The wizard clones the repo, walks you through config \u2014 repos, auth, schedule, ship mode \u2014 and deploys. All in 60 seconds.",
  },
  {
    step: "2",
    title: "There is no step 2.",
    command: null,
    description: "Seriously. That\u2019s it. RoboDevLoop is now running on your server, building features for your repos on autopilot. Go to sleep.",
  },
];

export const reliability = [
  {
    title: "Graceful Failure",
    description: "Single repo failure never blocks others. Every phase has bounded retries and clean error reporting.",
  },
  {
    title: "Retry Discipline",
    description: "Build attempts (3x), test-fix rounds (2x), push retries (3x). All bounded, all logged.",
  },
  {
    title: "Full Audit Trail",
    description: "Daily logs, per-repo changelogs, feature plans, and webhook notifications. Complete transparency.",
  },
];

export const risks = [
  {
    title: "AI-Generated Code",
    description: "Claude writes real code that ships to your repos. AI can introduce bugs, security issues, or breaking changes. Always review what gets built.",
    icon: "\u26A0\uFE0F",
  },
  {
    title: "Direct Push to Main",
    description: "In push mode, changes go straight to main with no human review. Use PR mode for production repos or anything with real users.",
    icon: "\uD83D\uDEA8",
  },
  {
    title: "API & Token Usage",
    description: "RoboDevLoop uses your GitHub token and Claude credits. Long builds consume API credits. Monitor usage and set budget alerts.",
    icon: "\uD83D\uDCB3",
  },
];

export const precautions = [
  "Use PR mode (SHIP_MODE=pr) for any repo with real users or production traffic.",
  "Start with a sandbox repo to understand what RoboDevLoop builds before pointing it at important projects.",
  "Set up webhook notifications so you know what shipped while you slept.",
  "Review the AI_BUILDER_FEEDBACK.md to steer the agent away from risky areas of your codebase.",
  "Keep your GitHub token scoped to only the repos you want RoboDevLoop to access.",
  "Monitor Claude API usage if using API key mode \u2014 daily builds add up.",
];

export const faqs = [
  {
    q: "Does it use API credits?",
    a: "RoboDevLoop supports both Claude Max (no per-request costs) and Anthropic API keys. Choose your auth mode during setup.",
  },
  {
    q: "What if Claude auth expires?",
    a: "For Claude Max: SSH into your server and run `docker exec -it daily-ai-builder claude login`. For API keys: just update your .env file.",
  },
  {
    q: "What if a build fails?",
    a: "The builder retries up to 3 times, with Claude fixing errors between attempts. If all 3 fail, changes are reverted and you get a notification. Other repos continue unaffected.",
  },
  {
    q: "Can I add repos later?",
    a: "Yes \u2014 edit repos.conf and restart the container. Each new repo starts at Day 1 with its own isolated state.",
  },
  {
    q: "Can I trigger a build manually?",
    a: "Yes \u2014 run `docker exec daily-ai-builder /app/daily-build.sh` or use the --run-now flag on container start.",
  },
  {
    q: "Push to main or pull request?",
    a: "Configure SHIP_MODE in your .env: 'push' for direct push to main, 'pr' to open pull requests for review.",
  },
  {
    q: "Can I change the build schedule?",
    a: "Yes \u2014 set BUILD_SCHEDULE in your .env to any cron expression, or use presets like 'daily', 'twice-daily', or 'every-6h'.",
  },
];

export const terminalDemo = [
  { text: "$ npx robodevloop", delay: 0, type: "command" as const },
  { text: "", delay: 400, type: "blank" as const },
  { text: "\uD83E\uDD16 Welcome to RoboDevLoop", delay: 600, type: "output" as const },
  { text: "", delay: 200, type: "blank" as const },
  { text: "GitHub token: ghp_****", delay: 800, type: "output" as const },
  { text: "Git name: yourname", delay: 400, type: "output" as const },
  { text: "Repos to build: you/your-app, you/api", delay: 600, type: "output" as const },
  { text: "Auth mode: Claude Max", delay: 400, type: "output" as const },
  { text: "Ship mode: Open pull requests", delay: 400, type: "output" as const },
  { text: "Schedule: Daily at 5 AM", delay: 400, type: "output" as const },
  { text: "Deploy to: myserver.local", delay: 400, type: "output" as const },
  { text: "", delay: 300, type: "blank" as const },
  { text: "\u2713 Config generated", delay: 500, type: "success" as const },
  { text: "\u2713 Deploying to myserver.local...", delay: 800, type: "success" as const },
  { text: "\u2713 Container running", delay: 600, type: "success" as const },
  { text: "\u2713 RoboDevLoop engaged \u2014 first build at 5:00 AM", delay: 500, type: "success" as const },
];
