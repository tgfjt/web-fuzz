import type { Page } from "playwright";
import type * as fc from "fast-check";

// 認証タイプ
export type AuthType = "form" | "cookie" | "bearer";

// 認証設定
export interface AuthConfig {
  type: AuthType;
  loginUrl?: string;
  credentials?: {
    email: string;
    password: string;
  };
  cookies?: Array<{
    name: string;
    value: string;
    domain?: string;
    path?: string;
  }>;
  token?: string;
}

// パス設定
export interface PathConfig {
  include: string[];
  exclude: string[];
}

// フォーム設定
export interface FormConfig {
  path: string;
  selector: string;
  submit: string;
}

// ボタン設定（連打チェック用）
export interface ButtonConfig {
  path: string;
  selector: string;
}

// チェック設定
export interface ChecksConfig {
  noServerError?: boolean;
  formFuzzing?: boolean;
  historyNavigation?: boolean;
  rapidClick?: boolean;
  queryParamFuzzing?: boolean;
  reloadStateRestore?: boolean;
}

// チェックオプション
export interface CheckOptions {
  rapidClick?: {
    maxClicks?: number;
    targetSelector?: string;
  };
  queryParamFuzzing?: {
    params?: string[];
  };
}

// レポーター種別
export type ReporterType = "console" | "json" | "html";

// 設定ファイル全体
export interface Config {
  baseUrl: string;
  numRuns: number;
  timeout: number;
  headless: boolean;
  auth?: AuthConfig;
  paths: PathConfig;
  forms: FormConfig[];
  buttons: ButtonConfig[];
  checks: ChecksConfig;
  checkOptions?: CheckOptions;
  customChecks?: string[];
  reporter: ReporterType;
}

// CLIオプション
export interface CliOptions {
  config: string;
  numRuns?: number;
  seed?: number;
  check?: string;
  reporter?: ReporterType;
  headless: boolean;
  verbose: boolean;
  init: boolean;
}

// チェック結果
export interface CheckResult {
  check: string;
  status: "pass" | "fail" | "skip";
  runs: number;
  duration: number;
  counterexample?: unknown;
  error?: string;
}

// レポート
export interface Report {
  version: string;
  timestamp: string;
  baseUrl: string;
  seed: number;
  results: CheckResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
}

// チェック関数の型
export type CheckFunction = (
  page: Page,
  config: Config,
  options?: { seed?: number; numRuns?: number }
) => Promise<CheckResult>;

// Arbitraryコンテキスト
export interface ArbitraryContext {
  config: Config;
}
