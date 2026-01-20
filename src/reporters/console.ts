import chalk from "chalk";
import type { Report, CheckResult } from "../types.ts";
import { VERSION } from "../cli.ts";

// 各チェックの説明（pass/fail両方）
const CHECK_DESCRIPTIONS: Record<string, { pass: string; fail: string }> = {
  noServerError: {
    pass: "全ページに正常アクセスできました",
    fail: "サーバーエラー(500系)が発生しました",
  },
  formFuzzing: {
    pass: "XSS/SQLi等の攻撃的な入力でもクラッシュしませんでした",
    fail: "フォーム入力でエラーが発生しました",
  },
  queryParamFuzzing: {
    pass: "不正なクエリパラメータでも正常に処理されました",
    fail: "クエリパラメータの処理でエラーが発生しました",
  },
  historyNavigation: {
    pass: "戻る/進む操作を繰り返しても状態が壊れませんでした",
    fail: "履歴操作で状態が不整合になりました",
  },
  rapidClick: {
    pass: "ボタン連打でも二重送信やクラッシュは起きませんでした",
    fail: "ボタン連打でエラーが発生しました",
  },
  reloadStateRestore: {
    pass: "リロード後もURLと表示が維持されました",
    fail: "リロードで状態が失われました",
  },
};

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

function getDescription(checkName: string, status: "pass" | "fail"): string {
  const desc = CHECK_DESCRIPTIONS[checkName];
  if (!desc) {
    return status === "pass" ? "チェック通過" : "チェック失敗";
  }
  return desc[status];
}

function formatResult(result: CheckResult, seed: number): string {
  const duration = formatDuration(result.duration);

  if (result.status === "pass") {
    const desc = getDescription(result.check, "pass");
    return (
      chalk.green(`✓ ${result.check}`) +
      chalk.gray(` (${result.runs} runs, ${duration})`) +
      "\n" +
      chalk.gray(`  → ${desc}`)
    );
  }

  if (result.status === "skip") {
    return chalk.yellow(`- ${result.check}`) + chalk.gray(` (skipped: ${result.error})`);
  }

  // Failed
  const desc = getDescription(result.check, "fail");
  let output =
    chalk.red(`✗ ${result.check}`) +
    chalk.gray(` (${result.runs} runs, ${duration})`) +
    "\n" +
    chalk.red(`  → ${desc}`);

  if (result.counterexample) {
    output += "\n" + chalk.gray("  再現データ:");
    const lines = JSON.stringify(result.counterexample, null, 2).split("\n");
    for (const line of lines) {
      output += "\n" + chalk.gray("    " + line);
    }
  }

  if (result.error) {
    output += "\n" + chalk.red("  詳細: " + result.error);
  }

  output += "\n" + chalk.gray(`  再実行: ./web-fuzz --check ${result.check} --seed ${seed}`);

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
    console.log();
  }

  const { total, passed, failed, skipped } = report.summary;
  const summaryColor = failed > 0 ? chalk.red : chalk.green;
  let summary = `Results: ${passed}/${total - skipped} passed`;
  if (skipped > 0) {
    summary += chalk.gray(` (${skipped} skipped)`);
  }
  console.log(summaryColor(summary));
  console.log();
}
