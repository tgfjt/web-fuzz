import { parseArgs } from "jsr:@std/cli@^1.0.0";
import type { CliOptions, ReporterType } from "./types.ts";

const VERSION = "1.0.0";

const HELP = `
web-fuzz v${VERSION}
Webアプリケーションの普遍的な性質をProperty-Based Testing / Fuzzingで検証するCLIツール

Usage: web-fuzz [options]

Options:
  --init                  設定ファイルのテンプレートを生成
  -c, --config <path>     設定ファイルパス (default: "web-fuzz.config.yaml")
  -n, --num-runs <n>      試行回数を上書き
  -s, --seed <seed>       乱数シード（再現用）
  --check <name>          特定のチェックのみ実行
  --reporter <type>       レポート形式 (console|json|html)
  --no-headless           ブラウザを表示して実行
  -v, --verbose           詳細ログ出力
  -h, --help              ヘルプ表示
  --version               バージョン表示

Examples:
  ./web-fuzz --init                       # 設定ファイルを生成
  ./web-fuzz                              # デフォルト設定で実行
  ./web-fuzz -n 100                       # 100回試行
  ./web-fuzz --check formFuzzing          # フォームファジングのみ
  ./web-fuzz --seed 12345 --reporter json # CI用
`;

export function parseCliArgs(args: string[]): CliOptions {
  const parsed = parseArgs(args, {
    string: ["config", "num-runs", "seed", "check", "reporter"],
    boolean: ["headless", "verbose", "help", "version", "init"],
    alias: {
      c: "config",
      n: "num-runs",
      s: "seed",
      v: "verbose",
      h: "help",
    },
    default: {
      config: "web-fuzz.config.yaml",
      headless: true,
      verbose: false,
    },
    negatable: ["headless"],
  });

  if (parsed.help) {
    console.log(HELP);
    Deno.exit(0);
  }

  if (parsed.version) {
    console.log(`web-fuzz v${VERSION}`);
    Deno.exit(0);
  }

  const numRuns = parsed["num-runs"]
    ? parseInt(parsed["num-runs"], 10)
    : undefined;
  const seed = parsed.seed ? parseInt(parsed.seed, 10) : undefined;

  if (numRuns !== undefined && (isNaN(numRuns) || numRuns < 1)) {
    console.error("Error: --num-runs must be a positive integer");
    Deno.exit(1);
  }

  if (seed !== undefined && isNaN(seed)) {
    console.error("Error: --seed must be a valid integer");
    Deno.exit(1);
  }

  const reporter = parsed.reporter as ReporterType | undefined;
  if (reporter && !["console", "json", "html"].includes(reporter)) {
    console.error("Error: --reporter must be one of: console, json, html");
    Deno.exit(1);
  }

  return {
    config: parsed.config,
    numRuns,
    seed,
    check: parsed.check,
    reporter,
    headless: parsed.headless,
    verbose: parsed.verbose,
    init: parsed.init,
  };
}

export { VERSION };
