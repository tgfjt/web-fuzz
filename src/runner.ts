import { chromium, type Browser, type Page } from "playwright";
import type { Config, CliOptions, Report, CheckResult } from "./types.ts";
import { checks } from "./checks/index.ts";
import { report as outputReport } from "./reporters/index.ts";
import { VERSION } from "./cli.ts";

interface RunnerOptions {
  config: Config;
  cli: CliOptions;
}

export async function run({ config, cli }: RunnerOptions): Promise<Report> {
  const seed = cli.seed ?? Date.now();
  const results: CheckResult[] = [];

  let browser: Browser | undefined;
  let page: Page | undefined;

  try {
    browser = await chromium.launch({
      headless: config.headless,
    });

    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
    });

    page = await context.newPage();

    // Set default timeout
    page.setDefaultTimeout(config.timeout);

    // Determine which checks to run
    const checksToRun = getChecksToRun(config, cli.check);

    for (const checkName of checksToRun) {
      const checkFn = checks[checkName];
      if (!checkFn) {
        console.error(`Unknown check: ${checkName}`);
        continue;
      }

      if (cli.verbose) {
        console.log(`Running check: ${checkName}...`);
      }

      const result = await checkFn(page, config, {
        seed,
        numRuns: config.numRuns,
      });

      results.push(result);
    }
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
    if (browser) {
      await browser.close().catch(() => {});
    }
  }

  const summary = {
    total: results.length,
    passed: results.filter((r) => r.status === "pass").length,
    failed: results.filter((r) => r.status === "fail").length,
    skipped: results.filter((r) => r.status === "skip").length,
  };

  const report: Report = {
    version: VERSION,
    timestamp: new Date().toISOString(),
    baseUrl: config.baseUrl,
    seed,
    results,
    summary,
  };

  // Output report
  outputReport(report, config.reporter);

  return report;
}

function getChecksToRun(config: Config, specificCheck?: string): string[] {
  if (specificCheck) {
    if (!checks[specificCheck]) {
      throw new Error(`Unknown check: ${specificCheck}`);
    }
    return [specificCheck];
  }

  const enabledChecks: string[] = [];

  if (config.checks.noServerError) {
    enabledChecks.push("noServerError");
  }
  if (config.checks.formFuzzing) {
    enabledChecks.push("formFuzzing");
  }
  if (config.checks.queryParamFuzzing) {
    enabledChecks.push("queryParamFuzzing");
  }
  if (config.checks.historyNavigation) {
    enabledChecks.push("historyNavigation");
  }
  if (config.checks.rapidClick) {
    enabledChecks.push("rapidClick");
  }
  if (config.checks.reloadStateRestore) {
    enabledChecks.push("reloadStateRestore");
  }

  return enabledChecks;
}
