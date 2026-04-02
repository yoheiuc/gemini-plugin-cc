#!/usr/bin/env node
const { spawnSync } = require('node:child_process')
const { existsSync } = require('node:fs')

const args = new Set(process.argv.slice(2))
const checkGeminiBinary = args.has('--check-gemini')

const checks = [
  {
    name: 'Built CLI entry exists',
    required: true,
    run: () => {
      const path = 'dist/bin/gemini-cli.js'
      if (!existsSync(path)) {
        return { ok: false, detail: `${path} がありません。npm run build を実行してください。` }
      }
      return { ok: true, detail: path }
    }
  },
  {
    name: 'Gemini CLI is installed',
    required: checkGeminiBinary,
    run: () => {
      if (!checkGeminiBinary) {
        return { ok: true, detail: 'skip（ローカルで導入済み前提。必要なら --check-gemini を指定）' }
      }
      const result = spawnSync('gemini', ['--version'], { stdio: 'pipe' })
      if (result.error || result.status !== 0) {
        return { ok: false, detail: 'gemini コマンドが見つからないか実行できませんでした。' }
      }
      return { ok: true, detail: String(result.stdout || '').trim() || 'gemini --version succeeded' }
    }
  }
]

let hasFailure = false

console.log('gemini-plugin doctor\n')
for (const check of checks) {
  const { ok, detail } = check.run()
  const mark = ok ? '✅' : (check.required ? '❌' : '⚠️')
  console.log(`${mark} ${check.name}`)
  if (detail) console.log(`   ${detail}`)
  if (!ok && check.required) hasFailure = true
}

process.exit(hasFailure ? 1 : 0)
