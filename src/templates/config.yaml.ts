export const CONFIG_TEMPLATE = `# web-fuzz.config.yaml

baseUrl: http://localhost:3000

# 実行設定
numRuns: 50              # デフォルトの試行回数
timeout: 5000            # 各操作のタイムアウト(ms)
headless: true           # ヘッドレスモード

# 認証（必要な場合）
# auth:
#   type: form             # form | cookie | bearer
#   loginUrl: /login
#   credentials:
#     email: test@example.com
#     password: testpass
#   # または
#   # type: cookie
#   # cookies:
#   #   - name: session
#   #     value: xxx
#   # または
#   # type: bearer
#   # token: xxx

# チェック対象パス
paths:
  include:
    - /
  exclude:
    - /admin/**
    - /api/**

# フォームファジング対象
forms: []
  # - path: /contact
  #   selector: form
  #   submit: button[type="submit"]

# 有効にするチェック
checks:
  noServerError: true
  formFuzzing: false       # formsが設定されたらtrueに
  historyNavigation: true
  rapidClick: false        # formsが設定されたらtrueに
  queryParamFuzzing: true
  reloadStateRestore: false

# チェックごとの設定（オプション）
# checkOptions:
#   rapidClick:
#     maxClicks: 10
#     targetSelector: button[type="submit"]
#   queryParamFuzzing:
#     params: [q, page, sort, filter]

# カスタムチェック（オプション）
# customChecks:
#   - ./my-custom-check.ts

# レポート
reporter: console        # console | json | html
`;
