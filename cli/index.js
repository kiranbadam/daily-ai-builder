#!/usr/bin/env node

// RoboDevLoop CLI Setup Wizard
// Zero external dependencies - uses only Node.js stdlib

const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ─── ANSI Color Helpers ─────────────────────────────────────────────────────

const color = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  cyan:    '\x1b[36m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  red:     '\x1b[31m',
  magenta: '\x1b[35m',
  white:   '\x1b[37m',
  bgCyan:  '\x1b[46m',
  bgBlack: '\x1b[40m',
};

const c = (clr, text) => `${clr}${text}${color.reset}`;
const cyan    = (t) => c(color.cyan, t);
const green   = (t) => c(color.green, t);
const yellow  = (t) => c(color.yellow, t);
const red     = (t) => c(color.red, t);
const bold    = (t) => c(color.bold, t);
const dim     = (t) => c(color.dim, t);
const magenta = (t) => c(color.magenta, t);

// ─── ASCII Banner ───────────────────────────────────────────────────────────

const VERSION = '1.0.0';

function printBanner() {
  const art = `
${color.cyan}${color.bold}
  ╔══════════════════════════════════════════════════════════════╗
  ║                                                              ║
  ║   ████████╗  ██████╗  ██████╗  ██████╗                      ║
  ║   ██╔═══██║ ██╔═══██╗ ██╔══██╗██╔═══██╗                     ║
  ║   ████████║ ██║   ██║ ██████╔╝██║   ██║                     ║
  ║   ██╔═══██║ ██║   ██║ ██╔══██╗██║   ██║                     ║
  ║   ██║   ██║ ╚██████╔╝ ██████╔╝╚██████╔╝                     ║
  ║   ╚═╝   ╚═╝  ╚═════╝  ╚═════╝  ╚═════╝                      ║
  ║                                                              ║
  ║   ██████╗ ███████╗██╗   ██╗██╗      ██████╗  ██████╗ ██████╗ ║
  ║   ██╔══██╗██╔════╝██║   ██║██║     ██╔═══██╗██╔═══██╗██╔══██╗║
  ║   ██║  ██║█████╗  ██║   ██║██║     ██║   ██║██║   ██║██████╔╝║
  ║   ██║  ██║██╔══╝  ╚██╗ ██╔╝██║     ██║   ██║██║   ██║██╔═══╝ ║
  ║   ██████╔╝███████╗ ╚████╔╝ ███████╗╚██████╔╝╚██████╔╝██║     ║
  ║   ╚═════╝ ╚══════╝  ╚═══╝  ╚══════╝ ╚═════╝  ╚═════╝ ╚═╝     ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
${color.reset}
  ${dim(`v${VERSION}`)}  ${dim('Autonomous dev loop for your repos.')}
  ${dim('One command. Infinite builds.')}
`;
  console.log(art);
}

// ─── Readline Helpers ───────────────────────────────────────────────────────

let rl;

// Handle Ctrl+C globally
process.on('SIGINT', () => {
  console.log('\n');
  console.log(yellow('  Setup cancelled. Run again anytime with: npx robodevloop'));
  console.log('');
  process.exit(0);
});

function initReadline() {
  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function closeReadline() {
  if (rl) {
    rl.close();
    rl = null;
  }
}

function ask(prompt) {
  return new Promise((resolve) => {
    rl.question(`  ${color.cyan}?${color.reset} ${prompt}`, (answer) => {
      resolve(answer.trim());
    });
  });
}

function askSecret(prompt) {
  return new Promise((resolve) => {
    // Pause readline so it doesn't echo characters
    closeReadline();

    process.stdout.write(`  ${color.cyan}?${color.reset} ${prompt}`);

    // Use a muted readline — it handles all terminal quirks (paste, escape seqs)
    // but we suppress its output and print * ourselves
    const { Writable } = require('stream');
    const muted = new Writable({ write(chunk, enc, cb) { cb(); } });

    const secretRl = readline.createInterface({
      input: process.stdin,
      output: muted,
      terminal: true,
    });

    secretRl.question('', (answer) => {
      secretRl.close();
      process.stdout.write('\n');
      initReadline();
      resolve(answer.trim());
    });
  });
}

function askChoice(prompt, options, defaultChoice) {
  return new Promise((resolve) => {
    console.log('');
    console.log(`  ${color.cyan}?${color.reset} ${bold(prompt)}`);
    options.forEach((opt, i) => {
      const marker = (i + 1) === defaultChoice ? green(` > ${i + 1})`) : dim(`   ${i + 1})`);
      console.log(`  ${marker} ${opt}`);
    });

    const defaultLabel = defaultChoice ? dim(` (default: ${defaultChoice})`) : '';
    rl.question(`  ${color.cyan}>${color.reset} Your choice${defaultLabel}: `, (answer) => {
      const val = answer.trim();
      if (val === '' && defaultChoice) {
        resolve(defaultChoice);
      } else {
        const num = parseInt(val, 10);
        if (num >= 1 && num <= options.length) {
          resolve(num);
        } else {
          console.log(red(`    Invalid choice. Defaulting to ${defaultChoice || 1}.`));
          resolve(defaultChoice || 1);
        }
      }
    });
  });
}

// ─── Validation ─────────────────────────────────────────────────────────────

function validateRepos(input) {
  const repos = input.split(',').map((r) => r.trim()).filter(Boolean);
  const invalid = repos.filter((r) => !r.includes('/') || r.split('/').length !== 2);
  if (invalid.length > 0) {
    return { valid: false, invalid, repos: [] };
  }
  return { valid: true, invalid: [], repos };
}

function maskToken(token) {
  if (!token) return dim('(not set)');
  if (token.startsWith('ghp_')) {
    return `ghp_${'*'.repeat(Math.max(0, token.length - 4))}`;
  }
  if (token.length > 8) {
    return token.slice(0, 4) + '*'.repeat(token.length - 8) + token.slice(-4);
  }
  return '*'.repeat(token.length);
}

function maskApiKey(key) {
  if (!key) return dim('(not set)');
  if (key.length > 10) {
    return key.slice(0, 7) + '*'.repeat(key.length - 11) + key.slice(-4);
  }
  return '*'.repeat(key.length);
}

// ─── Project Directory Detection ────────────────────────────────────────────

function findProjectDir() {
  const cwd = process.cwd();

  // Check if cwd is the project directory
  if (
    fs.existsSync(path.join(cwd, 'docker-compose.yml')) &&
    fs.existsSync(path.join(cwd, 'entrypoint.sh'))
  ) {
    return cwd;
  }

  // Check if cwd contains a daily-ai-builder subdirectory
  const subdir = path.join(cwd, 'daily-ai-builder');
  if (
    fs.existsSync(path.join(subdir, 'docker-compose.yml')) &&
    fs.existsSync(path.join(subdir, 'entrypoint.sh'))
  ) {
    return subdir;
  }

  return null;
}

// ─── Cron Presets ───────────────────────────────────────────────────────────

const CRON_PRESETS = {
  1: { label: 'Daily at 5 AM',           cron: '0 5 * * *' },
  2: { label: 'Twice daily (5 AM + 5 PM)', cron: '0 5,17 * * *' },
  3: { label: 'Every 6 hours',            cron: '0 */6 * * *' },
};

// ─── Main Wizard ────────────────────────────────────────────────────────────

async function main() {
  printBanner();

  initReadline();

  // ── Step 0: Find or clone project ─────────────────────────────────────

  console.log(dim('  Checking for RoboDevLoop project files...'));
  let projectDir = findProjectDir();

  if (!projectDir) {
    console.log('');
    console.log(yellow('  Could not find RoboDevLoop project files (docker-compose.yml, entrypoint.sh).'));
    console.log('');

    const cloneChoice = await askChoice(
      'Would you like to clone the repository?',
      [
        'Yes, clone it into the current directory',
        'No, I will clone it myself',
      ],
      1
    );

    if (cloneChoice === 1) {
      console.log('');
      console.log(cyan('  Cloning daily-ai-builder...'));
      try {
        execSync('git clone https://github.com/kiranbadam/daily-ai-builder.git', {
          cwd: process.cwd(),
          stdio: 'inherit',
        });
        projectDir = path.join(process.cwd(), 'daily-ai-builder');
        console.log(green('  Repository cloned successfully!'));
      } catch (err) {
        console.log(red('  Failed to clone repository. Please clone it manually:'));
        console.log('');
        console.log('    git clone https://github.com/kiranbadam/daily-ai-builder.git');
        console.log('    cd daily-ai-builder');
        console.log('    npx robodevloop');
        console.log('');
        closeReadline();
        process.exit(1);
      }
    } else {
      console.log('');
      console.log('  Please clone the repo and run the wizard from inside it:');
      console.log('');
      console.log(cyan('    git clone https://github.com/kiranbadam/daily-ai-builder.git'));
      console.log(cyan('    cd daily-ai-builder'));
      console.log(cyan('    npx robodevloop'));
      console.log('');
      closeReadline();
      process.exit(0);
    }
  } else {
    console.log(green(`  Found project at: ${projectDir}`));
  }

  console.log('');
  console.log(bold('  Let\'s configure your autonomous dev loop!'));
  console.log(dim('  ─────────────────────────────────────────'));
  console.log('');

  // ── Step 1: GitHub Token ──────────────────────────────────────────────

  console.log(dim('  Create one at: https://github.com/settings/tokens (scopes: repo, workflow)'));
  console.log('');
  const githubToken = await askSecret(bold('GitHub Personal Access Token: '));
  if (!githubToken) {
    console.log(red('  GitHub token is required. Aborting.'));
    closeReadline();
    process.exit(1);
  }
  console.log(green(`  Token saved: ${maskToken(githubToken)}`));
  console.log('');

  // ── Step 2: Git user name and email ───────────────────────────────────

  let defaultName = '';
  let defaultEmail = '';
  try {
    defaultName = execSync('git config user.name', { encoding: 'utf8' }).trim();
  } catch (_) {}
  try {
    defaultEmail = execSync('git config user.email', { encoding: 'utf8' }).trim();
  } catch (_) {}

  const namePrompt = defaultName
    ? bold(`Git user name`) + dim(` (${defaultName})`) + ': '
    : bold('Git user name: ');
  const gitUserName = (await ask(namePrompt)) || defaultName;
  if (!gitUserName) {
    console.log(red('  Git user name is required. Aborting.'));
    closeReadline();
    process.exit(1);
  }

  const emailPrompt = defaultEmail
    ? bold(`Git user email`) + dim(` (${defaultEmail})`) + ': '
    : bold('Git user email: ');
  const gitUserEmail = (await ask(emailPrompt)) || defaultEmail;
  if (!gitUserEmail) {
    console.log(red('  Git user email is required. Aborting.'));
    closeReadline();
    process.exit(1);
  }

  console.log(green(`  Git identity: ${gitUserName} <${gitUserEmail}>`));
  console.log('');

  // ── Step 3: Repos ─────────────────────────────────────────────────────

  let repos = [];
  while (repos.length === 0) {
    const repoInput = await ask(bold('Repos to build (comma-separated, e.g. owner/repo1, owner/repo2): '));
    const result = validateRepos(repoInput);
    if (!result.valid) {
      console.log(red(`  Invalid repo format: ${result.invalid.join(', ')}`));
      console.log(yellow('  Repos must be in "owner/repo" format.'));
    } else if (result.repos.length === 0) {
      console.log(red('  At least one repo is required.'));
    } else {
      repos = result.repos;
      console.log(green(`  ${repos.length} repo(s) configured: ${repos.join(', ')}`));
    }
  }

  // ── Step 4: Auth mode ─────────────────────────────────────────────────

  const authMode = await askChoice(
    'Claude authentication mode:',
    [
      'Claude Max (subscription, requires login)',
      'API key (ANTHROPIC_API_KEY)',
    ],
    1
  );

  let anthropicApiKey = '';
  if (authMode === 2) {
    console.log('');
    anthropicApiKey = await askSecret(bold('Anthropic API Key: '));
    if (!anthropicApiKey) {
      console.log(red('  API key is required when using API key mode. Aborting.'));
      closeReadline();
      process.exit(1);
    }
    console.log(green(`  API key saved: ${maskApiKey(anthropicApiKey)}`));
  } else {
    console.log(green('  Using Claude Max. Make sure you are logged into Claude CLI.'));
  }

  // ── Step 5: Ship mode ─────────────────────────────────────────────────

  const shipChoice = await askChoice(
    'Ship mode (how to deliver changes):',
    [
      'Direct push to main',
      'Open pull requests',
    ],
    2
  );
  const shipMode = shipChoice === 1 ? 'push' : 'pr';
  console.log(green(`  Ship mode: ${shipMode === 'push' ? 'Direct push to main' : 'Open pull requests'}`));

  // ── Step 6: Build schedule ────────────────────────────────────────────

  const scheduleChoice = await askChoice(
    'Build schedule:',
    [
      'Daily at 5 AM (default)',
      'Twice daily (5 AM + 5 PM)',
      'Every 6 hours',
      'Custom cron expression',
    ],
    1
  );

  let buildSchedule;
  if (scheduleChoice === 4) {
    console.log('');
    console.log(dim('  Cron format: minute hour day-of-month month day-of-week'));
    console.log(dim('  Example:     0 5 * * *  = daily at 5 AM'));
    buildSchedule = await ask(bold('Custom cron expression: '));
    if (!buildSchedule) {
      console.log(yellow('  No cron entered. Defaulting to daily at 5 AM.'));
      buildSchedule = '0 5 * * *';
    }
  } else {
    buildSchedule = CRON_PRESETS[scheduleChoice].cron;
  }
  console.log(green(`  Schedule: ${buildSchedule}`));

  // ── Step 7: Deploy target ─────────────────────────────────────────────

  const deployChoice = await askChoice(
    'Deploy target:',
    [
      'Run locally with Docker',
      'Remote server (SSH)',
    ],
    1
  );

  let deployHost = '';
  let deployUser = '';

  if (deployChoice === 2) {
    console.log('');
    deployHost = await ask(bold('Remote host (IP or hostname): '));
    if (!deployHost) {
      console.log(red('  Host is required for remote deploy. Aborting.'));
      closeReadline();
      process.exit(1);
    }
    deployUser = await ask(bold('SSH user: '));
    if (!deployUser) {
      console.log(red('  SSH user is required for remote deploy. Aborting.'));
      closeReadline();
      process.exit(1);
    }
    console.log(green(`  Remote target: ${deployUser}@${deployHost}`));
  } else {
    console.log(green('  Deploy target: local Docker'));
  }

  // ── Step 8: Webhook URL (optional) ────────────────────────────────────

  console.log('');
  const webhookUrl = await ask(bold('Webhook URL for notifications ') + dim('(optional, press Enter to skip)') + ': ');
  if (webhookUrl) {
    console.log(green(`  Webhook: ${webhookUrl}`));
  }

  // ── Step 9: Generate .env ─────────────────────────────────────────────

  console.log('');
  console.log(dim('  ─────────────────────────────────────────'));
  console.log(bold('  Generating configuration files...'));
  console.log('');

  const envContent = `# Generated by RoboDevLoop Setup Wizard
# ${new Date().toISOString()}
#
# GitHub token for repo access
GITHUB_TOKEN=${githubToken}

# Git identity for commits
GIT_USER_NAME=${gitUserName}
GIT_USER_EMAIL=${gitUserEmail}

# Webhook URL for build notifications (Slack, Discord, etc.)
WEBHOOK_URL=${webhookUrl}

# Deploy target (leave empty for local Docker)
DEPLOY_HOST=${deployHost}
DEPLOY_USER=${deployUser}

# Claude authentication
# Auth mode: ${authMode === 1 ? 'claude-max' : 'api-key'}
ANTHROPIC_API_KEY=${anthropicApiKey}

# Ship mode: "push" (direct to main) or "pr" (open pull requests)
SHIP_MODE=${shipMode}

# Build schedule (cron expression)
BUILD_SCHEDULE=${buildSchedule}
`;

  const envPath = path.join(projectDir, '.env');
  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log(green(`  Created: ${envPath}`));

  // ── Step 10: Generate repos.conf ──────────────────────────────────────

  const reposContent = `# Managed by RoboDevLoop
# Add one owner/repo per line
${repos.join('\n')}
`;

  const reposPath = path.join(projectDir, 'repos.conf');
  fs.writeFileSync(reposPath, reposContent, 'utf8');
  console.log(green(`  Created: ${reposPath}`));

  // ── Step 11: Summary ──────────────────────────────────────────────────

  console.log('');
  console.log(`${color.cyan}${color.bold}  ╔════════════════════════════════════════════╗${color.reset}`);
  console.log(`${color.cyan}${color.bold}  ║         CONFIGURATION SUMMARY              ║${color.reset}`);
  console.log(`${color.cyan}${color.bold}  ╚════════════════════════════════════════════╝${color.reset}`);
  console.log('');
  console.log(`  ${bold('Project dir:')}     ${projectDir}`);
  console.log(`  ${bold('GitHub token:')}    ${maskToken(githubToken)}`);
  console.log(`  ${bold('Git identity:')}    ${gitUserName} <${gitUserEmail}>`);
  console.log(`  ${bold('Repos:')}           ${repos.join(', ')}`);
  console.log(`  ${bold('Auth mode:')}       ${authMode === 1 ? 'Claude Max' : 'API Key'}`);
  if (authMode === 2) {
    console.log(`  ${bold('API key:')}         ${maskApiKey(anthropicApiKey)}`);
  }
  console.log(`  ${bold('Ship mode:')}       ${shipMode === 'push' ? 'Direct push to main' : 'Open pull requests'}`);
  console.log(`  ${bold('Schedule:')}        ${buildSchedule}`);
  console.log(`  ${bold('Deploy target:')}   ${deployChoice === 1 ? 'Local Docker' : `${deployUser}@${deployHost}`}`);
  if (webhookUrl) {
    console.log(`  ${bold('Webhook:')}         ${webhookUrl}`);
  }
  console.log('');
  console.log(green('  Configuration files written successfully!'));
  console.log('');

  // ── Step 12: Offer to deploy now ──────────────────────────────────────

  const deployNow = await askChoice(
    'Would you like to deploy now?',
    [
      'Yes, start the build loop!',
      'No, I\'ll deploy later',
    ],
    2
  );

  if (deployNow === 1) {
    console.log('');
    console.log(cyan('  Starting deploy...'));
    console.log('');
    try {
      const deployScript = path.join(projectDir, 'deploy.sh');
      if (fs.existsSync(deployScript)) {
        closeReadline();
        execSync(`bash "${deployScript}"`, {
          cwd: projectDir,
          stdio: 'inherit',
        });
      } else {
        console.log(yellow('  deploy.sh not found. Starting with docker-compose...'));
        closeReadline();
        execSync('docker-compose up -d', {
          cwd: projectDir,
          stdio: 'inherit',
        });
      }
      console.log('');
      console.log(green(bold('  RoboDevLoop is running!')));
    } catch (err) {
      console.log('');
      // deploy.sh exits non-zero when the interactive shell closes — that's normal
      if (err.status && err.status <= 1) {
        console.log('');
        console.log(green(bold('  Deploy completed!')));
      } else {
        console.log(red(`  Deploy failed: ${err.message}`));
        console.log(yellow('  You can try manually:'));
        console.log(`    cd ${projectDir}`);
        console.log('    bash deploy.sh');
      }
    }
  } else {
    closeReadline();
  }

  // ── Step 13: Next steps ───────────────────────────────────────────────

  console.log('');
  console.log(`${color.cyan}${color.bold}  ╔════════════════════════════════════════════╗${color.reset}`);
  console.log(`${color.cyan}${color.bold}  ║              NEXT STEPS                    ║${color.reset}`);
  console.log(`${color.cyan}${color.bold}  ╚════════════════════════════════════════════╝${color.reset}`);
  console.log('');

  let step = 1;

  if (deployNow !== 1) {
    console.log(`  ${bold(`${step}.`)} Deploy the build loop:`);
    console.log(cyan(`     cd ${projectDir}`));
    if (deployChoice === 2) {
      console.log(cyan('     bash deploy.sh'));
    } else {
      console.log(cyan('     docker compose up -d --build'));
    }
    console.log('');
    step++;
  }

  // Claude Max users need to authenticate inside the container
  if (authMode === 1) {
    console.log(`  ${bold(`${step}.`)} ${yellow('Log into Claude (required, one-time):')}`);
    if (deployChoice === 2) {
      console.log(cyan(`     ssh ${deployUser}@${deployHost} 'docker exec -it daily-ai-builder claude login'`));
    } else {
      console.log(cyan('     docker exec -it daily-ai-builder claude login'));
    }
    console.log(dim('     Follow the prompts to authenticate. Auth persists across restarts.'));
    console.log('');
    step++;
  }

  console.log(`  ${bold(`${step}.`)} Check build status:`);
  console.log(cyan('     docker logs -f daily-ai-builder'));
  console.log('');
  step++;

  console.log(`  ${bold(`${step}.`)} Add more repos:`);
  console.log(cyan(`     Edit ${reposPath}`));
  console.log('');
  step++;

  console.log(`  ${bold(`${step}.`)} Change settings:`);
  console.log(cyan(`     Edit ${envPath}`));
  console.log(cyan('     Then: docker compose up -d'));
  console.log('');
  step++;

  console.log(`  ${bold(`${step}.`)} View the dashboard:`);
  if (deployChoice === 2) {
    console.log(cyan(`     http://${deployHost}:8080`));
  } else {
    console.log(cyan('     http://localhost:8080'));
  }
  console.log('');
  step++;

  console.log(`  ${bold(`${step}.`)} Documentation:`);
  console.log(cyan('     https://github.com/kiranbadam/daily-ai-builder#readme'));
  console.log('');

  console.log(dim('  ─────────────────────────────────────────'));
  console.log(`  ${magenta(bold('  Happy building!'))} ${dim('Your repos will thank you.')}`);
  console.log('');

  process.exit(0);
}

// ─── Run ────────────────────────────────────────────────────────────────────

main().catch((err) => {
  console.error('');
  console.error(red(`  Fatal error: ${err.message}`));
  console.error('');
  process.exit(1);
});
