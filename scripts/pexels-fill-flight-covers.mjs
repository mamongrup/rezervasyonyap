#!/usr/bin/env node
/**
 * Pexels → Turna uçuş ilanı kapak görselleri.
 *
 * Görseli olmayan turna uçuş ilanlarını tespit eder, Pexels'tan varış şehri
 * fotoğrafı çekerek listing_images ve featured_image_url'e yazar.
 *
 * Kullanım (sunucuda veya lokalde):
 *   node scripts/pexels-fill-flight-covers.mjs --dry-run
 *   node scripts/pexels-fill-flight-covers.mjs --limit 10
 *   node scripts/pexels-fill-flight-covers.mjs          # hepsini işle
 *
 * Gereksinim:
 *   Pexels API key → panel > Ayarlar > Pexels (site_settings.pexels.api_keys)
 */

import { createPgClient } from './lib/pg-client.mjs'
import { searchPexelsPhotos } from './lib/pexels-api.mjs'

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const limitIdx = process.argv.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : 0
const DELAY_MS = Number(process.env.PEXELS_DELAY_MS || 400)

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

/** Pexels API key'lerini site_settings tablosundan async çek */
async function loadPexelsKeysAsync(pgClient) {
  const { rows } = await pgClient.query(
    `SELECT coalesce(value_json->'api_keys', '[]'::jsonb) AS keys
     FROM site_settings WHERE key = 'pexels' AND organization_id IS NULL
     ORDER BY id DESC LIMIT 1`,
  )
  const raw = rows[0]?.keys
  const list = Array.isArray(raw) ? raw.map(String).map((k) => k.trim()).filter(Boolean) : []
  if (list.length === 0) throw new Error('site_settings.pexels api_keys boş — panel > Pexels ayarları')
  return list
}

/**
 * IATA kodu veya rota labelından varış şehri adını çıkar.
 * "Istanbul - London" → "London"
 * "IST-LHR" → "LHR"
 */
function destinationSearchQuery(toStop, label) {
  // label varsa sağ kısmını al (şehir adı içerir)
  if (label) {
    const parts = label.split(/[→\-–]/)
    const dest = (parts[1] ?? parts[0] ?? '').trim().replace(/\s*\(.*\)/, '').trim()
    if (dest && dest.length > 2) {
      return [
        `${dest} city travel`,
        `${dest} airport`,
        `${dest} landmark`,
      ]
    }
  }
  // IATA fallback — hava alanı için genel sorgu
  const code = String(toStop || '').toUpperCase().trim()
  return [
    `${code} airport`,
    `${code} city`,
    'airplane airport travel',
  ]
}

async function main() {
  const client = createPgClient()
  await client.connect()

  try {
    const pexelsKeys = await loadPexelsKeysAsync(client)
    console.log(`[pexels-flights] ${pexelsKeys.length} Pexels key yüklendi.`)

    // Görseli olmayan Turna flight ilanlarını bul
    const { rows: listings } = await client.query(`
      SELECT
        l.id::text AS id,
        l.slug,
        COALESCE(l.location_name, '') AS location_name,
        fl.to_stop,
        la.value_json->>'route' AS route_json
      FROM listings l
      LEFT JOIN flight_legs fl ON fl.listing_id = l.id AND fl.mode = 'flight'
      LEFT JOIN listing_attributes la ON la.listing_id = l.id AND la.group_code = 'turna' AND la.key = 'snapshot'
      WHERE l.external_provider_code IN ('turna', 'travelrobot')
        AND l.product_category_id IN (SELECT id FROM product_categories WHERE code = 'flight')
        AND NOT EXISTS (
          SELECT 1 FROM listing_images li WHERE li.listing_id = l.id
        )
      ORDER BY l.created_at DESC
    `)

    const slice = LIMIT > 0 ? listings.slice(0, LIMIT) : listings
    console.log(`[pexels-flights] ${slice.length} ilanda görsel eksik (toplam ${listings.length}).`)

    let keyIdx = 0
    let filled = 0
    let skipped = 0

    for (const row of slice) {
      let routeLabel = null
      try {
        const rj = row.route_json ? JSON.parse(row.route_json) : null
        routeLabel = rj?.label ?? null
      } catch {
        /* ignore */
      }

      const toStop = (row.to_stop ?? '').trim()
      const queries = destinationSearchQuery(toStop, routeLabel ?? row.location_name)

      process.stdout.write(`[pexels-flights] ${row.slug} (${toStop}) … `)

      const key = pexelsKeys[keyIdx % pexelsKeys.length]
      keyIdx++

      let photos = []
      for (const q of queries) {
        if (photos.length > 0) break
        try {
          photos = await searchPexelsPhotos(key, q, 6)
        } catch (e) {
          console.log(`Pexels hata: ${e.message}`)
        }
        await sleep(DELAY_MS)
      }

      if (photos.length === 0) {
        console.log('görsel bulunamadı — atlandı')
        skipped++
        continue
      }

      if (DRY_RUN) {
        console.log(`dry-run: ${photos[0].url.slice(0, 60)}…`)
        filled++
        continue
      }

      // Mevcut Pexels görsellerini temizle ve yenilerini ekle
      await client.query(`DELETE FROM listing_images WHERE listing_id = $1::uuid AND storage_key LIKE 'https://images.pexels.com%'`, [row.id])

      let sort = 0
      for (const photo of photos) {
        await client.query(
          `INSERT INTO listing_images (listing_id, sort_order, storage_key, original_mime)
           VALUES ($1::uuid, $2, $3, 'image/jpeg')
           ON CONFLICT DO NOTHING`,
          [row.id, sort, photo.url],
        )
        sort++
      }

      const heroUrl = photos[0].url
      await client.query(
        `UPDATE listings SET featured_image_url = $2, thumbnail_url = $2, updated_at = now() WHERE id = $1::uuid`,
        [row.id, heroUrl],
      )

      // Pexels'tan çekildiğini işaretle (yeniden çekimi önlemek için)
      await client.query(
        `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
         VALUES ($1::uuid, 'pexels', 'gallery_imported_at', $2::jsonb)
         ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json`,
        [row.id, JSON.stringify(new Date().toISOString())],
      )

      console.log(`OK — ${photos.length} görsel (${heroUrl.slice(0, 60)}…)`)
      filled++
    }

    console.log(`\nBitti: ${filled} ilan görsel aldı, ${skipped} atlandı${DRY_RUN ? ' (dry-run)' : ''}.`)
  } finally {
    await client.end()
  }
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
