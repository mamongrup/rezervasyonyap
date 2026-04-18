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
const result = spawnSync(
  process.execPath,
  ['--max-old-space-size=8192', nextBin, ...args],
  { stdio: 'inherit', cwd: process.cwd(), shell: false },
)

process.exit(result.status ?? 1)
