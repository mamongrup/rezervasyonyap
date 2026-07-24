/**
 * Bravo Events (MySQL bravo_events) → travel PostgreSQL aktivite ilanları.
 * Görseller AVIF; fiyatlar seans + yetişkin/çocuk ücreti + vitrin base_price.
 *
 *   node scripts/import-bravo-events.mjs --dry-run
 *   node scripts/import-bravo-events.mjs --limit 3
 *   node scripts/import-bravo-events.mjs --skip-images
 */

import { createWriteStream, existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { mediaUrlCandidates } from './lib/bravo-media.mjs'
import { avifFileName, downloadAndSaveAvif } from './lib/wtatil-image-download.mjs'
import { listingStorageKey, listingUploadDir } from './lib/listing-upload-path.mjs'
import { createPgClient } from './lib/pg-client.mjs'
import { mysqlConfigFromArgv } from './lib/bravo-mysql-config.mjs'
import { createBundleMysql, loadBravoCollisionBundle } from './lib/bravo-collision-bundle.mjs'
import { repairBravoTurkishAscii } from './lib/bravo-turkish-ascii-repair.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TRAVEL_ROOT = path.resolve(__dirname, '..')
const require = createRequire(path.join(TRAVEL_ROOT, 'frontend', 'package.json'))
const REPAIR_BUNDLE_PATH = path.join(
  TRAVEL_ROOT,
  'scripts',
  'data',
  'bravo-id-collision-repair.json',
)

const UPLOADS_ROOT = path.join(TRAVEL_ROOT, 'frontend', 'public', 'uploads', 'listings')
const PROVIDER = 'bravo_event'
const ORG_ID = 'a0000000-0000-4000-8000-000000000001'

const args = new Set(process.argv.slice(2))
const SKIP_IMAGES = args.has('--skip-images')
const DRY_RUN = args.has('--dry-run')
const REPAIR_ID_COLLISIONS = args.has('--repair-id-collisions')
const limitIdx = process.argv.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : 0

const logPath = path.join(
  TRAVEL_ROOT,
  'backups',
  `import-bravo-events-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.log`,
)
mkdir(path.dirname(logPath), { recursive: true }).catch(() => {})
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
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  if (!s) s = `aktivite-${legacyId}`
  return s.slice(0, 110)
}

function normalizeStartTime(raw) {
  const s = String(raw || '10:00').trim().replace('.', ':')
  const m = s.match(/^(\d{1,2}):(\d{2})/)
  if (!m) return '10:00'
  return `${String(Number(m[1])).padStart(2, '0')}:${m[2]}`
}

function durationToMinutes(duration, unit) {
  const n = Number(duration)
  if (!Number.isFinite(n) || n <= 0) return 0
  const u = String(unit || 'hour').toLowerCase()
  if (u.startsWith('min')) return Math.round(n)
  if (u.startsWith('day')) return Math.round(n * 24 * 60)
  return Math.round(n * 60)
}

function parseTicketTypes(raw) {
  if (!raw) return { adultPrice: '', childPrice: '', capacity: 0 }
  let arr = raw
  if (typeof raw === 'string') {
    try {
      arr = JSON.parse(raw)
    } catch {
      return { adultPrice: '', childPrice: '', capacity: 0 }
    }
  }
  if (!Array.isArray(arr)) return { adultPrice: '', childPrice: '', capacity: 0 }

  let adultPrice = ''
  let childPrice = ''
  let capacity = 0
  for (const t of arr) {
    const code = String(t?.code || t?.name || '').toLowerCase()
    const price = String(t?.price ?? '').trim()
    const num = Number(t?.number ?? 0)
    if (Number.isFinite(num) && num > capacity) capacity = num
    if (!price) continue
    if (code.includes('child') || code.includes('çocuk') || code.includes('cocuk')) {
      if (!childPrice) childPrice = price
    } else if (code.includes('adult') || code.includes('yeti') || !childPrice) {
      if (!adultPrice) adultPrice = price
    }
  }
  return { adultPrice, childPrice, capacity }
}

function pickDisplayPrice(event, tickets) {
  if (tickets.adultPrice) return tickets.adultPrice
  if (event.sale_price != null && String(event.sale_price).trim() !== '') return String(event.sale_price)
  if (event.price != null) return String(event.price)
  return ''
}

function sessionDateRange() {
  const from = new Date()
  const to = new Date(from)
  to.setFullYear(to.getFullYear() + 2)
  return {
    validFrom: from.toISOString().slice(0, 10),
    validTo: to.toISOString().slice(0, 10),
  }
}

async function loadMediaMap(mysqlConn, ids) {
  const map = new Map()
  const uniq = [...new Set(ids.filter(Boolean))]
  for (let i = 0; i < uniq.length; i += 500) {
    const chunk = uniq.slice(i, i + 500)
    const [rows] = await mysqlConn.query(
      `SELECT id, file_name, file_path, file_extension FROM media_files WHERE id IN (${chunk.map(() => '?').join(',')})`,
      chunk,
    )
    for (const r of rows) map.set(Number(r.id), r)
  }
  return map
}

async function loadLocationName(mysqlConn, locationId) {
  if (!locationId) return ''
  const [rows] = await mysqlConn.query(`SELECT name FROM bravo_locations WHERE id = ? LIMIT 1`, [locationId])
  return repairBravoTurkishAscii(rows[0]?.name?.trim() || '')
}

async function findExistingListing(pgClient, legacyId) {
  const r = await pgClient.query(
    `SELECT id::text, slug FROM listings
     WHERE external_provider_code = $1 AND external_listing_ref = $2
     LIMIT 1`,
    [PROVIDER, String(legacyId)],
  )
  return r.rows[0] || null
}

async function ensureUniqueSlug(pgClient, slug, legacyId, listingId) {
  let candidate = slug
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await pgClient.query(
      `SELECT id::text FROM listings
       WHERE slug = $1 AND ($2::uuid IS NULL OR id <> $2::uuid)
       LIMIT 1`,
      [candidate, listingId || null],
    )
    if (!r.rows[0]) return candidate
    candidate = `${slug}-be-${legacyId}`.slice(0, 120)
  }
  return candidate
}

async function resolveImportContext(pgClient) {
  const cat = await pgClient.query(`SELECT id FROM product_categories WHERE code = 'activity' LIMIT 1`)
  if (!cat.rows[0]) throw new Error("product_categories.code = 'activity' bulunamadı")
  const loc = await pgClient.query(`SELECT id FROM locales WHERE code = 'tr' AND is_active = true LIMIT 1`)
  if (!loc.rows[0]) throw new Error("locales.code = 'tr' bulunamadı")
  return { categoryId: cat.rows[0].id, localeTrId: loc.rows[0].id }
}

async function importImagesAvif(pgClient, listingId, slug, galleryIds, imageId, bannerId, mediaMap, stats) {
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

  const storageRows = []
  let sort = 0

  for (const mid of orderedIds) {
    const m = mediaMap.get(mid)
    const urls = mediaUrlCandidates(m)
    if (!urls.length) continue

    const fileName = avifFileName(sort, urls[0])
    const destAbs = path.join(listingUploadDir(UPLOADS_ROOT, 'activity', slug), fileName)
    const storageKey = listingStorageKey('activity', slug, fileName)

    if (!SKIP_IMAGES && !DRY_RUN) {
      let saved = false
      let lastErr = null
      for (const url of urls) {
        try {
          const r = await downloadAndSaveAvif(url, destAbs, { dryRun: false })
          stats.imagesOk++
          stats.bytesAvif += r.bytes || 0
          if (url !== urls[0]) log('  image fallback', slug, url)
          saved = true
          break
        } catch (e) {
          lastErr = e
        }
      }
      if (!saved) {
        stats.imagesFail++
        log('  image fail', slug, urls.join(' | '), lastErr?.message || 'download failed')
        continue
      }
    } else if (!SKIP_IMAGES && DRY_RUN) {
      stats.imagesOk++
    }

    storageRows.push({ storageKey, sort })
    sort++
  }

  if (DRY_RUN || storageRows.length === 0) return storageRows

  await pgClient.query(`DELETE FROM listing_images WHERE listing_id = $1::uuid`, [listingId])
  for (const row of storageRows) {
    await pgClient.query(
      `INSERT INTO listing_images (listing_id, sort_order, storage_key, original_mime)
       VALUES ($1::uuid, $2, $3, 'image/avif')`,
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

async function upsertActivitySession(pgClient, listingId, event, tickets, currency) {
  const { validFrom, validTo } = sessionDateRange()
  const startTime = normalizeStartTime(event.start_time)
  const durationMinutes = durationToMinutes(event.duration, event.duration_unit)
  const capacity = tickets.capacity || 100
  const adultPrice = tickets.adultPrice || pickDisplayPrice(event, tickets)
  const childPrice = tickets.childPrice || ''

  await pgClient.query(`DELETE FROM listing_activity_sessions WHERE listing_id = $1::uuid`, [listingId])

  const ins = await pgClient.query(
    `INSERT INTO listing_activity_sessions (
       listing_id, valid_from, valid_to, start_time, duration_minutes, capacity, is_active, sort_order
     ) VALUES ($1::uuid, $2::date, $3::date, $4::time, $5, $6, true, 0)
     RETURNING id::text`,
    [listingId, validFrom, validTo, startTime, durationMinutes, capacity],
  )
  const sessionId = ins.rows[0]?.id
  if (!sessionId) return

  if (adultPrice) {
    await pgClient.query(
      `INSERT INTO listing_activity_session_fares (session_id, fare_type, price_amount, currency_code)
       VALUES ($1::uuid, 'adult', replace($2::text, ',', '.')::numeric, $3)
       ON CONFLICT (session_id, fare_type) DO UPDATE SET
         price_amount = EXCLUDED.price_amount,
         currency_code = EXCLUDED.currency_code`,
      [sessionId, adultPrice, currency],
    )
  }
  if (childPrice) {
    await pgClient.query(
      `INSERT INTO listing_activity_session_fares (session_id, fare_type, price_amount, currency_code)
       VALUES ($1::uuid, 'child', replace($2::text, ',', '.')::numeric, $3)
       ON CONFLICT (session_id, fare_type) DO UPDATE SET
         price_amount = EXCLUDED.price_amount,
         currency_code = EXCLUDED.currency_code`,
      [sessionId, childPrice, currency],
    )
  }
}

async function upsertPriceRule(pgClient, listingId, basePrice) {
  if (!basePrice) return
  await pgClient.query(`DELETE FROM listing_price_rules WHERE listing_id = $1::uuid`, [listingId])
  await pgClient.query(
    `INSERT INTO listing_price_rules (listing_id, rule_json, valid_from, valid_to)
     VALUES ($1::uuid, $2::jsonb, NULL, NULL)`,
    [listingId, JSON.stringify({ base_price: basePrice, source: PROVIDER })],
  )
}

async function importOne(pgClient, mysqlConn, ctx, event, mediaMap, stats) {
  const legacyId = event.id
  const existing = await findExistingListing(pgClient, legacyId)
  let slug = normalizeSlug(event.slug, legacyId)
  slug = await ensureUniqueSlug(pgClient, slug, legacyId, existing?.id)
  const status = event.status === 'publish' ? 'published' : 'draft'
  const currency = normalizeCurrency(event.currency)
  const locationName = await loadLocationName(mysqlConn, event.location_id)
  const address = repairBravoTurkishAscii(event.address || '')
  const tickets = parseTicketTypes(event.ticket_types)
  const displayPrice = pickDisplayPrice(event, tickets)
  const durationMinutes = durationToMinutes(event.duration, event.duration_unit)
  const durationHours =
    event.duration != null && String(event.duration_unit || '').toLowerCase().startsWith('hour')
      ? String(event.duration)
      : durationMinutes > 0
        ? String(Math.round((durationMinutes / 60) * 10) / 10)
        : ''

  const meta = {
    address,
    lat: event.map_lat || '',
    lng: event.map_lng || '',
    legacy_bravo_event_id: String(legacyId),
    ticket_types: tickets,
    bravo_duration_unit: event.duration_unit || '',
    bravo_start_time: event.start_time || '',
  }

  const verticalMeta = {
    session_based: true,
    full_day: durationMinutes >= 480,
    duration_hours: durationHours,
    max_participants: tickets.capacity ? String(tickets.capacity) : '',
    meeting_point: address || locationName || '',
  }

  if (DRY_RUN) {
    stats.dryRun++
    log('DRY', legacyId, slug, status, displayPrice, currency)
    return
  }

  await pgClient.query('BEGIN')
  try {
    let listingId = existing?.id

    if (listingId) {
      await pgClient.query(
        `UPDATE listings SET
           slug = $2, status = $3, currency_code = $4,
           map_lat = $5, map_lng = $6, location_name = $7,
           external_provider_code = $8, external_listing_ref = $9,
           share_to_social = $10, instant_book = $11,
           listing_source = 'manual', last_synced_at = now(), updated_at = now()
         WHERE id = $1::uuid`,
        [
          listingId,
          slug,
          status,
          currency,
          event.map_lat,
          event.map_lng,
          locationName || address || '',
          PROVIDER,
          String(legacyId),
          Boolean(event.is_featured),
          Boolean(event.is_instant),
        ],
      )
    } else {
      const ins = await pgClient.query(
        `INSERT INTO listings (
           organization_id, category_id, slug, status, currency_code,
           map_lat, map_lng, location_name,
           external_provider_code, external_listing_ref,
           share_to_social, instant_book, listing_source, last_synced_at
         ) VALUES (
           $1::uuid, $2, $3, $4, $5,
           $6, $7, $8,
           $9, $10,
           $11, $12, 'manual', now()
         ) RETURNING id::text`,
        [
          ORG_ID,
          ctx.categoryId,
          slug,
          status,
          currency,
          event.map_lat,
          event.map_lng,
          locationName || address || '',
          PROVIDER,
          String(legacyId),
          Boolean(event.is_featured),
          Boolean(event.is_instant),
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
      [listingId, ctx.localeTrId, repairBravoTurkishAscii(event.title || slug), repairBravoTurkishAscii(event.content || '')],
    )

    await pgClient.query(
      `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
       VALUES ($1::uuid, 'listing_meta', 'v1', $2::jsonb)
       ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = excluded.value_json`,
      [listingId, JSON.stringify(meta)],
    )

    await pgClient.query(
      `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
       VALUES ($1::uuid, 'vertical_activity', 'v1', $2::jsonb)
       ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = excluded.value_json`,
      [listingId, JSON.stringify(verticalMeta)],
    )

    await pgClient.query(
      `INSERT INTO listing_activity_details (listing_id, session_based, full_day)
       VALUES ($1::uuid, true, $2)
       ON CONFLICT (listing_id) DO UPDATE SET
         session_based = EXCLUDED.session_based,
         full_day = EXCLUDED.full_day`,
      [listingId, durationMinutes >= 480],
    )

    await upsertActivitySession(pgClient, listingId, event, tickets, currency)
    await upsertPriceRule(pgClient, listingId, displayPrice)

    const galleryIds = String(event.gallery || '')
      .split(',')
      .map((x) => Number(x.trim()))
      .filter(Boolean)

    await importImagesAvif(
      pgClient,
      listingId,
      slug,
      galleryIds,
      event.image_id,
      event.banner_image_id,
      mediaMap,
      stats,
    )

    await pgClient.query('COMMIT')
    if (existing) stats.updated++
    else stats.created++
    log('OK', legacyId, slug, displayPrice, currency)
  } catch (e) {
    await pgClient.query('ROLLBACK')
    stats.errors++
    log('ERR', legacyId, slug, e.message)
  }
}

async function main() {
  log('=== import-bravo-events start ===')
  log(
    'skip-images=',
    SKIP_IMAGES,
    'dry-run=',
    DRY_RUN,
    'repair-id-collisions=',
    REPAIR_ID_COLLISIONS,
    'limit=',
    LIMIT || 'all',
  )

  let mysqlConn
  let events
  let mediaMap

  if (REPAIR_ID_COLLISIONS && existsSync(REPAIR_BUNDLE_PATH)) {
    const bundle = await loadBravoCollisionBundle(REPAIR_BUNDLE_PATH)
    mysqlConn = createBundleMysql(bundle)
    events = LIMIT > 0 ? bundle.events.slice(0, LIMIT) : bundle.events
    mediaMap = new Map((bundle.media ?? []).map((row) => [Number(row.id), row]))
    log('repair source=portable PostgreSQL bundle:', REPAIR_BUNDLE_PATH)
  } else {
    const mysql = require('mysql2/promise')
    mysqlConn = await mysql.createConnection(mysqlConfigFromArgv())

    let sql = `SELECT e.* FROM bravo_events e
      WHERE e.deleted_at IS NULL`
    if (REPAIR_ID_COLLISIONS) {
      sql += ` AND EXISTS (
        SELECT 1 FROM bravo_spaces s
        WHERE s.id = e.id AND s.deleted_at IS NULL AND s.status = 'publish'
      )`
    } else {
      sql += ` AND e.status = 'publish'`
    }
    sql += `
      ORDER BY e.id`
    if (LIMIT > 0) sql += ` LIMIT ${LIMIT}`

    const [sourceEvents] = await mysqlConn.query(sql)
    events = sourceEvents
  }

  const pgClient = createPgClient()
  await pgClient.connect()

  const ctx = await resolveImportContext(pgClient)

  log('publish events to import:', events.length)

  if (!mediaMap) {
    const allMediaIds = []
    for (const e of events) {
      if (e.image_id) allMediaIds.push(Number(e.image_id))
      if (e.banner_image_id) allMediaIds.push(Number(e.banner_image_id))
      for (const part of String(e.gallery || '').split(',')) {
        const n = Number(part.trim())
        if (n) allMediaIds.push(n)
      }
    }
    mediaMap = await loadMediaMap(mysqlConn, allMediaIds)
  }
  log('media_files loaded:', mediaMap.size)

  const stats = {
    created: 0,
    updated: 0,
    errors: 0,
    dryRun: 0,
    imagesOk: 0,
    imagesFail: 0,
    bytesAvif: 0,
  }

  for (const event of events) {
    await importOne(pgClient, mysqlConn, ctx, event, mediaMap, stats)
  }

  await mysqlConn.end()
  await pgClient.end()

  log('=== done ===', JSON.stringify(stats))
  if (existsSync(logPath)) log('log:', logPath)
  logStream.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
