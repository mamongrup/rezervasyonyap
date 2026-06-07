/**
 * Yerel yat pipeline — Albatros meta import + görsel backfill (batch döngü).
 *
 *   node scripts/run-local-yacht-jobs.mjs
 *   node scripts/run-local-yacht-jobs.mjs --rounds 20
 *   node scripts/run-local-yacht-jobs.mjs --skip-import --until-done
 */

import { appendFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const NODE = process.env.NODE_BIN || 'C:\\laragon\\bin\\nodejs\\node-v24\\node.exe'
const LOG_DIR = path.join(ROOT, 'logs')
const LOG = path.join(LOG_DIR, 'yacht-jobs.log')

const args = new Set(process.argv.slice(2))
const roundsIdx = process.argv.indexOf('--rounds')
const UNTIL_DONE = args.has('--until-done')
const MAX_ROUNDS = UNTIL_DONE
  ? 99_999
  : roundsIdx >= 0
    ? Number(process.argv[roundsIdx + 1])
    : 500
const BATCH_AL = Number(process.env.BATCH_ALBATROS || 4)
const BATCH_BS = Number(process.env.BATCH_BARANSEN || 2)
const SKIP_IMPORT = args.has('--skip-import')

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
      env: { ...process.env, ...extraEnv },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let out = ''
    child.stdout.on('data', (d) => {
      const s = d.toString()
      out += s
      process.stdout.write(s)
    })
    child.stderr.on('data', (d) => {
      const s = d.toString()
      out += s
      process.stderr.write(s)
    })
    child.on('close', (code) => {
      appendFileSync(LOG, out, 'utf8')
      if (code === 0) resolve(out)
      else reject(new Error(`${script} exit ${code}`))
    })
  })
}

async function imagelessCount() {
  const out = await runNode('scripts/check-yacht-images.mjs')
  const m = out.match(/Tamamen görselsiz yat: (\d+)/)
  return m ? Number(m[1]) : null
}

async function main() {
  log('=== Yerel yat işleri başladı ===')

  if (!SKIP_IMPORT) {
    log('Albatros meta import (skip-existing, skip-images)...')
    try {
      await runNode('scripts/import-albatros-yachts.mjs', ['--skip-images', '--skip-existing'], {
        ALBATROS_STATUS: 'published',
      })
    } catch (e) {
      log(`Import uyarı: ${e.message}`)
    }
  }

  for (let round = 1; round <= MAX_ROUNDS; round += 1) {
    let left = null
    try {
      left = await imagelessCount()
    } catch {
      /* devam */
    }
    const roundLabel = UNTIL_DONE ? `Tur ${round}` : `Tur ${round}/${MAX_ROUNDS}`
    log(`${roundLabel} — görselsiz: ${left ?? '?'}`)
    if (left === 0) break

    log(`Albatros görsel batch (${BATCH_AL})...`)
    try {
      await runNode('scripts/backfill-albatros-images.mjs', ['--limit', String(BATCH_AL)], {
        ALBATROS_STATUS: 'published',
      })
    } catch (e) {
      log(`Albatros batch uyarı: ${e.message}`)
    }

    log(`Baransen görsel batch (${BATCH_BS})...`)
    try {
      await runNode('scripts/backfill-baransen-images.mjs', ['--limit', String(BATCH_BS)])
    } catch (e) {
      log(`Baransen batch uyarı: ${e.message}`)
    }

    await new Promise((r) => setTimeout(r, 1500))
  }

  log('=== Son durum ===')
  await runNode('scripts/check-yacht-images.mjs')
  log('=== Bitti ===')
}

main().catch((e) => {
  log(`FATAL: ${e.message}`)
  process.exit(1)
})
