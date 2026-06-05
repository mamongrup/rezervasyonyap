/**
 * Turna uçuş araması — doğrudan API testi (Gleam backend bypass).
 *
 * Kullanım (sunucuda veya yerelde):
 *   TURNA_API_KEY=... TURNA_BASE_URL=https://api.turna.com \
 *     node scripts/test-turna-search.mjs IST AYT 2026-07-17
 *
 * Panel DB kaydı varsa (DATABASE_URL / backend.env):
 *   node scripts/test-turna-search.mjs IST AYT 2026-07-17
 */

import { fetchFlightSearch, loadTurnaConfigAsync } from './lib/turna-api.mjs'

function countInventory(json) {
  const combos = json?.CombinableLegsList
  if (Array.isArray(combos) && combos.length > 0) return combos.length
  const legs = json?.FlightLegs
  if (Array.isArray(legs) && legs.length > 0) return legs.length
  return 0
}

async function main() {
  const [origin, destination, departureDay] = process.argv.slice(2)
  if (!origin || !destination || !departureDay) {
    console.error('Kullanım: node scripts/test-turna-search.mjs IST AYT 2026-07-17')
    process.exit(1)
  }

  const cfg = await loadTurnaConfigAsync()
  const keyLen = cfg.apiKey?.length ?? 0
  const keyTail = keyLen >= 4 ? cfg.apiKey.slice(-4) : '(boş)'
  console.log('[turna] baseUrl=%s enabled=%s api_key_len=%d tail=...%s', cfg.baseUrl, cfg.enabled, keyLen, keyTail)

  if (!cfg.apiKey) {
    console.error('api_key boş — panel: listing_api_providers.turna veya TURNA_API_KEY env')
    process.exit(1)
  }

  const route = {
    origin,
    destination,
    originIsCity: origin.toUpperCase() === 'IST' || origin.toUpperCase() === 'AYT',
    destinationIsCity: destination.toUpperCase() === 'IST',
  }

  for (const mask of [105, 109, 41]) {
    process.stdout.write(`[turna] mask=${mask} … `)
    try {
      const { json } = await fetchFlightSearch(route, { cfg, departureDay, flightLegMask: mask })
      const n = countInventory(json)
      const hasErr = json?.HasError === true || json?.HasError === 'true'
      const msg = json?.Message || json?.ErrorMessage || ''
      console.log(`count=${n} HasError=${hasErr}${msg ? ` msg=${msg}` : ''}`)
      if (n > 0) {
        console.log('[turna] OK — envanter var')
        process.exit(0)
      }
    } catch (e) {
      console.log(`HATA: ${e.message}`)
    }
  }

  console.error('[turna] Tüm maskelerde envanter yok — anahtar/ortam (test vs canlı) Turna ile doğrulanmalı')
  process.exit(2)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
