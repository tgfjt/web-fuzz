import type { Report, ReporterType } from "../types.ts";
import { consoleReporter } from "./console.ts";
import { jsonReporter } from "./json.ts";
import { htmlReporter } from "./html.ts";

export async function report(report: Report, type: ReporterType): Promise<void> {
  switch (type) {
    case "console":
      consoleReporter(report);
      break;
    case "json":
      jsonReporter(report);
      break;
    case "html":
      await htmlReporter(report);
      break;
  }
}

export { consoleReporter, jsonReporter, htmlReporter };
