#!/usr/bin/env node
/**
 * Tur ilanları — Pexels yüksek çözünürlük galeri (wtatil snapshot yerine / üstüne).
 *
 *   node scripts/pexels-fill-tour-images.mjs --dry-run --limit 3
 *   node scripts/pexels-fill-tour-images.mjs --limit 50
 *   node scripts/pexels-fill-tour-images.mjs --replace
 *
 * Ortam: PEXELS_IMAGES=6, PEXELS_DELAY_MS=400, AVIF_QUALITY=88, MAX_WIDTH=1920
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchPexelsGalleryUrls, loadPexelsKeys } from './lib/pexels-api.mjs'
import {
  execSql,
  queryRows,
  sqlJson,
  sqlLiteral,
} from './lib/psql-exec.mjs'
import { loadBackendEnvFile } from './lib/load-backend-env.mjs'
import { fetchBuffer, bufferToAvif } from './lib/wtatil-image-download.mjs'
import { listingStorageKey, listingUploadDir } from './lib/listing-upload-path.mjs'

const SCRIPT_VERSION = 'psql-v1'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOADS_ROOT = path.join(__dirname, '..', 'frontend', 'public', 'uploads', 'listings')

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const replaceAll = args.includes('--replace')
const skipExisting = args.includes('--skip-existing')
const limitArg = args.find((a) => a.startsWith('--limit='))?.slice('--limit='.length)
  ?? (args.includes('--limit') ? args[args.indexOf('--limit') + 1] : null)
const slugArg = args.find((a) => a.startsWith('--slug='))?.slice('--slug='.length)
  ?? (args.includes('--slug') ? args[args.indexOf('--slug') + 1] : null)
const imagesArg = args.find((a) => a.startsWith('--images='))?.slice('--images='.length)
  ?? (args.includes('--images') ? args[args.indexOf('--images') + 1] : null)
const maxListings = limitArg ? Math.max(1, parseInt(limitArg, 10) || 0) : 0
const imagesPerTour = Math.min(10, Math.max(3, Number(imagesArg || process.env.PEXELS_IMAGES || 6)))
const delayMs = Number(process.env.PEXELS_DELAY_MS || 400)
const providerArg = args.find((a) => a.startsWith('--provider='))?.slice('--provider='.length)
  ?? (args.includes('--provider') ? args[args.indexOf('--provider') + 1] : null)
  ?? process.env.PEXELS_TOUR_PROVIDER
  ?? 'wtatil'
const provider = String(providerArg).trim().toLowerCase()

function isBadTourCoverUrl(url) {
  const u = String(url || '').trim()
  if (!u) return true
  if (/no-logo|nologo|bm8tbG9nby/i.test(u)) return true
  return false
}

function tourMetaFromSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return {}
  const catalog = snapshot.catalog || snapshot
  const nested = catalog?.Tour ?? catalog?.tour
  const area =
    catalog?.RegionName ||
    catalog?.regionName ||
    nested?.Regions?.[0]?.Name ||
    nested?.Regions?.[0]?.name ||
    catalog?.tourArea?.name ||
    catalog?.tourArea?.text ||
    ''
  const countries = (catalog?.countries || [])
    .map((c) => c?.name || c?.code || '')
    .filter(Boolean)
    .join(', ')
  return { area, countries }
}

function tourQueries(title, area, countries) {
  const clean = String(title || '')
    .replace(/\d+\s*gece/gi, ' ')
    .replace(/\b(pegasus|turk\s*air|thy|havayolu|uçak|gidis|dönüş|donus|fly\s*dubai)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const qs = []
  if (/dubai|abu\s*dhabi|emirlik|sharjah/i.test(`${title} ${area} ${countries}`)) {
    qs.push('Dubai UAE skyline travel')
    qs.push('Dubai tourism landmark')
    qs.push('United Arab Emirates vacation')
  }
  if (/saraybosna|bosna|balkan/i.test(`${title} ${area}`)) {
    qs.push('Sarajevo Bosnia travel')
    qs.push('Bosnia Herzegovina tourism')
  }
  if (area) {
    qs.push(`${area} Turkey travel tour`)
    qs.push(`${area} landscape tourism`)
  }
  if (countries && countries !== area) {
    qs.push(`${countries} travel vacation`)
    qs.push(`${countries} landmark tourism`)
  }
  if (clean.length > 8) qs.push(`${clean.slice(0, 80)} travel`)
  if (area) qs.push(`${area} hotel resort beach`)
  qs.push('Turkey travel destination')
  return [...new Set(qs.filter(Boolean))]
}

function pexelsFileName(sort, photoId) {
  return `${String(sort).padStart(2, '0')}-pexels-${photoId || sort}.avif`
}

async function downloadPexelsAvif(url, destAbs) {
  const raw = await fetchBuffer(url)
  const avif = await bufferToAvif(raw)
  await mkdir(path.dirname(destAbs), { recursive: true })
  await writeFile(destAbs, avif)
  return avif.length
}

function loadTourRows() {
  const snapshotGroup = provider === 'travelrobot' ? 'travelrobot' : 'wtatil'
  let sql = `
    SELECT l.id::text AS listing_id, l.slug, lt.title, l.featured_image_url,
           (SELECT count(*)::int FROM listing_images li WHERE li.listing_id = l.id) AS image_count,
           (SELECT la.value_json FROM listing_attributes la
            WHERE la.listing_id = l.id AND la.group_code = ${sqlLiteral(snapshotGroup)} AND la.key = 'snapshot'
            LIMIT 1) AS snapshot,
           (SELECT 1 FROM listing_attributes la
            WHERE la.listing_id = l.id AND la.group_code = 'pexels' AND la.key = 'gallery_imported_at'
            LIMIT 1) AS pexels_done
    FROM listings l
    JOIN listing_translations lt ON lt.listing_id = l.id
    JOIN locales loc ON loc.id = lt.locale_id AND loc.code = 'tr'
    JOIN product_categories pc ON pc.id = l.category_id AND pc.code = 'tour'
    WHERE l.external_provider_code = ${sqlLiteral(provider)}
  `
  if (slugArg) sql += ` AND l.slug = ${sqlLiteral(slugArg)}`
  sql += ` ORDER BY l.slug`
  const rows = queryRows(sql)
  if (provider === 'travelrobot') {
    return rows.filter((r) => isBadTourCoverUrl(r.featured_image_url) || Number(r.image_count) === 0)
  }
  return rows
}

function saveListingImages(listingId, slug, saved) {
  execSql(`DELETE FROM listing_images WHERE listing_id = ${sqlLiteral(listingId)}::uuid`)
  for (const row of saved) {
    execSql(
      `INSERT INTO listing_images (listing_id, sort_order, storage_key, original_mime)
       VALUES (${sqlLiteral(listingId)}::uuid, ${row.sort}, ${sqlLiteral(row.storageKey)}, 'image/avif')`,
    )
  }
  const hero = saved[0]?.storageKey
  if (hero) {
    const heroUrl = `/${hero}`
    execSql(
      `UPDATE listings SET featured_image_url = ${sqlLiteral(heroUrl)},
         thumbnail_url = ${sqlLiteral(heroUrl)}, updated_at = now()
       WHERE id = ${sqlLiteral(listingId)}::uuid`,
    )
  }
  execSql(
    `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
     VALUES (${sqlLiteral(listingId)}::uuid, 'pexels', 'gallery_imported_at', ${sqlJson({ at: new Date().toISOString(), count: saved.length })})
     ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json`,
  )
}

async function main() {
  console.log(`→ pexels-fill-tour-images (${SCRIPT_VERSION}) — sağlayıcı: ${provider}, tur başına ${imagesPerTour} görsel`)
  loadBackendEnvFile()
  const keys = loadPexelsKeys()
  console.log(`→ ${keys.length} Pexels key`)

  let rows = loadTourRows()
  if (!replaceAll) {
    rows = rows.filter((r) => !r.pexels_done)
  }
  if (skipExisting) {
    rows = rows.filter((r) => !r.pexels_done)
  }
  if (maxListings > 0) rows = rows.slice(0, maxListings)

  console.log(`→ Hedef: ${rows.length} tur ilanı`)
  if (dryRun) console.log('[dry-run] DB/disk yazılmayacak')

  let ok = 0
  let fail = 0
  let bytes = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const { area, countries } = tourMetaFromSnapshot(row.snapshot)
    const queries = tourQueries(row.title, area, countries)
    process.stdout.write(`[${i + 1}/${rows.length}] ${row.slug} … `)

    const photos = await fetchPexelsGalleryUrls(keys, queries, imagesPerTour, delayMs)
    if (photos.length === 0) {
      console.log('Pexels sonuç yok')
      fail++
      continue
    }

    if (dryRun) {
      console.log(`dry-run ${photos.length} foto`)
      ok++
      continue
    }

    const saved = []
    for (let s = 0; s < photos.length; s++) {
      const fileName = pexelsFileName(s, photos[s].id)
      const destAbs = path.join(listingUploadDir(UPLOADS_ROOT, 'tour', row.slug), fileName)
      const storageKey = listingStorageKey('tour', row.slug, fileName)
      try {
        const n = await downloadPexelsAvif(photos[s].url, destAbs)
        bytes += n
        saved.push({ sort: s, storageKey })
      } catch (e) {
        console.warn(`\n    [fail] ${s + 1}: ${e.message}`)
      }
    }

    if (saved.length === 0) {
      console.log('indirme hatası')
      fail++
      continue
    }

    saveListingImages(row.listing_id, row.slug, saved)
    console.log(`${saved.length} avif (${area || countries || 'genel'})`)
    ok++
  }

  console.log(
    `\n→ Özet: ${ok} tur, ${fail} başarısız, ${(bytes / 1024 / 1024).toFixed(1)} MB`,
  )
}

main().catch((e) => {
  console.error('[FAIL]', e.message || e)
  process.exit(1)
})
