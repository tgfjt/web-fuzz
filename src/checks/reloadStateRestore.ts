import type { Page } from "npm:playwright@^1.40.0";
import * as fc from "npm:fast-check@^3.15.0";
import type { Config, CheckResult } from "../types.ts";
import { pathArbitrary } from "../arbitraries/index.ts";

export async function reloadStateRestore(
  page: Page,
  config: Config,
  options?: { seed?: number; numRuns?: number }
): Promise<CheckResult> {
  const startTime = Date.now();
  let runCount = 0;
  let counterexample: unknown = undefined;
  let errorMessage: string | undefined = undefined;

  const pageErrors: string[] = [];
  page.on("pageerror", (err) => {
    pageErrors.push(err.message);
  });

  try {
    await fc.assert(
      fc.asyncProperty(pathArbitrary(config.paths), async (path) => {
        runCount++;
        pageErrors.length = 0;

        await page.goto(`${config.baseUrl}${path}`, {
          timeout: config.timeout,
          waitUntil: "domcontentloaded",
        });

        const urlBefore = page.url();

        await page.reload({
          timeout: config.timeout,
          waitUntil: "domcontentloaded",
        });

        const urlAfter = page.url();

        if (urlAfter !== urlBefore) {
          throw new Error(
            `URL changed after reload: ${urlBefore} -> ${urlAfter}`
          );
        }

        const isVisible = await page.locator("body").isVisible().catch(() => false);
        if (!isVisible) {
          throw new Error("Page body is not visible after reload");
        }

        if (pageErrors.length > 0) {
          throw new Error(`JavaScript error: ${pageErrors[0]}`);
        }

        return true;
      }),
      {
        numRuns: options?.numRuns ?? config.numRuns,
        seed: options?.seed,
        verbose: false,
      }
    );

    return {
      check: "reloadStateRestore",
      status: "pass",
      runs: runCount,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("Property failed")) {
      const match = error.message.match(/Counterexample: (.+)/);
      if (match) {
        try {
          counterexample = JSON.parse(match[1]);
        } catch {
          counterexample = match[1];
        }
      }
      errorMessage = error.message.split("\n")[0];
    } else {
      errorMessage = error instanceof Error ? error.message : String(error);
    }

    return {
      check: "reloadStateRestore",
      status: "fail",
      runs: runCount,
      duration: Date.now() - startTime,
      counterexample,
      error: errorMessage,
    };
  }
}
