import type { Report } from "../types.ts";

export function jsonReporter(report: Report): void {
  console.log(JSON.stringify(report, null, 2));
}
