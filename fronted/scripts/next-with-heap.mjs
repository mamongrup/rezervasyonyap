/**
 * Monorepo / npm workspaces: `next` kök `node_modules` içinde yükseltilebilir.
 * `./node_modules/next/dist/bin/next` sabit yolu kırılır; bu betik paketi Node çözümlemesiyle bulur.
 */
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
let nextBin
try {
  nextBin = require.resolve('next/dist/bin/next')
} catch {
  console.error(
    '[next-with-heap] `next` paketi bulunamadı. Kök dizinde (travel) veya fronted içinde `npm install` çalıştırın.',
  )
  process.exit(1)
}

const args = process.argv.slice(2)

/** Next.js type-check worker ayrı Node süreci; yalnızca argv yetmez, `NODE_OPTIONS` tüm alt süreçlere geçer. */
const heap = '--max-old-space-size=12288'
const opt = (process.env.NODE_OPTIONS ?? '').trim()
if (!opt.includes('max-old-space-size')) {
  process.env.NODE_OPTIONS = opt ? `${opt} ${heap}` : heap
}

const result = spawnSync(
  process.execPath,
  [heap, nextBin, ...args],
  { stdio: 'inherit', cwd: process.cwd(), shell: false, env: process.env },
)

process.exit(result.status ?? 1)
