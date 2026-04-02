#!/usr/bin/env node
const { spawnSync } = require('node:child_process')
const { existsSync } = require('node:fs')

const checks = [
  {
    name: 'Gemini CLI is installed',
    run: () => {
      const result = spawnSync('gemini', ['--version'], { stdio: 'pipe' })
      if (result.error || result.status !== 0) {
        return { ok: false, detail: 'gemini コマンドが見つからないか実行できませんでした。' }
      }
      return { ok: true, detail: String(result.stdout || '').trim() || 'gemini --version succeeded' }
    }
  },
  {
    name: 'Built CLI entry exists',
    run: () => {
      const path = 'dist/bin/gemini-cli.js'
      if (!existsSync(path)) {
        return { ok: false, detail: `${path} がありません。npm run build を実行してください。` }
      }
      return { ok: true, detail: path }
    }
  }
]

let hasFailure = false

console.log('gemini-plugin doctor\n')
for (const check of checks) {
  const { ok, detail } = check.run()
  const mark = ok ? '✅' : '❌'
  console.log(`${mark} ${check.name}`)
  if (detail) console.log(`   ${detail}`)
  if (!ok) hasFailure = true
}

process.exit(hasFailure ? 1 : 0)
