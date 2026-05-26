/**
 * Travelrobot tur import — panel kimlik bilgilerini DB'den okur.
 *
 *   node scripts/import-travelrobot-tours.mjs --ping
 *   node scripts/import-travelrobot-tours.mjs --dry-run --limit 5
 */

import { createTravelrobotToken, loadTravelrobotConfig, pickTourRows, searchTours } from './lib/travelrobot-api.mjs'
import { createPgClient } from './lib/pg-client.mjs'

const args = new Set(process.argv.slice(2))
const PING = args.has('--ping')
const DRY_RUN = args.has('--dry-run')
const limitIdx = process.argv.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : 0

async function main() {
  const cfg = await loadTravelrobotConfig()
  if (!cfg.enabled && !PING) {
    console.warn('[uyarı] Travelrobot panelde kapalı (enabled=false) — yine de devam ediliyor')
  }

  const { tokenCode } = await createTravelrobotToken(cfg)
  if (PING) {
    console.log('Travelrobot token OK, uzunluk:', tokenCode.length)
    return
  }

  console.log('SearchTour çağrılıyor…')
  const payload = await searchTours(cfg, tokenCode)
  let rows = pickTourRows(payload)
  console.log(`API: ${rows.length} tur adayı`)
  if (LIMIT > 0) rows = rows.slice(0, LIMIT)

  if (DRY_RUN) {
    console.log('Dry-run — DB yazılmadı. İlk kayıt:', rows[0] ? JSON.stringify(rows[0]).slice(0, 200) : '(boş)')
    return
  }

  // TODO: upsertTravelrobotTourListing — migration 297 sonrası
  const client = createPgClient()
  await client.connect()
  await client.end()
  console.log(
    `[bilgi] ${rows.length} tur satırı alındı; listing upsert bir sonraki adımda eklenecek.`,
  )
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
