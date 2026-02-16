const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const PORT = 8080;
const LOGS_DIR = "/app/logs";
const STATE_DIR = "/app/state";
const REPOS_FILE = "/app/repos.conf";

function getToday() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
}

function getRepos() {
  try {
    return fs
      .readFileSync(REPOS_FILE, "utf8")
      .split("\n")
      .map((l) => l.replace(/#.*/, "").trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function getRepoState(repo) {
  const slug = repo.replace("/", "-");
  const stateDir = path.join(STATE_DIR, slug);
  try {
    const day = fs.readFileSync(path.join(stateDir, "day.txt"), "utf8").trim();
    const changelog = fs.readFileSync(path.join(stateDir, "changelog.md"), "utf8");
    const lastFeature = changelog.split("\n## ").pop() || "None yet";
    return { day, lastFeature: lastFeature.trim() };
  } catch {
    return { day: "1", lastFeature: "Not started" };
  }
}

function getLogFiles() {
  try {
    return fs
      .readdirSync(LOGS_DIR)
      .filter((f) => f.endsWith(".log"))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Builder Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0a0a0a; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', monospace; }
    .header { background: #111; border-bottom: 1px solid #222; padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; }
    .header h1 { font-size: 18px; color: #f5a623; }
    .header .status { font-size: 12px; color: #888; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    .repos { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 12px; margin-bottom: 20px; }
    .repo-card { background: #151515; border: 1px solid #222; border-radius: 8px; padding: 16px; }
    .repo-card h3 { font-size: 14px; color: #f5a623; margin-bottom: 8px; }
    .repo-card .day { font-size: 24px; font-weight: bold; color: #fff; }
    .repo-card .detail { font-size: 11px; color: #888; margin-top: 4px; }
    .log-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    .log-header h2 { font-size: 14px; color: #888; }
    .log-select { background: #151515; color: #e0e0e0; border: 1px solid #333; border-radius: 4px; padding: 4px 8px; font-size: 12px; }
    .log-box { background: #0d0d0d; border: 1px solid #222; border-radius: 8px; padding: 16px; height: calc(100vh - 280px); overflow-y: auto; font-family: 'SF Mono', 'Fira Code', monospace; font-size: 12px; line-height: 1.6; white-space: pre-wrap; word-break: break-word; }
    .log-box .success { color: #4caf50; }
    .log-box .error { color: #f44336; }
    .log-box .phase { color: #f5a623; font-weight: bold; }
    .log-box .divider { color: #333; }
    .live-dot { display: inline-block; width: 8px; height: 8px; background: #4caf50; border-radius: 50%; margin-right: 6px; animation: pulse 2s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
    .controls { display: flex; gap: 8px; align-items: center; }
    .btn { background: #222; color: #e0e0e0; border: 1px solid #333; border-radius: 4px; padding: 4px 10px; font-size: 11px; cursor: pointer; }
    .btn:hover { background: #333; }
    .auto-scroll { font-size: 11px; color: #888; }
  </style>
</head>
<body>
  <div class="header">
    <h1>AI Builder Dashboard</h1>
    <div class="status"><span class="live-dot"></span>Live</div>
  </div>
  <div class="container">
    <div class="repos" id="repos"></div>
    <div class="log-header">
      <h2>Build Log</h2>
      <div class="controls">
        <label class="auto-scroll"><input type="checkbox" id="autoScroll" checked> Auto-scroll</label>
        <select class="log-select" id="logSelect"></select>
        <button class="btn" onclick="clearLog()">Clear</button>
      </div>
    </div>
    <div class="log-box" id="logBox"></div>
  </div>
  <script>
    const logBox = document.getElementById('logBox');
    const logSelect = document.getElementById('logSelect');
    const reposDiv = document.getElementById('repos');
    const autoScroll = document.getElementById('autoScroll');
    let eventSource = null;

    function colorize(text) {
      return text
        .replace(/^(={3,}.*)/gm, '<span class="divider">$1</span>')
        .replace(/^(>>>.*)$/gm, '<span class="phase">$1</span>')
        .replace(/(SUCCESS|Build succeeded|Pushed to|Build Complete)/g, '<span class="success">$1</span>')
        .replace(/(FAILED|ERROR|failed|error)/gi, '<span class="error">$1</span>');
    }

    function connectSSE(logFile) {
      if (eventSource) eventSource.close();
      logBox.innerHTML = '';
      eventSource = new EventSource('/api/logs/stream?file=' + encodeURIComponent(logFile));
      eventSource.onmessage = (e) => {
        logBox.innerHTML += colorize(e.data) + '\\n';
        if (autoScroll.checked) logBox.scrollTop = logBox.scrollHeight;
      };
      eventSource.onerror = () => { setTimeout(() => connectSSE(logFile), 3000); };
    }

    function clearLog() { logBox.innerHTML = ''; }

    async function loadRepos() {
      const res = await fetch('/api/repos');
      const repos = await res.json();
      reposDiv.innerHTML = repos.map(r =>
        '<div class="repo-card">' +
        '<h3>' + r.repo + '</h3>' +
        '<div class="day">Day ' + r.day + '</div>' +
        '<div class="detail">' + r.lastFeature + '</div>' +
        '</div>'
      ).join('');
    }

    async function loadLogFiles() {
      const res = await fetch('/api/logs');
      const files = await res.json();
      logSelect.innerHTML = files.map(f => '<option value="' + f + '">' + f + '</option>').join('');
      if (files.length > 0) connectSSE(files[0]);
    }

    logSelect.addEventListener('change', () => connectSSE(logSelect.value));
    loadRepos();
    loadLogFiles();
    setInterval(loadRepos, 30000);
  </script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/" || url.pathname === "/dashboard") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(HTML);
    return;
  }

  if (url.pathname === "/api/repos") {
    const repos = getRepos().map((repo) => ({ repo, ...getRepoState(repo) }));
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(repos));
    return;
  }

  if (url.pathname === "/api/logs") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(getLogFiles()));
    return;
  }

  if (url.pathname === "/api/logs/stream") {
    const file = url.searchParams.get("file") || `${getToday()}.log`;
    const logPath = path.join(LOGS_DIR, path.basename(file));

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    // Send existing content first
    try {
      const existing = fs.readFileSync(logPath, "utf8");
      for (const line of existing.split("\n")) {
        res.write(`data: ${line}\n\n`);
      }
    } catch {}

    // Then tail for new content
    const tail = spawn("tail", ["-f", "-n", "0", logPath]);
    tail.stdout.on("data", (data) => {
      for (const line of data.toString().split("\n")) {
        if (line) res.write(`data: ${line}\n\n`);
      }
    });

    req.on("close", () => tail.kill());
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Dashboard running at http://0.0.0.0:${PORT}`);
});
