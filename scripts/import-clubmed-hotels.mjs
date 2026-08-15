#!/usr/bin/env node
/**
 * Club Med katalog snapshot'ını taslak otel ilanları olarak içe aktarır.
 *
 *   node scripts/import-clubmed-hotels.mjs --dry-run
 *   node scripts/import-clubmed-hotels.mjs
 *   node scripts/import-clubmed-hotels.mjs --publish   # yalnızca açık onayla
 *   node scripts/import-clubmed-hotels.mjs --publish   # ortak/ilgisiz stok görselleri temizler
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPgClient } from './lib/pg-client.mjs'
import { resolveClubMedImportContext, upsertClubMedResort } from './lib/clubmed-hotel-db.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CATALOG_PATH = path.join(ROOT, 'deploy', 'data', 'clubmed', 'catalog.json')
const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const STATUS = args.includes('--publish') ? 'published' : 'draft'
const KEEP_SHARED_IMAGES = args.includes('--keep-shared-images')
const limitIndex = args.indexOf('--limit')
const LIMIT = limitIndex >= 0 ? Number(args[limitIndex + 1]) : 0
const orgIndex = args.indexOf('--org-id')
const ORG_ID = orgIndex >= 0 ? args[orgIndex + 1] : process.env.IMPORT_ORG_ID || ''

function loadCatalog() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'))
  if (catalog.provider !== 'clubmed' || !Array.isArray(catalog.resorts)) {
    throw new Error(`Geçersiz Club Med kataloğu: ${CATALOG_PATH}`)
  }
  return catalog
}

/**
 * Club Med'in sayfalarında aynı kampanya/lifestyle karesi onlarca tesise
 * eklenebiliyor. Bunlar tesisin kendisini göstermediği için kart/galeri için
 * yanıltıcı oluyor. Tesis özelindeki kaynak fotoğrafları ve sıraları korunur.
 */
function curateResortImages(resorts) {
  if (KEEP_SHARED_IMAGES) return resorts.map((resort) => ({ ...resort, images: [...new Set(resort.images || [])] }))
  const useCount = new Map()
  for (const resort of resorts) {
    for (const url of new Set((resort.images || []).filter(Boolean))) {
      useCount.set(url, (useCount.get(url) || 0) + 1)
    }
  }
  return resorts.map((resort) => {
    const original = [...new Set((resort.images || []).filter(Boolean))]
    // 8+ farklı tesiste geçen görseller tesis fotoğrafı değil, ortak stok görselidir.
    const curated = original.filter((url) => (useCount.get(url) || 0) < 8)
    return { ...resort, images: curated.length >= 3 ? curated : original }
  })
}

async function main() {
  const catalog = loadCatalog()
  const allResorts = curateResortImages(catalog.resorts)
  const resorts = LIMIT > 0 ? allResorts.slice(0, LIMIT) : allResorts
  console.log(`Club Med katalog: ${resorts.length}/${catalog.resorts.length}, durum=${STATUS}`)
  if (DRY_RUN) {
    for (const resort of resorts) {
      const original = catalog.resorts.find((item) => item.external_ref === resort.external_ref)
      const removed = Math.max(0, (original?.images?.length || 0) - resort.images.length)
      console.log(`[dry-run] ${resort.name} | ${resort.country_iso2} | ${resort.destination} | görsel:${resort.images.length} (-${removed} ortak) | olanak:${resort.amenities.length}`)
    }
    return
  }

  const pg = createPgClient()
  await pg.connect()
  try {
    const ctx = await resolveClubMedImportContext(pg, ORG_ID)
    await pg.query('BEGIN')
    let created = 0
    let updated = 0
    for (let index = 0; index < resorts.length; index++) {
      const resort = resorts[index]
      const result = await upsertClubMedResort(pg, ctx, resort, { status: STATUS })
      if (result.action === 'created') created++
      else updated++
      console.log(`[${index + 1}/${resorts.length}] ${resort.name} → ${result.action} görsel:${result.imageCount} olanak:${result.amenityCount}`)
    }
    await pg.query('COMMIT')
    console.log(`[OK] Club Med içe aktarıldı: created=${created}, updated=${updated}, status=${STATUS}`)
  } catch (error) {
    await pg.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    await pg.end()
  }
}

main().catch((error) => {
  console.error(`[HATA] ${error.stack || error.message}`)
  process.exitCode = 1
})
