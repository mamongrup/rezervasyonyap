/**
 * Yerel — yalnızca ham görsel indirme (AVIF sonra).
 *
 *   node scripts/run-local-yacht-download-only.mjs
 *   node scripts/run-local-yacht-download-only.mjs --until-done
 */

import { appendFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const NODE = process.env.NODE_BIN || 'C:\\laragon\\bin\\nodejs\\node-v24\\node.exe'
const LOG_DIR = path.join(ROOT, 'logs')
const LOG = path.join(LOG_DIR, 'yacht-download.log')

const args = new Set(process.argv.slice(2))
const UNTIL_DONE = args.has('--until-done')
const roundsIdx = process.argv.indexOf('--rounds')
const MAX_ROUNDS = UNTIL_DONE ? 99_999 : roundsIdx >= 0 ? Number(process.argv[roundsIdx + 1]) : 2000
const BATCH_AL = Number(process.env.BATCH_ALBATROS || 12)
const BATCH_BS = Number(process.env.BATCH_BARANSEN || 6)

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
      env: {
        ...process.env,
        IMAGE_DOWNLOAD_CONCURRENCY: process.env.IMAGE_DOWNLOAD_CONCURRENCY || '12',
        ...extraEnv,
      },
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

async function rawFileCount() {
  const out = await runNode('scripts/check-yacht-raw-status.mjs')
  const m = out.match(/Ham indirilmiş \(\.raw\): \d+ ilan, (\d+) dosya/)
  return m ? Number(m[1]) : null
}

async function main() {
  log('=== Ham görsel indirme başladı (AVIF yok) ===')

  let prevRaw = -1
  let staleRounds = 0

  for (let round = 1; round <= MAX_ROUNDS; round += 1) {
    let rawFiles = null
    try {
      rawFiles = await rawFileCount()
    } catch {
      /* devam */
    }
    const label = UNTIL_DONE ? `Tur ${round}` : `Tur ${round}/${MAX_ROUNDS}`
    log(`${label} — ham dosya: ${rawFiles ?? '?'}`)
    if (rawFiles != null) {
      if (rawFiles === prevRaw) staleRounds += 1
      else staleRounds = 0
      prevRaw = rawFiles
      if (staleRounds >= 8) {
        log('8 tur yeni ham yok — indirme tamamlandı sayılıyor.')
        break
      }
    }

    log(`Albatros ham batch (${BATCH_AL})...`)
    try {
      await runNode(
        'scripts/backfill-albatros-images.mjs',
        ['--download-only', '--limit', String(BATCH_AL)],
        { ALBATROS_STATUS: 'published' },
      )
    } catch (e) {
      log(`Albatros uyarı: ${e.message}`)
    }

    log(`Baransen ham batch (${BATCH_BS})...`)
    try {
      await runNode('scripts/backfill-baransen-images.mjs', [
        '--download-only',
        '--limit',
        String(BATCH_BS),
      ])
    } catch (e) {
      log(`Baransen uyarı: ${e.message}`)
    }

    await new Promise((r) => setTimeout(r, 800))
  }

  log('=== Ham indirme turu bitti ===')
  await runNode('scripts/check-yacht-raw-status.mjs')
}

main().catch((e) => {
  log(`FATAL: ${e.message}`)
  process.exit(1)
})
