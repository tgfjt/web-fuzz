# web-fuzz

Webアプリの「壊れていない」を自動検証するProperty-Based Testing / Fuzzingツール。

## 特徴

- **ドメイン非依存** - どんなWebアプリにも使える汎用チェック
- **設定ファイルだけで導入可能** - コード変更不要
- **CI対応** - シード固定で再現可能、JSON出力でパース可能

## インストール

```bash
# Playwrightブラウザをインストール（初回のみ）
npx playwright install chromium
```

## クイックスタート

```bash
# 1. 設定ファイルを生成
deno run -A https://raw.githubusercontent.com/tgfjt/web-fuzz/main/src/index.ts --init

# 2. web-fuzz.config.yaml を編集（baseUrl等を設定）

# 3. 実行
deno run -A https://raw.githubusercontent.com/tgfjt/web-fuzz/main/src/index.ts
```

ローカルで使う場合：

```bash
git clone https://github.com/tgfjt/web-fuzz.git
cd web-fuzz
deno run -A src/index.ts --init
deno run -A src/index.ts
```

## 外部リポジトリで使う

対象アプリのリポジトリに `web-fuzz.config.yaml` を置いて実行できます。

```bash
cd your-app/
# 設定ファイルを生成
deno run -A https://raw.githubusercontent.com/tgfjt/web-fuzz/main/src/index.ts --init

# baseUrl等を編集して実行
deno run -A https://raw.githubusercontent.com/tgfjt/web-fuzz/main/src/index.ts
```

## チェック項目

| チェック | 検証内容 | 検出できる問題 |
|----------|----------|----------------|
| noServerError | 全ページにアクセスして500エラーが出ないか | ルーティングミス、未処理例外 |
| formFuzzing | フォームに攻撃的な文字列を入力してクラッシュしないか（`setup`で事前操作も可） | XSS、バリデーション漏れ |
| queryParamFuzzing | 不正なクエリパラメータでアクセスしても壊れないか | URLパーサーのバグ |
| historyNavigation | 戻る/進むを繰り返しても状態が壊れないか | SPA履歴管理のバグ |
| rapidClick | ボタン連打で二重送信やクラッシュが起きないか | Race condition、UIロック漏れ |
| reloadStateRestore | リロード後もURLと表示が維持されるか | 状態管理のバグ |

## 設定ファイル

```yaml
# web-fuzz.config.yaml

baseUrl: http://localhost:3000

numRuns: 50              # 試行回数
timeout: 5000            # タイムアウト(ms)
headless: true           # ヘッドレスモード

# チェック対象パス
paths:
  include:
    - /
    - /about
    - /contact
  exclude:
    - /admin/**
    - /api/**

# フォームファジング対象
forms:
  - path: /contact
    selector: form
    submit: button[type="submit"]
  - path: /app
    selector: form
    submit: button[type="submit"]
    setup:                           # フォーム表示前の操作
      - click: button:has-text("開始")
      - waitFor: form

# ボタン連打チェック対象（フォーム以外）
buttons:
  - path: /
    selector: button:has-text("送信")

# 有効にするチェック
checks:
  noServerError: true
  formFuzzing: true
  historyNavigation: true
  rapidClick: true
  queryParamFuzzing: true
  reloadStateRestore: false

# 認証（必要な場合）
# auth:
#   type: form
#   loginUrl: /login
#   credentials:
#     email: test@example.com
#     password: testpass

reporter: console        # console | json | html
```

## CLI オプション

```
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
```

## 出力例

```
web-fuzz v1.0.0
Target: http://localhost:3000
Seed: 1768892166349

✓ noServerError (10 runs, 341ms)
  → 全ページに正常アクセスできました

✓ formFuzzing (10 runs, 55.8s)
  → XSS/SQLi等の攻撃的な入力でもクラッシュしませんでした

✓ queryParamFuzzing (10 runs, 2.5s)
  → 不正なクエリパラメータでも正常に処理されました

✓ historyNavigation (10 runs, 857ms)
  → 戻る/進む操作を繰り返しても状態が壊れませんでした

✓ rapidClick (10 runs, 486ms)
  → ボタン連打でも二重送信やクラッシュは起きませんでした

✓ reloadStateRestore (10 runs, 515ms)
  → リロード後もURLと表示が維持されました

Results: 6/6 passed
```

## CI での使い方

```yaml
# GitHub Actions
- name: Run web-fuzz
  run: |
    npx playwright install chromium
    deno run -A https://raw.githubusercontent.com/tgfjt/web-fuzz/main/src/index.ts --seed 12345 --reporter json > fuzz-report.json
```

シード固定で再現性を確保、JSON出力で結果をパースできます。

## 注意事項

- **本番環境には絶対に向けない**（DBへの書き込み、大量リクエスト発生の可能性）
- ローカル or ステージング環境専用
