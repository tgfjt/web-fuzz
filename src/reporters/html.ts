import type { Report, CheckResult } from "../types.ts";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function getStatusClass(status: string): string {
  switch (status) {
    case "pass": return "status-pass";
    case "fail": return "status-fail";
    case "skip": return "status-skip";
    default: return "";
  }
}

function getStatusIcon(status: string): string {
  switch (status) {
    case "pass": return "&#10003;";
    case "fail": return "&#10007;";
    case "skip": return "&#8212;";
    default: return "";
  }
}

function renderResult(result: CheckResult, seed: number): string {
  let html = `
    <div class="result ${getStatusClass(result.status)}">
      <div class="result-header">
        <span class="status-icon">${getStatusIcon(result.status)}</span>
        <span class="check-name">${escapeHtml(result.check)}</span>
        <span class="meta">${result.runs} runs, ${formatDuration(result.duration)}</span>
      </div>`;

  if (result.status === "fail") {
    if (result.counterexample) {
      html += `
      <div class="counterexample">
        <strong>Counterexample:</strong>
        <pre>${escapeHtml(JSON.stringify(result.counterexample, null, 2))}</pre>
      </div>`;
    }
    if (result.error) {
      html += `
      <div class="error">
        <strong>Error:</strong> ${escapeHtml(result.error)}
      </div>`;
    }
    html += `
      <div class="replay">
        <strong>Replay:</strong> <code>./web-fuzz --check ${result.check} --seed ${seed}</code>
      </div>`;
  }

  if (result.status === "skip" && result.error) {
    html += `
      <div class="skip-reason">
        <em>Skipped: ${escapeHtml(result.error)}</em>
      </div>`;
  }

  html += `</div>`;
  return html;
}

export function generateHtmlReport(report: Report): string {
  const { passed, failed, skipped, total } = report.summary;
  const passRate = total > 0 ? Math.round((passed / (total - skipped)) * 100) : 0;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>web-fuzz Report</title>
  <style>
    :root {
      --color-pass: #22c55e;
      --color-fail: #ef4444;
      --color-skip: #a1a1aa;
      --color-bg: #fafafa;
      --color-card: #ffffff;
      --color-border: #e5e5e5;
      --color-text: #171717;
      --color-text-muted: #737373;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--color-bg);
      color: var(--color-text);
      line-height: 1.6;
      padding: 2rem;
    }

    .container { max-width: 900px; margin: 0 auto; }

    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--color-border);
    }

    h1 { font-size: 1.5rem; font-weight: 600; }

    .meta-info {
      color: var(--color-text-muted);
      font-size: 0.875rem;
    }

    .summary {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .summary-card {
      background: var(--color-card);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      padding: 1rem;
      text-align: center;
    }

    .summary-card .value {
      font-size: 2rem;
      font-weight: 700;
    }

    .summary-card .label {
      color: var(--color-text-muted);
      font-size: 0.875rem;
    }

    .summary-card.pass .value { color: var(--color-pass); }
    .summary-card.fail .value { color: var(--color-fail); }
    .summary-card.skip .value { color: var(--color-skip); }

    .results { display: flex; flex-direction: column; gap: 1rem; }

    .result {
      background: var(--color-card);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      padding: 1rem;
      border-left: 4px solid var(--color-border);
    }

    .result.status-pass { border-left-color: var(--color-pass); }
    .result.status-fail { border-left-color: var(--color-fail); }
    .result.status-skip { border-left-color: var(--color-skip); }

    .result-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .status-icon {
      font-size: 1.25rem;
      width: 1.5rem;
      text-align: center;
    }

    .status-pass .status-icon { color: var(--color-pass); }
    .status-fail .status-icon { color: var(--color-fail); }
    .status-skip .status-icon { color: var(--color-skip); }

    .check-name { font-weight: 600; }
    .meta { color: var(--color-text-muted); font-size: 0.875rem; margin-left: auto; }

    .counterexample, .error, .replay, .skip-reason {
      margin-top: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--color-border);
      font-size: 0.875rem;
    }

    pre {
      background: var(--color-bg);
      padding: 0.75rem;
      border-radius: 4px;
      overflow-x: auto;
      margin-top: 0.5rem;
    }

    code {
      background: var(--color-bg);
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-family: 'SF Mono', Consolas, monospace;
      font-size: 0.875rem;
    }

    .error { color: var(--color-fail); }
    .skip-reason { color: var(--color-skip); }

    footer {
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid var(--color-border);
      text-align: center;
      color: var(--color-text-muted);
      font-size: 0.875rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>web-fuzz Report</h1>
      <div class="meta-info">
        <div>Target: ${escapeHtml(report.baseUrl)}</div>
        <div>Seed: ${report.seed}</div>
        <div>${report.timestamp}</div>
      </div>
    </header>

    <div class="summary">
      <div class="summary-card">
        <div class="value">${passRate}%</div>
        <div class="label">Pass Rate</div>
      </div>
      <div class="summary-card pass">
        <div class="value">${passed}</div>
        <div class="label">Passed</div>
      </div>
      <div class="summary-card fail">
        <div class="value">${failed}</div>
        <div class="label">Failed</div>
      </div>
      <div class="summary-card skip">
        <div class="value">${skipped}</div>
        <div class="label">Skipped</div>
      </div>
    </div>

    <div class="results">
      ${report.results.map(r => renderResult(r, report.seed)).join("\n")}
    </div>

    <footer>
      Generated by web-fuzz v${report.version}
    </footer>
  </div>
</body>
</html>`;
}

export async function htmlReporter(report: Report, outputPath?: string): Promise<void> {
  const html = generateHtmlReport(report);
  const filePath = outputPath ?? "web-fuzz-report.html";

  await Deno.writeTextFile(filePath, html);
  console.log(`HTML report saved to: ${filePath}`);
}
