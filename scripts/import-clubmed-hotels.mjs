#!/usr/bin/env node
/**
 * Club Med katalog snapshot'ını taslak otel ilanları olarak içe aktarır.
 *
 *   node scripts/import-clubmed-hotels.mjs --dry-run
 *   node scripts/import-clubmed-hotels.mjs
 *   node scripts/import-clubmed-hotels.mjs --publish   # yalnızca açık onayla
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

async function main() {
  const catalog = loadCatalog()
  const resorts = LIMIT > 0 ? catalog.resorts.slice(0, LIMIT) : catalog.resorts
  console.log(`Club Med katalog: ${resorts.length}/${catalog.resorts.length}, durum=${STATUS}`)
  if (DRY_RUN) {
    for (const resort of resorts) {
      console.log(`[dry-run] ${resort.name} | ${resort.country_iso2} | ${resort.destination} | görsel:${resort.images.length} | olanak:${resort.amenities.length}`)
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
