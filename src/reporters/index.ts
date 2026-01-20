import type { Report, ReporterType } from "../types.ts";
import { consoleReporter } from "./console.ts";
import { jsonReporter } from "./json.ts";

export function report(report: Report, type: ReporterType): void {
  switch (type) {
    case "console":
      consoleReporter(report);
      break;
    case "json":
      jsonReporter(report);
      break;
    case "html":
      // HTML reporter not implemented yet
      console.log("HTML reporter is not implemented yet");
      consoleReporter(report);
      break;
  }
}

export { consoleReporter, jsonReporter };
