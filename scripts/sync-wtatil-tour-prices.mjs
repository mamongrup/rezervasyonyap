/**
 * @deprecated Günlük iş için sync-wtatil-auto.mjs kullanın (dönem replace + yeni tur).
 * Bu script geriye dönük uyumluluk için auto'ya yönlendirir.
 */
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const auto = path.join(path.dirname(fileURLToPath(import.meta.url)), 'sync-wtatil-auto.mjs')
const child = spawn(process.execPath, [auto, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env,
})
child.on('exit', (code) => process.exit(code ?? 1))

import {
  fetchWtatilToken,
  fetchAllTours,
  loadWtatilConfigAsync,
} from './lib/wtatil-api.mjs'
import { enrichWtatilTour } from './lib/wtatil-enrich.mjs'
import {
  resolveImportContext,
  findListingByWtatilRef,
  updateWtatilTourPricesOnly,
} from './lib/wtatil-listing-db.mjs'
import { createPgClient } from './lib/pg-client.mjs'

const DEFAULT_ORG = 'a0000000-0000-4000-8000-000000000001'

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const PING = args.has('--ping')
const limitIdx = process.argv.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : 0
const pageSizeIdx = process.argv.indexOf('--page-size')
const PAGE_SIZE =
  pageSizeIdx >= 0 ? Number(process.argv[pageSizeIdx + 1]) : Number(process.env.WTATIL_PAGE_SIZE || 50)
const delayMs = Number(process.env.WTATIL_PRICE_DELAY_MS || 350)

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function pickCurrency(tour) {
  const c = tour?.currency?.code || tour?.currency?.name || 'TRY'
  const x = String(c).trim().toUpperCase()
  if (x === 'TRY' || x === 'EUR' || x === 'USD' || x === 'GBP') return x
  return 'TRY'
}

async function enrichPrices(userName, token, tour, agencyId) {
  return enrichWtatilTour(userName, token, tour, agencyId, { withPrices: Boolean(agencyId) })
}

async function main() {
  if (PING) {
    const { token, expireDate } = await fetchWtatilToken()
    console.log('Wtatil token OK, expireDate:', expireDate)
    return
  }

  const orgId = process.env.WTATIL_ORG_ID || DEFAULT_ORG
  const { agencyId } = await loadWtatilConfigAsync()
  if (!agencyId) {
    console.warn('[WARN] WTATIL_AGENCY_ID yok — search-tour cheapestPrice atlanır; dönem tablosu kullanılır.')
  }

  const { userName, token } = await fetchWtatilToken()
  console.log('Token alındı, katalog eşleştiriliyor…')

  let tours = await fetchAllTours(userName, token, PAGE_SIZE)
  console.log(`API katalog: ${tours.length} tur`)

  const client = createPgClient()
  if (!DRY_RUN) await client.connect()

  try {
    const ctx = await resolveImportContext(client, orgId)
    const tourById = new Map(tours.map((t) => [String(t.id), t]))

    let refs = await client.query(
      `SELECT l.external_listing_ref::text AS ref
       FROM listings l
       JOIN product_categories pc ON pc.id = l.category_id
       WHERE l.organization_id = $1::uuid
         AND pc.code = 'tour'
         AND l.external_provider_code = 'wtatil'
         AND l.external_listing_ref IS NOT NULL
       ORDER BY l.external_listing_ref`,
      [ctx.orgId],
    )
    let targets = refs.rows.map((r) => r.ref).filter(Boolean)
    if (LIMIT > 0) targets = targets.slice(0, LIMIT)

    console.log(`DB hedef: ${targets.length} yayın/taslak wtatil turu (yalnızca fiyat)`)

    let ok = 0
    let skipped = 0
    let noPrice = 0

    for (let i = 0; i < targets.length; i++) {
      const ref = targets[i]
      const tour = tourById.get(ref)
      if (!tour) {
        skipped += 1
        console.log(`[${i + 1}/${targets.length}] ${ref} … atlandı (API katalogda yok)`)
        continue
      }

      const label = `${ref} — ${String(tour.name || '').slice(0, 45)}`
      process.stdout.write(`[${i + 1}/${targets.length}] ${label} … `)

      if (DRY_RUN) {
        console.log('dry-run')
        continue
      }

      const listingId = await findListingByWtatilRef(client, ctx.orgId, ref)
      if (!listingId) {
        skipped += 1
        console.log('atlandı (DB kaydı yok)')
        continue
      }

      const enrich = await enrichPrices(userName, token, tour, agencyId)
      const result = await updateWtatilTourPricesOnly(client, listingId, ref, enrich, {
        currencyCode: pickCurrency(tour),
      })

      if (result.cheapest_price != null) {
        ok += 1
        console.log(`₺/fiyat: ${result.cheapest_price}`)
      } else {
        noPrice += 1
        console.log('fiyat yok (dönem/search-tour boş)')
      }

      if (delayMs > 0 && i + 1 < targets.length) await sleep(delayMs)
    }

    console.log(`\nBitti: ${ok} fiyatlı, ${noPrice} fiyatsız, ${skipped} atlandı${DRY_RUN ? ' (dry-run)' : ''}.`)
    if (!DRY_RUN) {
      console.log('Vitrin price_from için travel-api deploy edilmiş olmalı (collections_http tur fiyat SQL).')
    }
  } finally {
    if (!DRY_RUN) await client.end()
  }
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
