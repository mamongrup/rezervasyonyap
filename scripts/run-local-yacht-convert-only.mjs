/**
 * Yerel — .raw → AVIF + DB (indirme bittikten sonra).
 *
 *   node scripts/run-local-yacht-convert-only.mjs
 *   node scripts/run-local-yacht-convert-only.mjs --until-done
 */

import { appendFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const NODE = process.env.NODE_BIN || 'C:\\laragon\\bin\\nodejs\\node-v24\\node.exe'
const LOG_DIR = path.join(ROOT, 'logs')
const LOG = path.join(LOG_DIR, 'yacht-convert.log')

const args = new Set(process.argv.slice(2))
const UNTIL_DONE = args.has('--until-done')
const roundsIdx = process.argv.indexOf('--rounds')
const MAX_ROUNDS = UNTIL_DONE ? 99_999 : roundsIdx >= 0 ? Number(process.argv[roundsIdx + 1]) : 500
const BATCH = Number(process.env.BATCH_CONVERT || 15)

mkdirSync(LOG_DIR, { recursive: true })

function log(msg) {
  const line = `[${new Date().toISOString().slice(0, 19).replace('T', ' ')}] ${msg}`
  appendFileSync(LOG, `${line}\n`, 'utf8')
  console.log(line)
}

function runNode(script, scriptArgs = [], extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(NODE, [path.join(ROOT, script), ...scriptArgs], {
      cwd: ROOT,
      env: { ...process.env, IMAGE_CONVERT_CONCURRENCY: process.env.IMAGE_CONVERT_CONCURRENCY || '3', ...extraEnv },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let out = ''
    child.stdout.on('data', (d) => { const s = d.toString(); out += s; process.stdout.write(s) })
    child.stderr.on('data', (d) => { const s = d.toString(); out += s; process.stderr.write(s) })
    child.on('close', (code) => {
      appendFileSync(LOG, out, 'utf8')
      if (code === 0) resolve(out)
      else reject(new Error(`${script} exit ${code}`))
    })
  })
}

async function pendingRawSlugs() {
  const out = await runNode('scripts/check-yacht-raw-status.mjs')
  const m = out.match(/Ham indirilmiş \(\.raw\): (\d+) ilan/)
  return m ? Number(m[1]) : null
}

async function main() {
  log('=== AVIF dönüşüm başladı ===')

  for (let round = 1; round <= MAX_ROUNDS; round += 1) {
    let pending = null
    try {
      pending = await pendingRawSlugs()
    } catch {
      /* devam */
    }
    const label = UNTIL_DONE ? `Tur ${round}` : `Tur ${round}/${MAX_ROUNDS}`
    log(`${label} — ham bekleyen ilan: ${pending ?? '?'}`)
    if (pending === 0) break

    log(`Dönüşüm batch (${BATCH})...`)
    try {
      await runNode('scripts/convert-yacht-galleries-raw.mjs', ['--limit', String(BATCH)])
    } catch (e) {
      log(`Dönüşüm uyarı: ${e.message}`)
    }

    await new Promise((r) => setTimeout(r, 500))
  }

  log('=== Son durum ===')
  await runNode('scripts/check-yacht-raw-status.mjs')
  await runNode('scripts/check-yacht-images.mjs')
  log('=== Bitti ===')
}

main().catch((e) => {
  log(`FATAL: ${e.message}`)
  process.exit(1)
})
