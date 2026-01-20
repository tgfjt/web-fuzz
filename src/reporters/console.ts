import chalk from "chalk";
import type { Report, CheckResult } from "../types.ts";
import { VERSION } from "../cli.ts";

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatResult(result: CheckResult, seed: number): string {
  const duration = formatDuration(result.duration);

  if (result.status === "pass") {
    return chalk.green(`✓ ${result.check}`) + chalk.gray(` (${result.runs} runs, ${duration})`);
  }

  if (result.status === "skip") {
    return chalk.yellow(`- ${result.check}`) + chalk.gray(` (skipped: ${result.error})`);
  }

  // Failed
  let output = chalk.red(`✗ ${result.check}`) + chalk.gray(` (${result.runs} runs, ${duration})`);

  if (result.counterexample) {
    output += "\n" + chalk.gray("  Counterexample:");
    const lines = JSON.stringify(result.counterexample, null, 2).split("\n");
    for (const line of lines) {
      output += "\n" + chalk.gray("    " + line);
    }
  }

  if (result.error) {
    output += "\n" + chalk.red("  Error: " + result.error);
  }

  output += "\n" + chalk.gray(`  Replay: ./web-fuzz --check ${result.check} --seed ${seed}`);

  return output;
}

export function consoleReporter(report: Report): void {
  console.log();
  console.log(chalk.bold(`web-fuzz v${VERSION}`));
  console.log(chalk.gray(`Target: ${report.baseUrl}`));
  console.log(chalk.gray(`Seed: ${report.seed}`));
  console.log();

  for (const result of report.results) {
    console.log(formatResult(result, report.seed));
    if (result.status === "fail") {
      console.log();
    }
  }

  console.log();

  const { total, passed, failed, skipped } = report.summary;
  const summaryColor = failed > 0 ? chalk.red : chalk.green;
  let summary = `Results: ${passed}/${total - skipped} passed`;
  if (skipped > 0) {
    summary += chalk.gray(` (${skipped} skipped)`);
  }
  console.log(summaryColor(summary));
  console.log();
}
