import type { Page } from "playwright";
import * as fc from "fast-check";
import type { Config, CheckResult } from "../types.ts";
import { pathArbitrary } from "../arbitraries/index.ts";

type HistoryAction =
  | { type: "back" }
  | { type: "forward" }
  | { type: "navigate"; path: string };

export async function historyNavigation(
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

  const actionArbitrary: fc.Arbitrary<HistoryAction> = fc.oneof(
    fc.constant({ type: "back" as const }),
    fc.constant({ type: "forward" as const }),
    pathArbitrary(config.paths).map((path) => ({
      type: "navigate" as const,
      path,
    }))
  );

  try {
    await fc.assert(
      fc.asyncProperty(
        fc.array(actionArbitrary, { minLength: 1, maxLength: 15 }),
        async (actions) => {
          runCount++;
          pageErrors.length = 0;

          await page.goto(config.baseUrl, {
            timeout: config.timeout,
            waitUntil: "domcontentloaded",
          });

          for (const action of actions) {
            try {
              if (action.type === "back") {
                await page.goBack({ timeout: config.timeout }).catch(() => {});
              } else if (action.type === "forward") {
                await page.goForward({ timeout: config.timeout }).catch(() => {});
              } else {
                await page.goto(`${config.baseUrl}${action.path}`, {
                  timeout: config.timeout,
                  waitUntil: "domcontentloaded",
                });
              }
            } catch {
              // Navigation errors are expected sometimes
            }
          }

          const isVisible = await page.locator("body").isVisible().catch(() => false);
          if (!isVisible) {
            throw new Error("Page body is not visible after history navigation");
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
      check: "historyNavigation",
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
      check: "historyNavigation",
      status: "fail",
      runs: runCount,
      duration: Date.now() - startTime,
      counterexample,
      error: errorMessage,
    };
  }
}
