# gemini-plugin (for Claude Code)

`gemini-plugin` は、Claude Code から Gemini CLI を**非同期ジョブ**として実行するためのローカルプラグインです。
`codex-plugin-cc` と同じ操作感（job_id を返してあとから status/result を取得）を、Gemini CLI ベースで再現することを目的としています。

---

## 1. 何ができるか

- `/gemini:review <input>`: レビュー用ジョブを作成し `job_id` を返す
- `/gemini:fix <input>`: 修正案生成ジョブを作成し `job_id` を返す
- `/gemini:plan <input>`: 計画生成ジョブを作成し `job_id` を返す
- `/gemini:status <job_id>`: ジョブ状態を取得（`queued` / `running` / `done` / `error`）
- `/gemini:result <job_id>`: 完了ジョブの結果を取得

> OAuth や API キー管理は行いません。認証は `gemini login` に委譲します。

---

## 2. アーキテクチャ

```txt
gemini-plugin/
  commands.yaml           # Claude Code の slash command 定義
  bin/
    gemini-cli.ts         # CLI entry point（review/fix/plan/status/result/daemon）
  core/
    job.ts                # Job 型・作成
    queue.ts              # in-memory queue
    worker.ts             # 逐次処理 worker（timeout/retry）
    storage.ts            # JSON ストレージ
    runner.ts             # gemini -p 実行
    daemon.ts             # 1秒ポーリングの常駐ループ
```

### Job 型

```ts
type Job = {
  id: string
  type: "review" | "fix" | "plan"
  status: "queued" | "running" | "done" | "error"
  input: string
  result?: string
  error?: string
  createdAt: number
}
```

### 実行フロー

1. CLI で `review/fix/plan` を呼ぶ
2. Job を JSON ストレージに `queued` で保存
3. daemon が起動していなければバックグラウンド起動
4. daemon が 1 秒ごとに `queued` ジョブをポーリング
5. worker が 1 ジョブずつ `gemini -p "<prompt>"` を実行
6. 成功時 `done` + `result`、失敗時は 1 回リトライ後 `error`

---

## 3. セットアップ

## 前提

- Node.js 18+
- `gemini` CLI がインストール済みで PATH にあること
- macOS / Linux

## 手順

### 1) 依存インストール

```bash
npm install
```

### 2) ビルド

```bash
npm run build
```

### 2.5) 動作前チェック（任意だが推奨）

```bash
npm run doctor
```

ローカルで `gemini` CLI 導入済み前提で、`dist/bin/gemini-cli.js` のビルド成果物を確認します。

`gemini` CLI の存在まで厳密に確認したい場合は以下を実行してください。

```bash
npm run doctor:strict
```

### 3) Gemini 認証

```bash
gemini login
```

### 4) Claude Code へ組み込み

`gemini-plugin/commands.yaml` の定義を Claude Code 側の commands 設定へ追加し、
実行バイナリとして `gemini-plugin`（`package.json` の `bin`）を利用してください。

---

## 4. コマンド利用例

> 以下はローカル CLI 直接実行の例です（Claude Code からは slash command 経由）。

```bash
# ジョブ投入
node dist/bin/gemini-cli.js review "このPRの差分をレビューして"
# => 1774916337522-7uv5pefo のような job_id

# 状態確認
node dist/bin/gemini-cli.js status 1774916337522-7uv5pefo
# => queued / running / done / error

# 結果取得
node dist/bin/gemini-cli.js result 1774916337522-7uv5pefo
```

---

## 5. プロンプト仕様

worker は以下テンプレートで Gemini に渡します。

```txt
You are Gemini acting as a coding sub-agent.

Task:
{{TASK}}

Constraints:
- Only use given context
- Prefer minimal changes
- Be explicit about uncertainty

Context:
{{CONTEXT}}
```

出力は最低限、以下セクション形式に正規化します。

```md
## Summary
...

## Findings
...

## Suggested Fix
...

## Risks
...
```

---

## 6. 永続化・運用

- ジョブ保存先: `~/.gemini-plugin/jobs.json`
- daemon PID: `~/.gemini-plugin/daemon.pid`
- daemon heartbeat: `~/.gemini-plugin/daemon.heartbeat`（15秒以上更新がなければ stale とみなして再起動）
- queue は in-memory（daemon 再起動時は `queued` を storage から再ポーリング）

---

## 7. トラブルシューティング

### `status` が `error` になる

主な原因:

- `gemini` コマンドが未インストール
- `gemini login` 未実施
- 実行が 60 秒でタイムアウト
- Gemini CLI 実行時の標準エラー

まずは以下を確認してください。

```bash
gemini --help
gemini login
```

### daemon が起動しない / 止まる

- PID ファイルが壊れている場合は `~/.gemini-plugin/daemon.pid` を削除して再実行
- `jobs.json` が壊れている場合はバックアップ後に整形 or 再作成

---

## 8. 制約（現時点）

- queue は単一プロセス in-memory（複数daemonや分散は非対応）
- 並列実行は行わず、常に 1 ジョブずつ処理
- storage は JSON ファイル（SQLite は未対応）
- CLI 出力整形は最小限（高度な構造化パースは未対応）

---

## 9. 積み残しタスク

積み残しは `PENDING_TASKS.md` に記録しています。運用・拡張時はこのファイルを起点に進めてください。
