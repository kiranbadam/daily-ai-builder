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
};

const c = (clr, text) => `${clr}${text}${color.reset}`;
const cyan    = (t) => c(color.cyan, t);
const green   = (t) => c(color.green, t);
const yellow  = (t) => c(color.yellow, t);
const red     = (t) => c(color.red, t);
const bold    = (t) => c(color.bold, t);
const dim     = (t) => c(color.dim, t);
const magenta = (t) => c(color.magenta, t);

// ─── Docker Image ────────────────────────────────────────────────────────────

const DOCKER_IMAGE = 'kiranbadam/robodevloop:latest';

// ─── ASCII Banner ───────────────────────────────────────────────────────────

const VERSION = '1.1.0';

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
  ${dim(`v${VERSION}`)}  ${dim('Ship While You Sleep.')}
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
    closeReadline();
    process.stdout.write(`  ${color.cyan}?${color.reset} ${prompt}`);
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

// ─── Cron Presets ───────────────────────────────────────────────────────────

const CRON_PRESETS = {
  1: { label: 'Daily at 5 AM',           cron: '0 5 * * *' },
  2: { label: 'Twice daily (5 AM + 5 PM)', cron: '0 5,17 * * *' },
  3: { label: 'Every 6 hours',            cron: '0 */6 * * *' },
};

// ─── File Generators ────────────────────────────────────────────────────────

function generateDockerCompose() {
  return `# Generated by RoboDevLoop Setup Wizard
# https://github.com/kiranbadam/daily-ai-builder

services:
  robodevloop:
    image: ${DOCKER_IMAGE}
    container_name: daily-ai-builder
    env_file: .env
    volumes:
      - ./repos.conf:/app/repos.conf:ro
      - robodevloop-state:/app/state
      - robodevloop-logs:/app/logs
      - robodevloop-projects:/app/projects
      - robodevloop-claude-auth:/root/.claude
    ports:
      - "8080:8080"
    restart: unless-stopped

volumes:
  robodevloop-state:
  robodevloop-logs:
  robodevloop-projects:
  robodevloop-claude-auth:
`;
}

function generateEnv(config) {
  return `# Generated by RoboDevLoop Setup Wizard
# ${new Date().toISOString()}

# GitHub token for repo access
GITHUB_TOKEN=${config.githubToken}

# Git identity for commits
GIT_USER_NAME=${config.gitUserName}
GIT_USER_EMAIL=${config.gitUserEmail}

# Claude authentication
# Auth mode: ${config.authMode === 1 ? 'claude-max' : 'api-key'}
ANTHROPIC_API_KEY=${config.anthropicApiKey}

# Ship mode: "push" (direct to main) or "pr" (open pull requests)
SHIP_MODE=${config.shipMode}

# Build schedule (cron expression)
BUILD_SCHEDULE=${config.buildSchedule}

# Webhook URL for build notifications (Slack, Discord, etc.)
WEBHOOK_URL=${config.webhookUrl}
`;
}

function generateReposConf(repos) {
  return `# Managed by RoboDevLoop
# One owner/repo per line
${repos.join('\n')}
`;
}

// ─── Main Wizard ────────────────────────────────────────────────────────────

async function main() {
  printBanner();
  initReadline();

  console.log(bold('  Let\'s set up your autonomous dev loop!'));
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
    console.log(green('  Using Claude Max. You\'ll need to log in after deploy.'));
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
    'Where will RoboDevLoop run?',
    [
      'This machine (Docker)',
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

  // ── Step 9: Generate config files ─────────────────────────────────────

  console.log('');
  console.log(dim('  ─────────────────────────────────────────'));
  console.log(bold('  Generating configuration files...'));
  console.log('');

  const outputDir = path.join(process.cwd(), 'robodevloop');
  fs.mkdirSync(outputDir, { recursive: true });

  const config = {
    githubToken,
    gitUserName,
    gitUserEmail,
    anthropicApiKey,
    shipMode,
    buildSchedule,
    webhookUrl,
    authMode,
  };

  // docker-compose.yml
  const composePath = path.join(outputDir, 'docker-compose.yml');
  fs.writeFileSync(composePath, generateDockerCompose(), 'utf8');
  console.log(green(`  Created: ${composePath}`));

  // .env
  const envPath = path.join(outputDir, '.env');
  fs.writeFileSync(envPath, generateEnv(config), 'utf8');
  console.log(green(`  Created: ${envPath}`));

  // repos.conf
  const reposPath = path.join(outputDir, 'repos.conf');
  fs.writeFileSync(reposPath, generateReposConf(repos), 'utf8');
  console.log(green(`  Created: ${reposPath}`));

  // ── Step 10: Summary ──────────────────────────────────────────────────

  console.log('');
  console.log(`${color.cyan}${color.bold}  ╔════════════════════════════════════════════╗${color.reset}`);
  console.log(`${color.cyan}${color.bold}  ║         CONFIGURATION SUMMARY              ║${color.reset}`);
  console.log(`${color.cyan}${color.bold}  ╚════════════════════════════════════════════╝${color.reset}`);
  console.log('');
  console.log(`  ${bold('Config dir:')}     ${outputDir}`);
  console.log(`  ${bold('Docker image:')}   ${DOCKER_IMAGE}`);
  console.log(`  ${bold('GitHub token:')}   ${maskToken(githubToken)}`);
  console.log(`  ${bold('Git identity:')}   ${gitUserName} <${gitUserEmail}>`);
  console.log(`  ${bold('Repos:')}          ${repos.join(', ')}`);
  console.log(`  ${bold('Auth mode:')}      ${authMode === 1 ? 'Claude Max' : 'API Key'}`);
  if (authMode === 2) {
    console.log(`  ${bold('API key:')}        ${maskApiKey(anthropicApiKey)}`);
  }
  console.log(`  ${bold('Ship mode:')}      ${shipMode === 'push' ? 'Direct push to main' : 'Open pull requests'}`);
  console.log(`  ${bold('Schedule:')}       ${buildSchedule}`);
  console.log(`  ${bold('Deploy target:')}  ${deployChoice === 1 ? 'Local Docker' : `${deployUser}@${deployHost}`}`);
  if (webhookUrl) {
    console.log(`  ${bold('Webhook:')}        ${webhookUrl}`);
  }
  console.log('');
  console.log(green('  Configuration files generated!'));
  console.log('');

  // ── Step 11: Deploy ───────────────────────────────────────────────────

  const deployNow = await askChoice(
    'Deploy now?',
    [
      'Yes, start the build loop!',
      'No, I\'ll deploy later',
    ],
    1
  );

  if (deployNow === 1) {
    console.log('');

    if (deployChoice === 2) {
      // ── Remote deploy ──────────────────────────────────────────────
      console.log(cyan('  Deploying to remote server...'));
      console.log('');

      const remoteDir = 'robodevloop';

      try {
        // Step 1: Create remote directory and copy files
        console.log(dim('  Creating remote directory and copying config files...'));
        execSync(
          `ssh ${deployUser}@${deployHost} "mkdir -p ~/${remoteDir}"`,
          { stdio: 'inherit' }
        );
        execSync(
          `scp "${composePath}" "${envPath}" "${reposPath}" ${deployUser}@${deployHost}:~/${remoteDir}/`,
          { stdio: 'inherit' }
        );
        console.log(green('  Files copied.'));
        console.log('');

        // Step 2: Pull image and start container
        console.log(dim('  Pulling Docker image and starting container...'));
        closeReadline();
        execSync(
          `ssh ${deployUser}@${deployHost} "cd ~/${remoteDir} && docker compose pull && docker compose up -d"`,
          { stdio: 'inherit' }
        );
        console.log('');
        console.log(green(bold('  RoboDevLoop is running!')));
      } catch (err) {
        if (err.status && err.status <= 1) {
          console.log('');
          console.log(green(bold('  Deploy completed!')));
        } else {
          console.log(red(`  Deploy failed: ${err.message}`));
          console.log('');
          console.log(yellow('  You can deploy manually:'));
          console.log(cyan(`    scp -r ${outputDir}/* ${deployUser}@${deployHost}:~/robodevloop/`));
          console.log(cyan(`    ssh ${deployUser}@${deployHost} "cd ~/robodevloop && docker compose pull && docker compose up -d"`));
        }
      }
    } else {
      // ── Local deploy ───────────────────────────────────────────────
      console.log(cyan('  Starting RoboDevLoop locally...'));
      console.log('');

      try {
        closeReadline();
        execSync('docker compose pull && docker compose up -d', {
          cwd: outputDir,
          stdio: 'inherit',
        });
        console.log('');
        console.log(green(bold('  RoboDevLoop is running!')));
      } catch (err) {
        if (err.status && err.status <= 1) {
          console.log('');
          console.log(green(bold('  Deploy completed!')));
        } else {
          console.log(red(`  Deploy failed: ${err.message}`));
          console.log('');
          console.log(yellow('  You can start manually:'));
          console.log(cyan(`    cd ${outputDir}`));
          console.log(cyan('    docker compose pull'));
          console.log(cyan('    docker compose up -d'));
        }
      }
    }
  } else {
    closeReadline();
  }

  // ── Step 12: Next steps ───────────────────────────────────────────────

  console.log('');
  console.log(`${color.cyan}${color.bold}  ╔════════════════════════════════════════════╗${color.reset}`);
  console.log(`${color.cyan}${color.bold}  ║              NEXT STEPS                    ║${color.reset}`);
  console.log(`${color.cyan}${color.bold}  ╚════════════════════════════════════════════╝${color.reset}`);
  console.log('');

  let step = 1;

  if (deployNow !== 1) {
    console.log(`  ${bold(`${step}.`)} Deploy the build loop:`);
    if (deployChoice === 2) {
      console.log(cyan(`     scp ${outputDir}/* ${deployUser}@${deployHost}:~/robodevloop/`));
      console.log(cyan(`     ssh ${deployUser}@${deployHost} "cd ~/robodevloop && docker compose pull && docker compose up -d"`));
    } else {
      console.log(cyan(`     cd ${outputDir}`));
      console.log(cyan('     docker compose pull'));
      console.log(cyan('     docker compose up -d'));
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
  if (deployChoice === 2) {
    console.log(cyan(`     ssh ${deployUser}@${deployHost} 'docker logs -f daily-ai-builder'`));
  } else {
    console.log(cyan('     docker logs -f daily-ai-builder'));
  }
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

  console.log(`  ${bold(`${step}.`)} Add more repos later:`);
  if (deployChoice === 2) {
    console.log(cyan(`     Edit ${reposPath}, then: scp ${reposPath} ${deployUser}@${deployHost}:~/robodevloop/`));
    console.log(cyan(`     ssh ${deployUser}@${deployHost} 'cd ~/robodevloop && docker compose restart'`));
  } else {
    console.log(cyan(`     Edit ${reposPath}`));
    console.log(cyan(`     cd ${outputDir} && docker compose restart`));
  }
  console.log('');
  step++;

  console.log(`  ${bold(`${step}.`)} Steer what gets built:`);
  console.log(dim('     Drop an AI_BUILDER_FEEDBACK.md in any repo — the agent reads it and prioritizes your input.'));
  console.log('');
  step++;

  console.log(`  ${bold(`${step}.`)} Documentation:`);
  console.log(cyan('     https://github.com/kiranbadam/daily-ai-builder#readme'));
  console.log('');

  console.log(dim('  ─────────────────────────────────────────'));
  console.log(`  ${magenta(bold('  Ship While You Sleep.'))} ${dim('Your repos will thank you.')}`);
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
