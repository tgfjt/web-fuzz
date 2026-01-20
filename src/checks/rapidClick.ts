import type { Page } from "playwright";
import * as fc from "fast-check";
import type { Config, CheckResult } from "../types.ts";

export async function rapidClick(
  page: Page,
  config: Config,
  options?: { seed?: number; numRuns?: number }
): Promise<CheckResult> {
  if (config.forms.length === 0) {
    return {
      check: "rapidClick",
      status: "skip",
      runs: 0,
      duration: 0,
      error: "No forms configured",
    };
  }

  const startTime = Date.now();
  let runCount = 0;
  let counterexample: unknown = undefined;
  let errorMessage: string | undefined = undefined;

  const maxClicks = config.checkOptions?.rapidClick?.maxClicks ?? 10;

  const pageErrors: string[] = [];
  page.on("pageerror", (err) => {
    pageErrors.push(err.message);
  });

  page.on("dialog", async (dialog) => {
    await dialog.dismiss();
  });

  try {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          formIndex: fc.nat({ max: config.forms.length - 1 }),
          clicks: fc.integer({ min: 2, max: maxClicks }),
        }),
        async ({ formIndex, clicks }) => {
          runCount++;
          pageErrors.length = 0;

          const form = config.forms[formIndex];
          await page.goto(`${config.baseUrl}${form.path}`, {
            timeout: config.timeout,
            waitUntil: "domcontentloaded",
          });

          const targetSelector =
            config.checkOptions?.rapidClick?.targetSelector ?? form.submit;
          const button = page.locator(targetSelector).first();

          const isVisible = await button.isVisible().catch(() => false);
          if (!isVisible) {
            // Skip if button not found
            return true;
          }

          // Rapid click simultaneously
          await Promise.all(
            Array(clicks)
              .fill(0)
              .map(() => button.click({ force: true }).catch(() => {}))
          );

          await page.waitForTimeout(500);

          const bodyVisible = await page.locator("body").isVisible().catch(() => false);
          if (!bodyVisible) {
            throw new Error("Page body is not visible after rapid clicks");
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
      check: "rapidClick",
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
      check: "rapidClick",
      status: "fail",
      runs: runCount,
      duration: Date.now() - startTime,
      counterexample,
      error: errorMessage,
    };
  }
}
