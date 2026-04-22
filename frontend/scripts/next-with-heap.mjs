/**
 * Monorepo / npm workspaces: `next` kök `node_modules` içinde yükseltilebilir.
 * `./node_modules/next/dist/bin/next` sabit yolu kırılır; bu betik paketi Node çözümlemesiyle bulur.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

/** `next dev` öncesi bozuk fetch-cache dosyalarını sil (Webpack bu kodu derlemez — doğrudan Node çalışır). */
function clearDevFetchCacheIfDev() {
  const args = process.argv.slice(2)
  if (!args.includes('dev')) return
  const cwd = process.cwd()
  const dirs = [
    path.join(cwd, '.next', 'dev', 'cache', 'fetch-cache'),
    path.join(cwd, '.next', 'cache', 'fetch-cache'),
  ]
  for (const dir of dirs) {
    try {
      if (!fs.existsSync(dir)) continue
      for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
        try {
          const p = path.join(dir, name.name)
          if (name.isFile()) fs.unlinkSync(p)
        } catch {
          /* */
        }
      }
    } catch {
      /* */
    }
  }
}

clearDevFetchCacheIfDev()

const require = createRequire(import.meta.url)
let nextBin
try {
  nextBin = require.resolve('next/dist/bin/next')
} catch {
  console.error(
    '[next-with-heap] `next` paketi bulunamadı. Kök dizinde (travel) veya frontend içinde `npm install` çalıştırın.',
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
