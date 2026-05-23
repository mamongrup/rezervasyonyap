/**
 * Bravo listing görsellerini toplu AVIF + DB yolu güncelleme.
 *
 *   node scripts/convert-listings-avif-full.mjs --dry-run
 *   node scripts/convert-listings-avif-full.mjs
 *
 * Uzun sürer (~33k dosya). Log: backups/convert-listings-avif.log
 */

import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createWriteStream } from 'node:fs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const listingsDir = path.join(root, 'frontend', 'public', 'uploads', 'listings')
const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const logPath = path.join(root, 'backups', `convert-listings-avif-${ts}.log`)
const dryRun = process.argv.includes('--dry-run')

function runNode(script, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, FORCE_COLOR: '0' },
    })
    const log = createWriteStream(logPath, { flags: 'a' })
    log.on('error', (e) => console.error('[log]', e.message))
    log.write(`\n=== ${path.basename(script)} ${args.join(' ')} ===\n`)
    const pipe = (d) => {
      process.stdout.write(d)
      if (!log.destroyed) log.write(d)
    }
    child.stdout.on('data', pipe)
    child.stderr.on('data', pipe)
    child.on('close', (code) => {
      log.end()
      // Windows sharp çöküşü (3221225725) — kısmi dönüşümde DB adımına devam
      if (code === 0 || code === 3221225725) resolve()
      else reject(new Error(`exit ${code}`))
    })
  })
}

console.log('Listings dir:', listingsDir)
console.log('Log:', logPath)
console.log('dryRun:', dryRun)

const convertScript = path.join(root, 'frontend', 'scripts', 'convert-uploads-to-avif.mjs')
const convertArgs = dryRun ? ['--dry-run', listingsDir] : [listingsDir]

await runNode(convertScript, convertArgs, path.join(root, 'frontend'))

if (!dryRun) {
  await runNode(path.join(root, 'scripts', 'update-listing-paths-avif.mjs'), [], root)
  console.log('\nDone. FTP ile yükleyin: frontend/public/uploads/listings/')
  console.log('WinSCP hedef: .../httpdocs/frontend/public/uploads/listings/')
} else {
  console.log('\nDry-run bitti. DB güncellemesi için --dry-run olmadan tekrar çalıştırın.')
}
