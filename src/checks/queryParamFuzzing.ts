import type { Page } from "playwright";
import * as fc from "fast-check";
import type { Config, CheckResult } from "../types.ts";
import { pathArbitrary, queryParamsArbitrary } from "../arbitraries/index.ts";

export async function queryParamFuzzing(
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
      fc.asyncProperty(
        fc.record({
          path: pathArbitrary(config.paths),
          params: queryParamsArbitrary(),
        }),
        async ({ path, params }) => {
          runCount++;
          pageErrors.length = 0;

          const url = new URL(path, config.baseUrl);
          Object.entries(params).forEach(([k, v]) => {
            url.searchParams.set(k, v);
          });

          const response = await page.goto(url.toString(), {
            timeout: config.timeout,
            waitUntil: "domcontentloaded",
          });

          const status = response?.status() ?? 0;

          if (status >= 500) {
            throw new Error(`Server error ${status} at ${url}`);
          }

          await page.waitForTimeout(200);

          const isVisible = await page.locator("body").isVisible().catch(() => false);
          if (!isVisible) {
            throw new Error("Page body is not visible");
          }

          if (pageErrors.length > 0) {
            throw new Error(`JavaScript error: ${pageErrors[0]}`);
          }

          return true;
        }
      ),
      {
        numRuns: options?.numRuns ?? config.numRuns,
        seed: options?.seed,
        verbose: false,
      }
    );

    return {
      check: "queryParamFuzzing",
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
      check: "queryParamFuzzing",
      status: "fail",
      runs: runCount,
      duration: Date.now() - startTime,
      counterexample,
      error: errorMessage,
    };
  }
}
