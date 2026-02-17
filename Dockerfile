FROM ubuntu:24.04

ENV TZ=America/Los_Angeles
ENV DEBIAN_FRONTEND=noninteractive

# System packages
RUN apt-get update && apt-get install -y \
    curl \
    git \
    jq \
    cron \
    gettext-base \
    ca-certificates \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Node.js 20 LTS via NodeSource
RUN mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
       | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" \
       > /etc/apt/sources.list.d/nodesource.list \
    && apt-get update && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# GitHub CLI
RUN mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
       | dd of=/etc/apt/keyrings/githubcli-archive-keyring.gpg \
    && chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
       > /etc/apt/sources.list.d/github-cli.list \
    && apt-get update && apt-get install -y gh \
    && rm -rf /var/lib/apt/lists/*

# Claude Code CLI
RUN npm install -g @anthropic-ai/claude-code

# Playwright + Chromium for visual UI testing
RUN npx playwright install chromium --with-deps

# App directories
RUN mkdir -p /app/state /app/logs /app/projects /app/prompts /app/scripts

# Claude auth directory (mounted as volume for persistent login)
RUN mkdir -p /root/.claude

# Copy project files
COPY entrypoint.sh daily-build.sh build-repo.sh test-repo.sh repos.conf dashboard.js /app/
COPY prompts/ /app/prompts/
COPY scripts/ /app/scripts/

RUN chmod +x /app/*.sh /app/scripts/*.sh

WORKDIR /app

ENTRYPOINT ["/app/entrypoint.sh"]
