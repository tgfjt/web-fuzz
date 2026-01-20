import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { dirname, resolve } from "@std/path";
import type { Config, CliOptions, Report, CheckResult, CheckFunction } from "./types.ts";
import { checks as builtinChecks } from "./checks/index.ts";
import { loadCustomChecks } from "./checks/custom.ts";
import { report as outputReport } from "./reporters/index.ts";
import { VERSION } from "./cli.ts";
import { authenticate } from "./auth/index.ts";

interface RunnerOptions {
  config: Config;
  cli: CliOptions;
}

export async function run({ config, cli }: RunnerOptions): Promise<Report> {
  const seed = cli.seed ?? Date.now();
  const results: CheckResult[] = [];

  // Load custom checks if configured
  const configDir = dirname(resolve(cli.config));
  const customChecks = config.customChecks
    ? await loadCustomChecks(config.customChecks, configDir)
    : {};

  // Merge builtin and custom checks
  const allChecks: Record<string, CheckFunction> = {
    ...builtinChecks,
    ...customChecks,
  };

  let browser: Browser | undefined;
  let context: BrowserContext | undefined;
  let page: Page | undefined;

  try {
    browser = await chromium.launch({
      headless: config.headless,
    });

    context = await browser.newContext({
      ignoreHTTPSErrors: true,
    });

    page = await context.newPage();

    // Set default timeout
    page.setDefaultTimeout(config.timeout);

    // Authenticate if configured
    if (config.auth) {
      if (cli.verbose) {
        console.log(`Authenticating with ${config.auth.type}...`);
      }
      const authSuccess = await authenticate(context, page, config);
      if (!authSuccess) {
        console.warn("Warning: Authentication may have failed");
      }
    }

    // Determine which checks to run
    const checksToRun = getChecksToRun(config, allChecks, cli.check);

    for (const checkName of checksToRun) {
      const checkFn = allChecks[checkName];
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
    if (context) {
      await context.close().catch(() => {});
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
  await outputReport(report, config.reporter);

  return report;
}

function getChecksToRun(
  config: Config,
  allChecks: Record<string, CheckFunction>,
  specificCheck?: string
): string[] {
  if (specificCheck) {
    if (!allChecks[specificCheck]) {
      throw new Error(`Unknown check: ${specificCheck}`);
    }
    return [specificCheck];
  }

  const enabledChecks: string[] = [];

  // Built-in checks
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

  // Custom checks (always enabled if configured)
  if (config.customChecks) {
    for (const checkPath of config.customChecks) {
      const checkName = checkPath.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "";
      if (checkName && allChecks[checkName]) {
        enabledChecks.push(checkName);
      }
    }
  }

  return enabledChecks;
}
