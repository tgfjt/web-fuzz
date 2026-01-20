# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 開発コマンド

```bash
# 実行
deno run -A src/index.ts --config web-fuzz.config.yaml

# 設定テンプレート生成
deno run -A src/index.ts --init

# バイナリにコンパイル
deno compile -A -o web-fuzz src/index.ts

# 初回セットアップ（Playwrightブラウザ）
npx playwright install chromium
```

## アーキテクチャ

Deno + TypeScriptで構築されたWebアプリ向けProperty-Based Testing / Fuzzingツール。

**コアフロー:**
```
index.ts → cli.ts → config.ts → runner.ts → checks/*
```

**主要モジュール:**
- `src/checks/` - 組み込みチェック（noServerError, formFuzzing, queryParamFuzzing, historyNavigation, rapidClick, reloadStateRestore）
- `src/arbitraries/` - fast-check用データ生成器（maliciousString, webPath）
- `src/auth/` - 認証ハンドラ（form, cookie, bearer）
- `src/reporters/` - 出力フォーマッタ（console, json, html）

## チェック実装パターン

新しいチェックを追加する場合は `src/types.ts` の `CheckFunction` 型に従う:

```typescript
type CheckFunction = (
  page: Page,
  config: Config,
  options?: { seed?: number; numRuns?: number }
) => Promise<CheckResult>;
```

各チェックは `fc.assert()` と `fc.asyncProperty()` を使用してプロパティベーステストを実行する。

## 注意事項

- 本番環境には絶対に向けない（DBへの書き込み、大量リクエスト発生の可能性）
- コンソール出力は日本語
- カスタムチェックは `customChecks` 設定で外部ファイル指定可能
