#!/usr/bin/env node
/**
 * Fairy Stone Kapadokya aktiviteleri → katalog (product_categories.code = activity).
 *
 *   node scripts/import-fairystone-activities.mjs --file deploy/data/fairystone/kapadokya-activities.json
 *   node scripts/import-fairystone-activities.mjs --file ... --dry-run
 *   node scripts/import-fairystone-activities.mjs --file ... --skip-images
 *
 * Fiyatlar seans ücreti (adult) + listing_price_rules + vitrin_price.
 * Görseller varsayılan olarak uzak URL (fairystonetravel.com); --download-images ile AVIF.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPgClient } from './lib/pg-client.mjs'
import { avifFileName, downloadAndSaveAvif } from './lib/wtatil-image-download.mjs'
import { listingStorageKey, listingUploadDir } from './lib/listing-upload-path.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const PROVIDER = 'fairystone'
const ORG_ID = process.env.FAIRYSTONE_ORG_ID || 'a0000000-0000-4000-8000-000000000001'
const UPLOADS_ROOT = path.join(ROOT, 'frontend', 'public', 'uploads', 'listings')

const argv = process.argv.slice(2)
const args = new Set(argv)
const valueAfter = (flag) => {
  const i = argv.indexOf(flag)
  return i >= 0 ? argv[i + 1] : undefined
}
const DRY_RUN = args.has('--dry-run')
const SKIP_IMAGES = args.has('--skip-images')
const DOWNLOAD_IMAGES = args.has('--download-images')
const LIMIT = Math.max(0, Number(valueAfter('--limit') || 0))
const FILE_PATH =
  valueAfter('--file') ||
  process.env.FAIRYSTONE_FEED_FILE ||
  path.join(ROOT, 'deploy/data/fairystone/kapadokya-activities.json')
const LISTING_STATUS = process.env.FAIRYSTONE_LISTING_STATUS || 'published'

function normalizeSlug(slug, fallback) {
  let s = String(slug || fallback || '')
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ç/g, 'c')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  if (!s) s = `aktivite-${fallback || 'x'}`
  return s.slice(0, 110)
}

function normalizeStartTime(raw) {
  const s = String(raw || '10:00').trim().replace('.', ':')
  const m = s.match(/^(\d{1,2}):(\d{2})/)
  if (!m) return '10:00'
  return `${String(Number(m[1])).padStart(2, '0')}:${m[2]}`
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

async function resolveImportContext(pg) {
  const cat = await pg.query(`SELECT id FROM product_categories WHERE code = 'activity' LIMIT 1`)
  if (!cat.rows[0]) throw new Error("product_categories.code = 'activity' bulunamadı")
  const loc = await pg.query(`SELECT id FROM locales WHERE code = 'tr' AND is_active = true LIMIT 1`)
  if (!loc.rows[0]) throw new Error("locales.code = 'tr' bulunamadı")
  return { categoryId: cat.rows[0].id, localeTrId: loc.rows[0].id }
}

async function ensureUniqueSlug(pg, slug, externalId, listingId) {
  let candidate = slug
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await pg.query(
      `SELECT id::text FROM listings
       WHERE slug = $1 AND ($2::uuid IS NULL OR id <> $2::uuid)
       LIMIT 1`,
      [candidate, listingId || null],
    )
    if (!r.rows[0]) return candidate
    candidate = `${slug}-fs-${externalId}`.slice(0, 120)
  }
  return candidate
}

async function importImages(pg, listingId, slug, imageUrls, stats) {
  if (SKIP_IMAGES || !imageUrls?.length) return
  const urls = [...new Set(imageUrls.filter(Boolean))].slice(0, 24)
  const rows = []

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]
    if (DOWNLOAD_IMAGES && !DRY_RUN) {
      const fileName = avifFileName(i, url)
      const destAbs = path.join(listingUploadDir(UPLOADS_ROOT, 'activity', slug), fileName)
      const storageKey = listingStorageKey('activity', slug, fileName)
      try {
        await downloadAndSaveAvif(url, destAbs, { dryRun: false })
        rows.push({ storageKey, sort: i, mime: 'image/avif' })
        stats.imagesOk++
      } catch (e) {
        stats.imagesFail++
        console.warn(`  image fail ${slug}: ${e.message || e}`)
        rows.push({ storageKey: url, sort: i, mime: 'image/jpeg' })
      }
    } else {
      rows.push({ storageKey: url, sort: i, mime: 'image/jpeg' })
      stats.imagesOk++
    }
  }

  if (DRY_RUN || !rows.length) return

  await pg.query(`DELETE FROM listing_images WHERE listing_id = $1::uuid`, [listingId])
  for (const row of rows) {
    await pg.query(
      `INSERT INTO listing_images (listing_id, sort_order, storage_key, original_mime)
       VALUES ($1::uuid, $2, $3, $4)`,
      [listingId, row.sort, row.storageKey, row.mime],
    )
  }
  const hero = rows[0]?.storageKey
  if (hero) {
    const publicPath = hero.startsWith('http') ? hero : `/${hero}`
    await pg.query(
      `UPDATE listings SET featured_image_url = $2, thumbnail_url = $2, updated_at = now() WHERE id = $1::uuid`,
      [listingId, publicPath],
    )
  }
}

async function upsertSession(pg, listingId, activity, currency) {
  const { validFrom, validTo } = sessionDateRange()
  const startTime = normalizeStartTime(activity.startTime)
  const durationMinutes = Math.round(Number(activity.durationHours || 2) * 60)
  const capacity = Math.max(1, Number(activity.capacity) || 10)
  const adultPrice = Number(activity.adultPrice)
  const childPrice =
    activity.childPrice != null && Number(activity.childPrice) > 0
      ? Number(activity.childPrice)
      : null

  await pg.query(`DELETE FROM listing_activity_sessions WHERE listing_id = $1::uuid`, [listingId])
  const ins = await pg.query(
    `INSERT INTO listing_activity_sessions (
       listing_id, valid_from, valid_to, start_time, duration_minutes, capacity, is_active, sort_order
     ) VALUES ($1::uuid, $2::date, $3::date, $4::time, $5, $6, true, 0)
     RETURNING id::text`,
    [listingId, validFrom, validTo, startTime, durationMinutes, capacity],
  )
  const sessionId = ins.rows[0]?.id
  if (!sessionId) return
  if (Number.isFinite(adultPrice) && adultPrice > 0) {
    await pg.query(
      `INSERT INTO listing_activity_session_fares (session_id, fare_type, price_amount, currency_code)
       VALUES ($1::uuid, 'adult', $2::numeric, $3)
       ON CONFLICT (session_id, fare_type) DO UPDATE SET
         price_amount = EXCLUDED.price_amount,
         currency_code = EXCLUDED.currency_code`,
      [sessionId, adultPrice, currency],
    )
  }
  if (childPrice != null) {
    await pg.query(
      `INSERT INTO listing_activity_session_fares (session_id, fare_type, price_amount, currency_code)
       VALUES ($1::uuid, 'child', $2::numeric, $3)
       ON CONFLICT (session_id, fare_type) DO UPDATE SET
         price_amount = EXCLUDED.price_amount,
         currency_code = EXCLUDED.currency_code`,
      [sessionId, childPrice, currency],
    )
  }
}

async function importOne(pg, ctx, activity, stats) {
  const externalId = String(activity.id || '').trim()
  if (!externalId) throw new Error('id_missing')
  const name = String(activity.name || '').trim()
  if (!name) throw new Error(`name_missing:${externalId}`)
  const adultPrice = Number(activity.adultPrice)
  if (!Number.isFinite(adultPrice) || adultPrice <= 0) throw new Error(`price_missing:${externalId}`)

  const existing = await pg.query(
    `SELECT id::text, slug FROM listings
     WHERE external_provider_code = $1 AND external_listing_ref = $2 LIMIT 1`,
    [PROVIDER, externalId],
  )
  const existingId = existing.rows[0]?.id || null
  let slug = normalizeSlug(activity.slug || name, externalId)
  slug = await ensureUniqueSlug(pg, slug, externalId, existingId)
  const currency = String(activity.currency || 'EUR').toUpperCase()
  const durationHours = Number(activity.durationHours) || 2
  const durationMinutes = Math.round(durationHours * 60)
  const fullDay = Boolean(activity.fullDay || durationHours >= 8)
  const locationName =
    activity.locationName ||
    [activity.district, activity.city, activity.provinceCity].filter(Boolean).join(', ') ||
    'Kapadokya, Nevşehir'

  if (DRY_RUN) {
    stats.dryRun++
    console.log(
      `DRY ${externalId} ${slug} ${adultPrice} ${currency} imgs=${(activity.images || []).length}`,
    )
    return
  }

  await pg.query('BEGIN')
  try {
    let listingId = existingId
    if (listingId) {
      await pg.query(
        `UPDATE listings SET
           slug = $2, status = $3, currency_code = $4,
           map_lat = $5::numeric, map_lng = $6::numeric, location_name = $7,
           external_provider_code = $8, external_listing_ref = $9,
           listing_source = 'api', last_synced_at = now(), updated_at = now(),
           vitrin_price = $10::numeric, first_charge_amount = $10::numeric
         WHERE id = $1::uuid`,
        [
          listingId,
          slug,
          LISTING_STATUS,
          currency,
          activity.lat ?? null,
          activity.lng ?? null,
          locationName,
          PROVIDER,
          externalId,
          adultPrice,
        ],
      )
      stats.updated++
    } else {
      const ins = await pg.query(
        `INSERT INTO listings (
           organization_id, category_id, slug, status, currency_code,
           map_lat, map_lng, location_name,
           external_provider_code, external_listing_ref,
           listing_source, last_synced_at, vitrin_price, first_charge_amount
         ) VALUES (
           $1::uuid, $2::smallint, $3, $4, $5,
           $6::numeric, $7::numeric, $8,
           $9, $10,
           'api', now(), $11::numeric, $11::numeric
         ) RETURNING id::text`,
        [
          ORG_ID,
          ctx.categoryId,
          slug,
          LISTING_STATUS,
          currency,
          activity.lat ?? null,
          activity.lng ?? null,
          locationName,
          PROVIDER,
          externalId,
          adultPrice,
        ],
      )
      listingId = ins.rows[0].id
      stats.created++
    }

    await pg.query(
      `INSERT INTO listing_translations (listing_id, locale_id, title, description)
       VALUES ($1::uuid, $2::smallint, $3, $4)
       ON CONFLICT (listing_id, locale_id) DO UPDATE SET
         title = EXCLUDED.title,
         description = EXCLUDED.description`,
      [listingId, ctx.localeTrId, name, activity.description || ''],
    )

    const meta = {
      address: activity.address || '',
      city: activity.city || 'Göreme',
      district_label: activity.district || 'Kapadokya',
      province_city: activity.provinceCity || 'Nevşehir',
      region_display: 'Kapadokya',
      lat: activity.lat != null ? String(activity.lat) : '',
      lng: activity.lng != null ? String(activity.lng) : '',
      source_url: activity.url || '',
      theme_tags: activity.themeTags || [],
      locations: activity.locations || [],
      includes: activity.includes || [],
      excludes: activity.excludes || [],
      provider: PROVIDER,
      sku: activity.sku || null,
    }
    await pg.query(
      `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
       VALUES ($1::uuid, 'listing_meta', 'v1', $2::jsonb)
       ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
         value_json = listing_attributes.value_json || EXCLUDED.value_json`,
      [listingId, JSON.stringify(meta)],
    )

    const verticalMeta = {
      session_based: true,
      full_day: fullDay,
      duration_hours: String(durationHours),
      max_participants: String(activity.capacity || ''),
      meeting_point: activity.address || locationName,
      source: PROVIDER,
      source_url: activity.url || '',
    }
    await pg.query(
      `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
       VALUES ($1::uuid, 'vertical_activity', 'v1', $2::jsonb)
       ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json`,
      [listingId, JSON.stringify(verticalMeta)],
    )

    await pg.query(
      `INSERT INTO listing_activity_details (listing_id, session_based, full_day)
       VALUES ($1::uuid, true, $2)
       ON CONFLICT (listing_id) DO UPDATE SET
         session_based = EXCLUDED.session_based,
         full_day = EXCLUDED.full_day`,
      [listingId, fullDay],
    )

    await upsertSession(pg, listingId, activity, currency)

    await pg.query(`DELETE FROM listing_price_rules WHERE listing_id = $1::uuid AND rule_json->>'source' = $2`, [
      listingId,
      PROVIDER,
    ])
    await pg.query(
      `INSERT INTO listing_price_rules (listing_id, rule_json, valid_from, valid_to)
       VALUES ($1::uuid, $2::jsonb, NULL, NULL)`,
      [
        listingId,
        JSON.stringify({
          source: PROVIDER,
          base_price: String(adultPrice),
          base_nightly: String(adultPrice),
          currency,
          unit: 'per_person',
        }),
      ],
    )

    await importImages(pg, listingId, slug, activity.images || [], stats)

    await pg.query(
      `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
       VALUES ($1::uuid, $2, 'snapshot', $3::jsonb)
       ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json`,
      [listingId, PROVIDER, JSON.stringify({ ...activity, normalized_at: new Date().toISOString() })],
    )

    await pg.query('COMMIT')
    console.log(`OK ${externalId} → ${slug} ${adultPrice} ${currency}`)
  } catch (e) {
    await pg.query('ROLLBACK')
    stats.errors++
    throw e
  }
}

async function main() {
  if (!fs.existsSync(FILE_PATH)) throw new Error(`feed_missing:${FILE_PATH}`)
  const feed = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'))
  let activities = Array.isArray(feed.activities) ? feed.activities : Array.isArray(feed) ? feed : []
  if (LIMIT > 0) activities = activities.slice(0, LIMIT)

  const pg = createPgClient()
  await pg.connect()
  const stats = { created: 0, updated: 0, errors: 0, dryRun: 0, imagesOk: 0, imagesFail: 0 }
  try {
    const ctx = await resolveImportContext(pg)
    for (const activity of activities) {
      try {
        await importOne(pg, ctx, activity, stats)
      } catch (e) {
        console.error(`FAIL ${activity?.id}: ${e.message || e}`)
        stats.errors++
      }
    }
    if (!DRY_RUN) {
      try {
        await pg.query(`SELECT refresh_listing_vitrin_prices()`)
      } catch (e) {
        console.warn('refresh_listing_vitrin_prices skip:', e.message || e)
      }
    }
  } finally {
    await pg.end()
  }
  console.log(JSON.stringify({ file: FILE_PATH, ...stats }, null, 2))
  if (stats.errors && !stats.created && !stats.updated && !stats.dryRun) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
