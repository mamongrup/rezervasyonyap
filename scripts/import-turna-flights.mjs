/**
 * Turna uçak → PostgreSQL rota şablonu ilanları (flight kategorisi).
 *
 * Ortam:
 *   TURNA_BASE_URL, TURNA_API_KEY (zorunlu)
 *   TURNA_STATUS — draft | published (varsayılan published)
 *   TURNA_ORG_ID — varsayılan a0000000-0000-4000-8000-000000000001
 *
 * Kullanım:
 *   node scripts/import-turna-flights.mjs --ping
 *   node scripts/import-turna-flights.mjs --dry-run
 *   node scripts/import-turna-flights.mjs --limit 3
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchFlightSearch, loadTurnaConfigAsync, pingTurnaLogin } from './lib/turna-api.mjs'
import { resolveImportContext, upsertTurnaFlightListing } from './lib/turna-listing-db.mjs'
import { createPgClient } from './lib/pg-client.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROUTES_PATH = path.join(__dirname, 'config', 'turna-flight-routes.json')
const DEFAULT_ORG = 'a0000000-0000-4000-8000-000000000001'

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const PING = args.has('--ping')
const limitIdx = process.argv.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : 0

function loadFlightRoutes() {
  if (!fs.existsSync(ROUTES_PATH)) {
    throw new Error(`Rota dosyası yok: ${ROUTES_PATH} (örnek: turna-flight-routes.example.json)`)
  }
  const parsed = JSON.parse(fs.readFileSync(ROUTES_PATH, 'utf8').trim() || '[]')
  if (!Array.isArray(parsed) || !parsed.length) throw new Error(`${ROUTES_PATH} boş`)
  return parsed
}

async function main() {
  // DB'den config yükle — API key ve baseUrl buradan alınır (panel > env)
  const cfg = await loadTurnaConfigAsync()
  console.log(`[turna] baseUrl=${cfg.baseUrl} enabled=${cfg.enabled}`)

  if (PING) {
    const { json, session } = await pingTurnaLogin(cfg)
    console.log('Turna login OK', {
      sessionId: session.sessionId || '(header yok)',
      keys: json && typeof json === 'object' ? Object.keys(json).slice(0, 8) : [],
    })
    return
  }

  const orgId = process.env.TURNA_ORG_ID || DEFAULT_ORG
  const status = (process.env.TURNA_STATUS || cfg.listingStatus || 'published').toLowerCase() === 'draft' ? 'draft' : 'published'
  const routes = loadFlightRoutes()
  const slice = LIMIT > 0 ? routes.slice(0, LIMIT) : routes

  const client = createPgClient()
  if (!DRY_RUN) await client.connect()

  try {
    const ctx = DRY_RUN ? { orgId, categoryId: null, localeTrId: null } : await resolveImportContext(client, orgId)
    let created = 0
    let updated = 0

    for (const route of slice) {
      if (!route?.origin || !route?.destination) continue
      const key = `${route.origin}-${route.destination}`.toLowerCase()
      process.stdout.write(`[turna] ${key} … `)

      let searchPayload = null
      try {
        // cfg geçiriliyor: panelden kaydedilen baseUrl + apiKey kullanılır
        const { json } = await fetchFlightSearch(route, { cfg })
        searchPayload = json
      } catch (e) {
        console.log(`atlandı (${e.message})`)
        continue
      }

      const out = await upsertTurnaFlightListing(client, ctx, route, searchPayload, { status, dryRun: DRY_RUN })
      if (out.created) created += 1
      else if (!DRY_RUN && out.action === 'updated') updated += 1
      console.log(out.action + (out.slug ? ` (${out.slug})` : ''))
    }

    console.log(`\nBitti: ${created} yeni, ${updated} güncelleme${DRY_RUN ? ' (dry-run)' : ''}.`)
  } finally {
    if (!DRY_RUN) await client.end()
  }
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
