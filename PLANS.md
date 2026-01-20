# web-fuzz 仕様書

Webアプリケーションの普遍的な性質をProperty-Based Testing / Fuzzingで検証する社内CLIツール。

---

## 目的

- ドメイン非依存の「Webアプリとして壊れていない」ことを自動検証
- 設定ファイルだけで既存プロジェクトに導入可能
- CIで継続的に回し、エッジケースを早期発見

---

## 基本仕様

### 技術スタック

| 項目 | 選定 |
|------|------|
| ランタイム | Deno |
| 言語 | TypeScript |
| ブラウザ自動化 | Playwright (npm:playwright) |
| PBTフレームワーク | fast-check (npm:fast-check) |
| CLI | @std/cli または commander |
| 設定ファイル | @std/yaml |

### インストール・実行

```bash
# 初回のみ: Playwrightブラウザインストール
npx playwright install chromium

# ローカル実行
deno run -A src/index.ts --config web-fuzz.config.yaml

# CI用（シード固定）
deno run -A src/index.ts --seed 12345 --reporter json > fuzz-report.json

# 単一バイナリ化（配布用）
deno compile -A -o web-fuzz src/index.ts
./web-fuzz --config web-fuzz.config.yaml
```

---

## 設定ファイル仕様

```yaml
# web-fuzz.config.yaml

baseUrl: http://localhost:3000

# 実行設定
numRuns: 50              # デフォルトの試行回数
timeout: 5000            # 各操作のタイムアウト(ms)
headless: true           # ヘッドレスモード

# 認証（必要な場合）
auth:
  type: form             # form | cookie | bearer
  loginUrl: /login
  credentials:
    email: test@example.com
    password: testpass
  # または
  # type: cookie
  # cookies:
  #   - name: session
  #     value: xxx

# チェック対象パス
paths:
  include:
    - /
    - /about
    - /contact
    - /dashboard/**
  exclude:
    - /admin/**
    - /api/**

# フォームファジング対象
forms:
  - path: /contact
    selector: form
    submit: button[type="submit"]
  - path: /search
    selector: "#search-form"
    submit: "#search-btn"

# 有効にするチェック
checks:
  noServerError: true
  formFuzzing: true
  historyNavigation: true
  rapidClick: true
  queryParamFuzzing: true
  # reloadStateRestore: false  # 無効化

# チェックごとの設定（オプション）
checkOptions:
  rapidClick:
    maxClicks: 10
    targetSelector: button[type="submit"]
  queryParamFuzzing:
    params: [q, page, sort, filter]

# レポート
reporter: console        # console | json | html
```

---

## 実装するチェック

### 1. noServerError

任意のパスにアクセスして500系エラーが返らないことを検証。

```typescript
// checks/noServerError.ts
export const noServerError = (page: Page, config: Config) =>
  fc.asyncProperty(
    pathArbitrary(config.paths),
    async (path) => {
      const res = await page.goto(`${config.baseUrl}${path}`);
      const status = res?.status() ?? 0;
      expect(status).toBeLessThan(500);
    }
  );
```

**検出できる問題**: ルーティングミス、未処理例外、DB接続エラー

---

### 2. formFuzzing

フォームに任意の文字列を入力して送信し、クラッシュしないことを検証。

```typescript
// checks/formFuzzing.ts
export const formFuzzing = (page: Page, config: Config) =>
  fc.asyncProperty(
    fc.record({
      formIndex: fc.nat({ max: config.forms.length - 1 }),
      inputs: fc.dictionary(fc.string(), fc.oneof(
        fc.string(),
        maliciousStringArb(),  // XSS, SQLi パターン含む
        fc.string({ maxLength: 10000 }),  // 長大文字列
      )),
    }),
    async ({ formIndex, inputs }) => {
      const form = config.forms[formIndex];
      await page.goto(`${config.baseUrl}${form.path}`);
      
      const fields = await page.locator(`${form.selector} input, ${form.selector} textarea`).all();
      for (const field of fields) {
        const name = await field.getAttribute('name') ?? '';
        if (inputs[name]) {
          await field.fill(inputs[name]);
        }
      }
      
      await page.locator(form.submit).click();
      await expect(page.locator('body')).toBeVisible();
    }
  );
```

**検出できる問題**: XSS、バリデーション漏れ、JSエラー

---

### 3. queryParamFuzzing

任意のクエリパラメータでアクセスしてクラッシュしないことを検証。

```typescript
// checks/queryParamFuzzing.ts
export const queryParamFuzzing = (page: Page, config: Config) =>
  fc.asyncProperty(
    fc.record({
      path: pathArbitrary(config.paths),
      params: fc.dictionary(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.oneof(fc.string(), fc.stringify(fc.jsonValue()))
      ),
    }),
    async ({ path, params }) => {
      const url = new URL(path, config.baseUrl);
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
      
      const res = await page.goto(url.toString());
      expect(res?.status()).toBeLessThan(500);
      await expect(page.locator('body')).toBeVisible();
    }
  );
```

**検出できる問題**: URLパーサーのバグ、prototype pollution

---

### 4. historyNavigation

戻る/進む操作を繰り返しても状態が壊れないことを検証。

```typescript
// checks/historyNavigation.ts
export const historyNavigation = (page: Page, config: Config) =>
  fc.asyncProperty(
    fc.array(
      fc.oneof(
        fc.constant({ type: 'back' }),
        fc.constant({ type: 'forward' }),
        fc.record({ type: fc.constant('navigate'), path: pathArbitrary(config.paths) })
      ),
      { minLength: 1, maxLength: 15 }
    ),
    async (actions) => {
      await page.goto(config.baseUrl);
      
      for (const action of actions) {
        if (action.type === 'back') {
          await page.goBack().catch(() => {});
        } else if (action.type === 'forward') {
          await page.goForward().catch(() => {});
        } else {
          await page.goto(`${config.baseUrl}${action.path}`);
        }
      }
      
      await expect(page.locator('body')).toBeVisible();
    }
  );
```

**検出できる問題**: SPA履歴管理のバグ、状態不整合

---

### 5. rapidClick

ボタン連打で二重送信やクラッシュが起きないことを検証。

```typescript
// checks/rapidClick.ts
export const rapidClick = (page: Page, config: Config) =>
  fc.asyncProperty(
    fc.record({
      formIndex: fc.nat({ max: config.forms.length - 1 }),
      clicks: fc.integer({ min: 2, max: config.checkOptions?.rapidClick?.maxClicks ?? 10 }),
    }),
    async ({ formIndex, clicks }) => {
      const form = config.forms[formIndex];
      await page.goto(`${config.baseUrl}${form.path}`);
      
      // 同時に連打
      const button = page.locator(form.submit);
      await Promise.all(Array(clicks).fill(0).map(() => button.click().catch(() => {})));
      
      // 少し待ってから状態確認
      await page.waitForTimeout(500);
      await expect(page.locator('body')).toBeVisible();
    }
  );
```

**検出できる問題**: 二重送信、Race condition、UIロック漏れ

---

### 6. reloadStateRestore（オプション）

リロード後に状態が復元されることを検証（SPA向け）。

```typescript
// checks/reloadStateRestore.ts
export const reloadStateRestore = (page: Page, config: Config) =>
  fc.asyncProperty(
    pathArbitrary(config.paths),
    async (path) => {
      await page.goto(`${config.baseUrl}${path}`);
      const urlBefore = page.url();
      
      await page.reload();
      
      const urlAfter = page.url();
      expect(urlAfter).toBe(urlBefore);
      await expect(page.locator('body')).toBeVisible();
    }
  );
```

---

## カスタムArbitrary

```typescript
// arbitraries/maliciousString.ts
export const maliciousStringArb = () =>
  fc.oneof(
    // XSS
    fc.constant('<script>alert(1)</script>'),
    fc.constant('"><img src=x onerror=alert(1)>'),
    fc.constant("'-alert(1)-'"),
    // SQLi
    fc.constant("' OR '1'='1"),
    fc.constant("1; DROP TABLE users;--"),
    // 特殊文字
    fc.constant('\x00\x01\x02'),
    fc.constant('𠮷野家'),  // サロゲートペア
    fc.constant('a'.repeat(10000)),
    // 通常文字列も混ぜる
    fc.string()
  );

// arbitraries/webPath.ts
export const pathArbitrary = (pathConfig: PathConfig) =>
  fc.oneof(
    // 設定されたパスから選択
    fc.constantFrom(...expandPaths(pathConfig.include)),
    // ランダムパス生成
    fc.array(fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-_')), { maxLength: 5 })
      .map(segments => '/' + segments.join('/'))
  ).filter(path => !matchesAny(path, pathConfig.exclude));
```

---

## CLI インターフェース

```
Usage: web-fuzz [options]

Options:
  -c, --config <path>     設定ファイルパス (default: "web-fuzz.config.yaml")
  -n, --num-runs <n>      試行回数を上書き
  -s, --seed <seed>       乱数シード（再現用）
  --check <name>          特定のチェックのみ実行
  --reporter <type>       レポート形式 (console|json|html)
  --no-headless           ブラウザを表示して実行
  -v, --verbose           詳細ログ出力
  -h, --help              ヘルプ表示

Examples:
  ./web-fuzz                              # デフォルト設定で実行
  ./web-fuzz -n 100                       # 100回試行
  ./web-fuzz --check formFuzzing          # フォームファジングのみ
  ./web-fuzz --seed 12345 --reporter json # CI用
  
  # または deno task 経由
  deno task start --config web-fuzz.config.yaml
```

---

## レポート形式

### Console（デフォルト）

```
web-fuzz v1.0.0
Target: http://localhost:3000
Seed: 1705123456789

✓ noServerError (50 runs, 3.2s)
✓ queryParamFuzzing (50 runs, 5.1s)
✗ formFuzzing (23/50 runs, 2.1s)
  Counterexample:
    path: /contact
    inputs: { name: "<script>alert(1)</script>", email: "", message: "" }
  Error: Expected no error alert, but found XSS warning
  
  Replay: ./web-fuzz --check formFuzzing --seed 1705123456789

✓ historyNavigation (50 runs, 4.8s)
✓ rapidClick (50 runs, 6.2s)

Results: 4/5 passed
```

### JSON（CI向け）

```json
{
  "version": "1.0.0",
  "timestamp": "2025-01-20T10:30:00Z",
  "baseUrl": "http://localhost:3000",
  "seed": 1705123456789,
  "results": [
    { "check": "noServerError", "status": "pass", "runs": 50, "duration": 3200 },
    { "check": "formFuzzing", "status": "fail", "runs": 23, "duration": 2100,
      "counterexample": { "path": "/contact", "inputs": { "name": "<script>..." } },
      "error": "Expected no error alert"
    }
  ],
  "summary": { "total": 5, "passed": 4, "failed": 1 }
}
```

---

## ディレクトリ構成

```
web-fuzz/
├── src/
│   ├── index.ts              # エントリポイント
│   ├── cli.ts                # CLIパーサー
│   ├── runner.ts             # メイン実行ロジック
│   ├── config.ts             # 設定読み込み・バリデーション
│   ├── checks/
│   │   ├── index.ts
│   │   ├── noServerError.ts
│   │   ├── formFuzzing.ts
│   │   ├── queryParamFuzzing.ts
│   │   ├── historyNavigation.ts
│   │   ├── rapidClick.ts
│   │   └── reloadStateRestore.ts
│   ├── arbitraries/
│   │   ├── index.ts
│   │   ├── maliciousString.ts
│   │   └── webPath.ts
│   ├── reporters/
│   │   ├── index.ts
│   │   ├── console.ts
│   │   ├── json.ts
│   │   └── html.ts
│   ├── auth/
│   │   ├── index.ts
│   │   ├── form.ts
│   │   ├── cookie.ts
│   │   └── bearer.ts
│   └── types.ts
├── templates/
│   └── report.html           # HTMLレポートテンプレート
├── deno.json
└── README.md
```

---

## deno.json

```json
{
  "name": "@internal/web-fuzz",
  "version": "1.0.0",
  "exports": "./src/index.ts",
  "tasks": {
    "start": "deno run -A src/index.ts",
    "compile": "deno compile -A -o web-fuzz src/index.ts"
  },
  "imports": {
    "playwright": "npm:playwright@^1.40.0",
    "fast-check": "npm:fast-check@^3.15.0",
    "@std/yaml": "jsr:@std/yaml@^1.0.0",
    "@std/path": "jsr:@std/path@^1.0.0",
    "@std/cli": "jsr:@std/cli@^1.0.0",
    "chalk": "npm:chalk@^5.3.0"
  }
}
```

---

## 実装の優先順位

### Phase 1（MVP）

1. CLI骨格 + 設定読み込み
2. noServerError チェック
3. formFuzzing チェック
4. console reporter

### Phase 2

5. queryParamFuzzing
6. historyNavigation
7. rapidClick
8. JSON reporter

### Phase 3

9. 認証対応（form / cookie）
10. HTML reporter
11. カスタムチェック追加機構

---

## 拡張ポイント

- **カスタムチェック**: `web-fuzz.config.yaml` で外部ファイル指定可能に
- **プラグイン**: Lighthouse連携、アクセシビリティチェック
- **並列実行**: 複数ブラウザインスタンスで高速化
- **差分レポート**: 前回結果との比較

---

## 注意事項

- 本番環境には絶対に向けない（DB汚染、大量リクエスト）
- ローカル or ステージング環境専用
- 認証情報は環境変数経由で渡すことを推奨
- Playwrightブラウザは別途インストール必要: `npx playwright install chromium`
- `deno compile` でバイナリ化すれば配布先にDenoインストール不要
