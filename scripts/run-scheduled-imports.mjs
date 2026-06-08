/**
 * Panel kapalıyken de çalışan zamanlanmış import başlatıcısı.
 *
 * Çalışma mantığı:
 *  1. DB'den import_schedule ayarını okur (site_settings).
 *  2. Mevcut UTC saatini kontrol eder.
 *  3. O saate atanmış provider'ları sırayla çalıştırır.
 *  4. Her provider için provider_sync_jobs kaydı oluşturur, scripti çalıştırır.
 *
 * Kullanım (systemd tarafından her saat başı çağrılır):
 *   node scripts/run-scheduled-imports.mjs
 *   node scripts/run-scheduled-imports.mjs --force-all     # saat kontrolü yok
 *   node scripts/run-scheduled-imports.mjs --provider wtatil  # tek provider
 *
 * Env: DATABASE_URL veya PG* (backend.env), INTERNAL_API_ORIGIN (progress raporu)
 */

import { createPgClient } from './lib/pg-client.mjs'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '..')

const PROVIDER_SCRIPTS = {
  wtatil: 'scripts/sync-wtatil-auto.mjs',
  travelrobot: 'scripts/import-travelrobot-all.mjs',
  turna: 'scripts/import-turna-flights.mjs',
  yolcu360: 'scripts/import-yolcu360-cars.mjs',
}

const args = new Set(process.argv.slice(2))
const FORCE_ALL = args.has('--force-all')
const providerIdx = process.argv.indexOf('--provider')
const ONLY_PROVIDER = providerIdx >= 0 ? process.argv[providerIdx + 1] : null

async function readSchedule(client) {
  const r = await client.query(
    `SELECT value_json FROM site_settings
     WHERE key = 'import_schedule' AND organization_id IS NULL
     ORDER BY id DESC LIMIT 1`,
  )
  if (!r.rows[0]) return {}
  const raw = r.rows[0].value_json
  return typeof raw === 'string' ? JSON.parse(raw) : (raw ?? {})
}

async function createJob(client, provider) {
  const r = await client.query(
    `INSERT INTO provider_sync_jobs (provider, status)
     VALUES ($1, 'pending') RETURNING id::text`,
    [provider],
  )
  return r.rows[0]?.id ?? null
}

function runScript(scriptRel, jobId) {
  return new Promise((resolve) => {
    const scriptPath = path.join(REPO_ROOT, scriptRel)
    const env = {
      ...process.env,
      SYNC_JOB_ID: jobId,
    }
    console.log(`  → node ${scriptRel} --job-id ${jobId}`)
    const child = spawn('node', [scriptPath, '--job-id', jobId], {
      env,
      stdio: 'inherit',
    })
    child.on('close', (code) => {
      if (code !== 0) {
        console.error(`  [hata] ${scriptRel} exit ${code}`)
      }
      resolve(code === 0)
    })
    child.on('error', (e) => {
      console.error(`  [spawn hatası] ${e.message}`)
      resolve(false)
    })
  })
}

async function markJobError(client, jobId, errText) {
  await client.query(
    `UPDATE provider_sync_jobs SET status='error', error_text=$2, finished_at=now()
     WHERE id=$1::uuid`,
    [jobId, errText],
  )
}

async function wasRunRecently(client, provider, withinHours = 1) {
  const r = await client.query(
    `SELECT 1 FROM provider_sync_jobs
     WHERE provider = $1
       AND started_at > now() - INTERVAL '${withinHours} hours'
       AND status IN ('done', 'running', 'pending')
     LIMIT 1`,
    [provider],
  )
  return r.rows.length > 0
}

async function main() {
  const nowHour = new Date().getUTCHours()
  console.log(`[scheduler] UTC saat: ${nowHour}:xx — ${new Date().toISOString()}`)

  const client = createPgClient()
  await client.connect()

  try {
    const schedule = await readSchedule(client)
    console.log('[scheduler] schedule:', JSON.stringify(schedule))

    const providers = ONLY_PROVIDER
      ? [ONLY_PROVIDER]
      : Object.keys(PROVIDER_SCRIPTS)

    for (const provider of providers) {
      if (!PROVIDER_SCRIPTS[provider]) {
        console.warn(`[scheduler] Bilinmeyen provider atlandı: ${provider}`)
        continue
      }

      const hours = Array.isArray(schedule[provider]) ? schedule[provider] : []
      const shouldRun = FORCE_ALL || hours.includes(nowHour)

      if (!shouldRun) {
        console.log(`[${provider}] Bu saat için zamanlama yok (${hours.join(',') || 'boş'}) — atlandı`)
        continue
      }

      if (!FORCE_ALL) {
        const recent = await wasRunRecently(client, provider, 1)
        if (recent) {
          console.log(`[${provider}] Son 1 saat içinde zaten çalıştı — atlandı`)
          continue
        }
      }

      const scriptRel = PROVIDER_SCRIPTS[provider]
      const jobId = await createJob(client, provider)
      if (!jobId) {
        console.error(`[${provider}] Job oluşturulamadı`)
        continue
      }

      console.log(`[${provider}] Başlatılıyor (job: ${jobId})…`)
      try {
        await runScript(scriptRel, jobId)
      } catch (e) {
        await markJobError(client, jobId, e?.message || String(e))
        console.error(`[${provider}] Script hatası:`, e?.message)
      }
    }

    console.log('[scheduler] Tamamlandı.')
  } finally {
    await client.end()
  }
}

main().catch((e) => {
  console.error('[scheduler] Kritik hata:', e?.message || e)
  process.exit(1)
})
