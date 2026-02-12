import type { Page } from "npm:playwright@^1.40.0";
import * as fc from "npm:fast-check@^3.15.0";
import type { Config, CheckResult } from "../types.ts";
import { pathArbitrary } from "../arbitraries/index.ts";

export async function noServerError(
  page: Page,
  config: Config,
  options?: { seed?: number; numRuns?: number }
): Promise<CheckResult> {
  const startTime = Date.now();
  let runCount = 0;
  let counterexample: unknown = undefined;
  let errorMessage: string | undefined = undefined;

  try {
    await fc.assert(
      fc.asyncProperty(
        pathArbitrary(config.paths),
        async (path) => {
          runCount++;
          const url = `${config.baseUrl}${path}`;

          const response = await page.goto(url, {
            timeout: config.timeout,
            waitUntil: "domcontentloaded",
          });

          const status = response?.status() ?? 0;

          if (status >= 500) {
            throw new Error(`Server error ${status} at ${url}`);
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
      check: "noServerError",
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
      check: "noServerError",
      status: "fail",
      runs: runCount,
      duration: Date.now() - startTime,
      counterexample,
      error: errorMessage,
    };
  }
}
