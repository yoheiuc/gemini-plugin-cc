# PENDING TASKS

このファイルは `gemini-plugin` の積み残しタスク管理用です。

## High Priority

- [ ] **SQLite ストレージ対応**: `storage.ts` の JSON 実装を抽象化し、SQLite バックエンドを追加。
- [ ] **ジョブのキャンセル機能**: `/gemini:cancel <job_id>` を追加し、`queued`/`running` の停止を可能にする。
- [ ] **結果フォーマット強化**: Gemini 出力をセクションごとに解析し、`Summary/Findings/Suggested Fix/Risks` へより正確にマッピング。
- [x] **daemon 健全性管理**: heartbeat と stale PID 検出を追加。

## Medium Priority

- [ ] **ログ機能**: ジョブ単位ログ（開始時刻、実行時間、stderr）を `~/.gemini-plugin/logs/` に保存。
- [ ] **再実行コマンド**: `/gemini:retry <job_id>` で明示リトライ。
- [ ] **入力コンテキスト改善**: ファイルパスや差分をコンテキストとして安全に埋め込むヘルパー実装。
- [ ] **CLI UX 改善**: `status --watch` などの監視オプション追加。

## Low Priority

- [ ] **並列度設定**: 将来的に `concurrency=1..N` を設定可能に（初期値 1）。
- [ ] **ジョブTTL/GC**: 古い完了ジョブの自動削除。
- [ ] **テスト追加**: unit test（queue/worker/storage）と integration test（mock gemini）を整備。

## Notes

- 現要件（ローカル完結、OAuth委譲、1ジョブ逐次処理、60秒timeout、retry1回）は満たしているため、
  上記は拡張タスクとして扱う。
