/**
 * Bravo Booking (rezervasyonyap) → travel PostgreSQL tam aktarım.
 *
 * Kullanım (travel kökünden):
 *   node scripts/import-bravo-spaces.mjs
 *   node scripts/import-bravo-spaces.mjs --skip-images
 *   node scripts/import-bravo-spaces.mjs --limit 10
 *
 * Önkoşul: MySQL rezervasyonyap + PostgreSQL travel (Laragon).
 * Yedek: backups/YYYYMMDD-HHMMSS/
 */

import { createWriteStream, existsSync, mkdirSync } from 'node:fs'
import { writeFile, mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import https from 'node:https'
import http from 'node:http'
import { createRequire } from 'node:module'
import { mediaUrlCandidates } from './lib/bravo-media.mjs'
import { importBravoSeasonalPriceRules } from './lib/bravo-seasonal-prices.mjs'
import {
  applyListingPropertyType,
  resolveHolidayPropertyType,
} from './lib/bravo-property-type.mjs'
import { listingStorageKey, listingUploadDir } from './lib/listing-upload-path.mjs'
import { mysqlConfigFromArgv } from './lib/bravo-mysql-config.mjs'
import {
  applyBravoHolidayHomeVitrinFields,
  buildBravoHolidayHomeVitrinPackage,
  BRAVO_RULE_SLUG_TO_CODE,
  loadBravoOwnerContact,
} from './lib/bravo-holiday-home-map.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TRAVEL_ROOT = path.resolve(__dirname, '..')
const require = createRequire(path.join(TRAVEL_ROOT, 'frontend', 'package.json'))
const mysql = require('mysql2/promise')
const pg = require('pg')

const UPLOADS_ROOT = path.join(TRAVEL_ROOT, 'frontend', 'public', 'uploads', 'listings')

const ORG_ID = 'a0000000-0000-4000-8000-000000000001'
const CATEGORY_ID = 1
const LOCALE_TR = 1

const THEME_SLUG_TO_EN = {
  'korunakli-villalar': 'conservative',
  'deniz-manzarali-villalar': 'sea_view',
  'denize-sifir': 'beachfront',
  'denize-sifir-villalar': 'beachfront',
  'doga-icinde-villalar': 'nature',
  'luks-villalar': 'luxury',
  'kalabalik-ailelere-uygun': 'family',
  'jakuzili-villalar': 'jacuzzi',
  'balayi-evi': 'honeymoon',
  'cocuk-havuzlu-villalar': 'child_friendly',
  'evcil-hayvan-dostu': 'pet_friendly',
  'isitmali-havuzlu-villalar': 'pool',
}

const THEME_SLUG_TO_TEMA = {
  'korunakli-villalar': 'muhafazakar',
  'deniz-manzarali-villalar': 'deniz_manzarali',
  'denize-sifir': 'denize_sifir',
  'denize-sifir-villalar': 'denize_sifir',
  'doga-icinde-villalar': 'nature',
  'luks-villalar': 'luxury',
  'kalabalik-ailelere-uygun': 'genis_aile_evi',
  'jakuzili-villalar': 'jakuzili',
  'balayi-evi': 'balayi_evi',
  'cocuk-havuzlu-villalar': 'child_friendly',
  'evcil-hayvan-dostu': 'pet_friendly',
  'isitmali-havuzlu-villalar': 'ozel_havuzlu',
  'kampanyali-villalar': 'kampanyali',
}

/** @deprecated use bravo-property-type.mjs */
const PROPERTY_SLUG_TO_ILAN_TIPI = {
  villa: 'villa',
  apart: 'apart',
  bungalov: 'bungalov',
}

const args = new Set(process.argv.slice(2))
const SKIP_IMAGES = args.has('--skip-images')
const DRY_RUN = args.has('--dry-run')
const CREATE_MISSING_ONLY = args.has('--create-missing-only')
const limitIdx = process.argv.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : 0

const logPath = path.join(
  TRAVEL_ROOT,
  'backups',
  `import-bravo-spaces-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.log`,
)
mkdirSync(path.dirname(logPath), { recursive: true })
const logStream = createWriteStream(logPath, { flags: 'a' })

function log(...parts) {
  const line = `[${new Date().toISOString()}] ${parts.join(' ')}`
  console.log(line)
  logStream.write(line + '\n')
}

function normalizeCurrency(c) {
  const x = String(c || 'try').trim().toUpperCase()
  if (x === 'TRY' || x === 'GBP' || x === 'EUR' || x === 'USD') return x
  return 'TRY'
}

function normalizeSlug(slug, legacyId) {
  let s = String(slug || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  if (!s) s = `villa-${legacyId}`
  return s.slice(0, 120)
}

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http
    lib
      .get(url, { timeout: 60000, headers: { 'User-Agent': 'TravelImport/1.0' } }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume()
          fetchBuffer(res.headers.location).then(resolve, reject)
          return
        }
        if (res.statusCode !== 200) {
          res.resume()
          reject(new Error(`HTTP ${res.statusCode} ${url}`))
          return
        }
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => resolve(Buffer.concat(chunks)))
      })
      .on('error', reject)
      .on('timeout', function () {
        this.destroy()
        reject(new Error(`timeout ${url}`))
      })
  })
}

async function downloadToFile(urls, destPath) {
  if (existsSync(destPath)) return urls[0] ?? null
  await mkdir(path.dirname(destPath), { recursive: true })
  const list = Array.isArray(urls) ? urls : [urls]
  let lastErr = null
  for (const url of list) {
    try {
      const buf = await fetchBuffer(url)
      await writeFile(destPath, buf)
      return url
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr ?? new Error('download failed')
}

function fileNameFromMedia(row) {
  const fp = String(row.file_path || row.file_name || 'img').trim().replace(/\\/g, '/')
  const base = path.posix.basename(fp)
  if (base) return base.replace(/[^a-zA-Z0-9._-]+/g, '-')
  const ext = (row.file_extension || 'webp').replace(/^\./, '') || 'webp'
  return `${(row.file_name || 'img').replace(/[^a-zA-Z0-9._-]+/g, '-')}.${ext}`
}

async function loadMediaMap(mysql, ids) {
  const map = new Map()
  if (!ids.length) return map
  const uniq = [...new Set(ids.filter(Boolean))]
  for (let i = 0; i < uniq.length; i += 500) {
    const chunk = uniq.slice(i, i + 500)
    const [rows] = await mysql.query(
      `SELECT id, file_name, file_path, file_extension FROM media_files WHERE id IN (${chunk.map(() => '?').join(',')})`,
      chunk,
    )
    for (const r of rows) map.set(Number(r.id), r)
  }
  return map
}

async function loadTermsForSpace(mysql, targetId) {
  const [rows] = await mysql.query(
    `SELECT t.attr_id, t.slug, t.name
     FROM bravo_space_term st
     JOIN bravo_terms t ON t.id = st.term_id
     WHERE st.target_id = ?`,
    [targetId],
  )
  return rows
}

async function loadLocationName(mysql, locationId) {
  if (!locationId) return ''
  const [rows] = await mysql.query(`SELECT name FROM bravo_locations WHERE id = ? LIMIT 1`, [locationId])
  return rows[0]?.name?.trim() || ''
}

async function findExistingListing(pgClient, slug, legacyId) {
  const r = await pgClient.query(
    `SELECT id::text, slug, external_listing_ref FROM listings
     WHERE external_listing_ref = $1
        OR slug = $2
     LIMIT 1`,
    [String(legacyId), slug],
  )
  return r.rows[0] || null
}

async function importImages(pgClient, listingId, slug, galleryIds, imageId, bannerId, mediaMap, stats) {
  const orderedIds = []
  const seen = new Set()
  const push = (id) => {
    const n = Number(id)
    if (!n || seen.has(n)) return
    seen.add(n)
    orderedIds.push(n)
  }
  push(imageId)
  push(bannerId)
  for (const id of galleryIds) push(id)

  const uploadDir = listingUploadDir(UPLOADS_ROOT, 'holiday_home', slug)
  const storageRows = []
  let sort = 0

  for (const mid of orderedIds) {
    const m = mediaMap.get(mid)
    const urls = mediaUrlCandidates(m)
    if (!urls.length) continue
    const fileName = fileNameFromMedia(m)
    const destPath = path.join(uploadDir, fileName)
    const storageKey = listingStorageKey('holiday_home', slug, fileName)

    if (!SKIP_IMAGES && !DRY_RUN) {
      try {
        const used = await downloadToFile(urls, destPath)
        stats.imagesOk++
        if (used && used !== urls[0]) log('  image cdn', slug, used)
      } catch (e) {
        stats.imagesFail++
        log('  image fail', slug, urls.join(' | '), e.message)
        continue
      }
    }
    storageRows.push({ storageKey, sort })
    sort++
  }

  if (DRY_RUN || storageRows.length === 0) return storageRows

  await pgClient.query(`DELETE FROM listing_images WHERE listing_id = $1::uuid`, [listingId])
  for (const row of storageRows) {
    await pgClient.query(
      `INSERT INTO listing_images (listing_id, sort_order, storage_key, original_mime)
       VALUES ($1::uuid, $2, $3, 'image/webp')`,
      [listingId, row.sort, row.storageKey],
    )
  }

  const hero = storageRows[0]?.storageKey
  if (hero) {
    const publicPath = `/${hero}`
    await pgClient.query(
      `UPDATE listings SET featured_image_url = $2, thumbnail_url = $2, updated_at = now() WHERE id = $1::uuid`,
      [listingId, publicPath],
    )
  }

  return storageRows
}

async function importCalendar(pgClient, listingId, legacyId, mysql) {
  const [dates] = await mysql.query(
    `SELECT DATE(start_date) AS day, active, price
     FROM bravo_space_dates
     WHERE target_id = ?
     ORDER BY start_date`,
    [legacyId],
  )
  if (!dates.length) return 0

  await pgClient.query(`DELETE FROM listing_availability_calendar WHERE listing_id = $1::uuid`, [listingId])

  const BATCH = 400
  let inserted = 0
  for (let i = 0; i < dates.length; i += BATCH) {
    const chunk = dates.slice(i, i + BATCH)
    const values = []
    const params = [listingId]
    let p = 2
    for (const d of chunk) {
      const available = Number(d.active) === 1
      values.push(
        `($1::uuid, $${p}::date, $${p + 1}, $${p + 1}, $${p + 1}, $${p + 2})`,
      )
      params.push(d.day, available, d.price != null ? String(d.price) : null)
      p += 3
      inserted++
    }
    await pgClient.query(
      `INSERT INTO listing_availability_calendar (listing_id, day, is_available, am_available, pm_available, price_override)
       VALUES ${values.join(', ')}
       ON CONFLICT (listing_id, day) DO UPDATE SET
         is_available = EXCLUDED.is_available,
         am_available = EXCLUDED.am_available,
         pm_available = EXCLUDED.pm_available,
         price_override = EXCLUDED.price_override`,
      params,
    )
  }
  return inserted
}

async function upsertAttributes(pgClient, listingId, terms, icalUrl) {
  const themeEn = new Set()
  const temaCodes = new Set()
  const ruleCodes = new Set()
  const amenities = []
  const included = []
  const excluded = []

  for (const t of terms) {
    const slug = String(t.slug || '').trim()
    const attrId = Number(t.attr_id)
    if (attrId === 6 && PROPERTY_SLUG_TO_ILAN_TIPI[slug]) {
      await pgClient.query(
        `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
         VALUES ($1::uuid, 'ilan_tipi', $2, 'true'::jsonb)
         ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = excluded.value_json`,
        [listingId, PROPERTY_SLUG_TO_ILAN_TIPI[slug]],
      )
    } else if (attrId === 7) {
      if (THEME_SLUG_TO_EN[slug]) themeEn.add(THEME_SLUG_TO_EN[slug])
      if (THEME_SLUG_TO_TEMA[slug]) temaCodes.add(THEME_SLUG_TO_TEMA[slug])
    } else if (attrId === 8) {
      amenities.push({ slug, name: t.name })
    } else if (attrId === 9) {
      included.push({ slug, name: t.name })
    } else if (attrId === 10) {
      excluded.push({ slug, name: t.name })
    } else if (attrId === 11) {
      const code = BRAVO_RULE_SLUG_TO_CODE[slug]
      if (code) ruleCodes.add(code)
    }
  }

  for (const code of temaCodes) {
    await pgClient.query(
      `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
       VALUES ($1::uuid, 'tema', $2, 'true'::jsonb)
       ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = excluded.value_json`,
      [listingId, code],
    )
  }

  const putLegacy = async (group, items) => {
    for (const it of items) {
      const key = String(it.slug).slice(0, 80)
      await pgClient.query(
        `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
         VALUES ($1::uuid, $2, $3, $4::jsonb)
         ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = excluded.value_json`,
        [listingId, group, key, JSON.stringify({ label: it.name, enabled: true })],
      )
    }
  }
  await putLegacy('imported_amenity', amenities)
  await putLegacy('imported_included', included)
  await putLegacy('imported_excluded', excluded)

  const themeArr = [...themeEn]
  const ruleArr = [...ruleCodes]
  await pgClient.query(
    `INSERT INTO listing_holiday_home_details (listing_id, theme_codes, rule_codes, ical_managed)
     VALUES ($1::uuid, $2::text[], $3::text[], $4)
     ON CONFLICT (listing_id) DO UPDATE SET
       theme_codes = EXCLUDED.theme_codes,
       rule_codes = EXCLUDED.rule_codes,
       ical_managed = EXCLUDED.ical_managed`,
    [listingId, themeArr, ruleArr, Boolean(icalUrl)],
  )
}

async function importOne(pgClient, mysql, space, mediaMap, stats) {
  const legacyId = space.id
  const slug = normalizeSlug(space.slug, legacyId)
  const status = space.status === 'publish' ? 'published' : 'draft'
  const currency = normalizeCurrency(space.currency)
  const locationName = await loadLocationName(mysql, space.location_id)

  const existing = await findExistingListing(pgClient, slug, legacyId)
  let listingId = existing?.id

  if (CREATE_MISSING_ONLY && existing) {
    stats.skippedExisting++
    if (stats.skippedExisting <= 10 || stats.skippedExisting % 100 === 0) {
      log('skip existing', legacyId, existing.slug || slug)
    }
    return
  }

  const terms = await loadTermsForSpace(mysql, legacyId)
  const vitrin = buildBravoHolidayHomeVitrinPackage(space, {}, terms)
  const meta = vitrin.meta
  const propertyType = resolveHolidayPropertyType(terms, space)
  if (propertyType) meta.property_type = propertyType

  if (DRY_RUN) {
    stats.dryRun++
    log('DRY', legacyId, slug, status)
    return
  }

  await pgClient.query('BEGIN')
  try {
    if (listingId) {
      await pgClient.query(
        `UPDATE listings SET
           slug = $2, status = $3, currency_code = $4,
           min_stay_nights = $5, cleaning_fee_amount = NULL,
           map_lat = $6, map_lng = $7, location_name = $8,
           external_listing_ref = $9, share_to_social = $10,
           instant_book = $11, updated_at = now()
         WHERE id = $1::uuid`,
        [
          listingId,
          slug,
          status,
          currency,
          space.min_day_stays,
          space.map_lat,
          space.map_lng,
          locationName || space.address || '',
          String(legacyId),
          Boolean(space.is_featured),
          Boolean(space.is_instant),
        ],
      )
    } else {
      const ins = await pgClient.query(
        `INSERT INTO listings (
           organization_id, category_id, slug, status, currency_code,
           min_stay_nights, map_lat, map_lng, location_name,
           external_listing_ref, share_to_social, instant_book, listing_source
         ) VALUES (
           $1::uuid, $2, $3, $4, $5,
           $6, $7, $8, $9,
           $10, $11, $12, 'manual'
         ) RETURNING id::text`,
        [
          ORG_ID,
          CATEGORY_ID,
          slug,
          status,
          currency,
          space.min_day_stays,
          space.map_lat,
          space.map_lng,
          locationName || space.address || '',
          String(legacyId),
          Boolean(space.is_featured),
          Boolean(space.is_instant),
        ],
      )
      listingId = ins.rows[0].id
    }

    await pgClient.query(
      `INSERT INTO listing_translations (listing_id, locale_id, title, description)
       VALUES ($1::uuid, $2, $3, $4)
       ON CONFLICT (listing_id, locale_id) DO UPDATE SET
         title = EXCLUDED.title,
         description = EXCLUDED.description`,
      [listingId, LOCALE_TR, space.title || slug, space.content || ''],
    )

    const ownerContact =
      vitrin.ownerContact || (await loadBravoOwnerContact(mysql, space))
    await applyBravoHolidayHomeVitrinFields(pgClient, listingId, {
      meta,
      pools: vitrin.pools,
      ownerContact,
      poolSizeLabel: vitrin.poolSizeLabel,
      damageDepositAmount: vitrin.damageDepositAmount,
      accommodationRuleIds: vitrin.accommodationRuleIds,
    })

    if (propertyType) await applyListingPropertyType(pgClient, listingId, propertyType)

    await upsertAttributes(pgClient, listingId, terms, space.ical_import_url)

    const seasonal = await importBravoSeasonalPriceRules(
      pgClient,
      mysql,
      listingId,
      legacyId,
      space,
    )
    if (seasonal.periods > 0) {
      stats.seasonalPeriods = (stats.seasonalPeriods ?? 0) + seasonal.periods
    }

    const galleryIds = String(space.gallery || '')
      .split(',')
      .map((x) => Number(x.trim()))
      .filter(Boolean)

    await importImages(
      pgClient,
      listingId,
      slug,
      galleryIds,
      space.image_id,
      space.banner_image_id,
      mediaMap,
      stats,
    )

    const calDays = await importCalendar(pgClient, listingId, legacyId, mysql)
    stats.calendarDays += calDays

    await pgClient.query('COMMIT')
    if (existing) stats.updated++
    else stats.created++
    log('OK', legacyId, slug, `days=${calDays}`)
  } catch (e) {
    await pgClient.query('ROLLBACK')
    stats.errors++
    log('ERR', legacyId, slug, e.message)
  }
}

async function main() {
  log('=== import-bravo-spaces start ===')
  log(
    'skip-images=',
    SKIP_IMAGES,
    'dry-run=',
    DRY_RUN,
    'create-missing-only=',
    CREATE_MISSING_ONLY,
    'limit=',
    LIMIT || 'all',
  )

  const mysqlConn = await mysql.createConnection(mysqlConfigFromArgv())

  const pgClient = new pg.Client({
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: '',
    database: 'travel',
  })
  await pgClient.connect()

  let sql = `SELECT s.* FROM bravo_spaces s
    WHERE s.deleted_at IS NULL AND s.status = 'publish'
    ORDER BY s.id`
  if (LIMIT > 0) sql += ` LIMIT ${LIMIT}`

  const [spaces] = await mysqlConn.query(sql)
  log('publish listings to import:', spaces.length)

  const allMediaIds = []
  for (const s of spaces) {
    if (s.image_id) allMediaIds.push(Number(s.image_id))
    if (s.banner_image_id) allMediaIds.push(Number(s.banner_image_id))
    for (const part of String(s.gallery || '').split(',')) {
      const n = Number(part.trim())
      if (n) allMediaIds.push(n)
    }
  }
  log('loading media map...', allMediaIds.length, 'ids')
  const mediaMap = await loadMediaMap(mysqlConn, allMediaIds)
  log('media rows loaded:', mediaMap.size)

  const stats = {
    created: 0,
    updated: 0,
    errors: 0,
    imagesOk: 0,
    imagesFail: 0,
    calendarDays: 0,
    dryRun: 0,
    skippedExisting: 0,
  }

  let n = 0
  for (const space of spaces) {
    n++
    if (n % 25 === 0) log(`--- progress ${n}/${spaces.length} ---`)
    await importOne(pgClient, mysqlConn, space, mediaMap, stats)
  }

  await mysqlConn.end()
  await pgClient.end()

  log('=== done ===', JSON.stringify(stats))
  log('log file:', logPath)
  logStream.end()
}

main().catch((e) => {
  console.error(e)
  logStream.write(`FATAL ${e.stack}\n`)
  logStream.end()
  process.exit(1)
})
