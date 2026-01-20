import type { Page } from "playwright";
import * as fc from "fast-check";
import type { Config, CheckResult } from "../types.ts";
import { maliciousStringArb } from "../arbitraries/index.ts";

export async function formFuzzing(
  page: Page,
  config: Config,
  options?: { seed?: number; numRuns?: number }
): Promise<CheckResult> {
  if (config.forms.length === 0) {
    return {
      check: "formFuzzing",
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

  // Listen for page errors
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => {
    pageErrors.push(err.message);
  });

  // Listen for dialog (alert, confirm, prompt)
  page.on("dialog", async (dialog) => {
    await dialog.dismiss();
  });

  try {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          formIndex: fc.nat({ max: config.forms.length - 1 }),
          inputs: fc.dictionary(
            fc.string({ minLength: 1, maxLength: 30 }),
            fc.oneof(
              fc.string(),
              maliciousStringArb(),
              fc.string({ maxLength: 10000 })
            )
          ),
        }),
        async ({ formIndex, inputs }) => {
          runCount++;
          pageErrors.length = 0;

          const form = config.forms[formIndex];
          await page.goto(`${config.baseUrl}${form.path}`, {
            timeout: config.timeout,
            waitUntil: "domcontentloaded",
          });

          // Find all input fields in the form
          const fields = await page
            .locator(`${form.selector} input, ${form.selector} textarea, ${form.selector} select`)
            .all();

          for (const field of fields) {
            const name = await field.getAttribute("name");
            const type = await field.getAttribute("type");
            const tagName = await field.evaluate((el) => el.tagName.toLowerCase());

            // Skip hidden, submit, and button inputs
            if (type === "hidden" || type === "submit" || type === "button") {
              continue;
            }

            const value = name && inputs[name] ? inputs[name] : Object.values(inputs)[0] ?? "test";

            try {
              if (tagName === "select") {
                // For select, try to pick an option
                const options = await field.locator("option").all();
                if (options.length > 0) {
                  const optionValue = await options[0].getAttribute("value");
                  if (optionValue) {
                    await field.selectOption(optionValue);
                  }
                }
              } else if (type === "checkbox" || type === "radio") {
                await field.check().catch(() => {});
              } else if (type === "file") {
                // Skip file inputs for now
              } else {
                await field.fill(value);
              }
            } catch {
              // Ignore fill errors for disabled/readonly fields
            }
          }

          // Click submit
          try {
            await page.locator(form.submit).first().click({ timeout: config.timeout });
          } catch {
            // Submit button might be disabled or not found
          }

          // Wait a bit for any JS errors
          await page.waitForTimeout(500);

          // Check page is still functional
          const body = page.locator("body");
          const isVisible = await body.isVisible().catch(() => false);

          if (!isVisible) {
            throw new Error("Page body is not visible after form submission");
          }

          // Check for unhandled JS errors
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
      check: "formFuzzing",
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
      check: "formFuzzing",
      status: "fail",
      runs: runCount,
      duration: Date.now() - startTime,
      counterexample,
      error: errorMessage,
    };
  }
}
