#!/usr/bin/env node
/**
 * Tatilbudur otel feed'i -> katalog.
 *
 * Canlı fiyat ve stok için yalnızca izinli partner feed/API kullanılır. Tatilbudur'un
 * robots.txt ile kapattığı fiyat uçları taranmaz.
 *
 *   TATILBUDUR_FEED_URL=https://partner.example/hotels.json node scripts/import-tatilbudur-hotels.mjs
 *   node scripts/import-tatilbudur-hotels.mjs --file /secure/tatilbudur-hotels.json
 *   node scripts/import-tatilbudur-hotels.mjs --status
 *   node scripts/import-tatilbudur-hotels.mjs --reset --limit 10 --dry-run
 */
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { createPgClient } from './lib/pg-client.mjs'
import { createJobReporter } from './lib/sync-job-reporter.mjs'

const PROVIDER = 'tatilbudur'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const STATE_PATH = process.env.TATILBUDUR_IMPORT_STATE
  || path.join(ROOT, 'backups', 'tatilbudur-hotel-import-state.json')
const argv = process.argv.slice(2)
const args = new Set(argv)
const valueAfter = (flag) => {
  const i = argv.indexOf(flag)
  return i >= 0 ? argv[i + 1] : undefined
}
const DRY_RUN = args.has('--dry-run')
const STATUS = args.has('--status')
const RESET = args.has('--reset')
const LIMIT = Math.max(0, Number(valueAfter('--limit') || 0))
const FILE_PATH = valueAfter('--file') || process.env.TATILBUDUR_FEED_FILE || ''
const FEED_URL = process.env.TATILBUDUR_FEED_URL || ''
const LISTING_STATUS = process.env.TATILBUDUR_LISTING_STATUS || 'draft'
const JOB_ID = valueAfter('--job-id') || process.env.SYNC_JOB_ID || ''
const reporter = createJobReporter(JOB_ID)

function safeJson(raw, fallback) {
  try { return JSON.parse(raw) } catch { return fallback }
}

function loadState() {
  if (RESET || !fs.existsSync(STATE_PATH)) {
    return { version: 1, nextIndex: 0, fingerprint: '', created: 0, updated: 0, failed: 0, failures: [] }
  }
  return safeJson(fs.readFileSync(STATE_PATH, 'utf8'), {
    version: 1, nextIndex: 0, fingerprint: '', created: 0, updated: 0, failed: 0, failures: [],
  })
}

function saveState(state) {
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true })
  state.updatedAt = new Date().toISOString()
  const tmp = `${STATE_PATH}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2))
  fs.renameSync(tmp, STATE_PATH)
}

function slugify(value) {
  return String(value || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ş/g, 's')
    .replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    .slice(0, 88)
}

/** Ad + dış id'den kısa slug. id zaten ada eşitse `-tb-{id}` ekleme (çift uzunluk önlenir). */
function hotelListingSlug(name, externalId, rawSlug) {
  const base = slugify(rawSlug || name) || `otel-${slugify(externalId) || 'x'}`
  const idPart = slugify(externalId)
  if (!idPart || idPart === base || base.includes(idPart) || idPart.includes(base)) {
    return base.slice(0, 96)
  }
  const suffix = `-tb-${idPart}`
  const maxBase = Math.max(8, 96 - suffix.length)
  return `${base.slice(0, maxBase)}${suffix}`
}

function num(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const raw = String(value ?? '').trim().replace(/\s/g, '')
  if (!raw) return null
  const normalized = raw.includes(',')
    ? raw.replace(/\./g, '').replace(',', '.')
    : /^\d{1,3}(?:\.\d{3})+$/.test(raw)
      ? raw.replace(/\./g, '')
    : raw.replace(/[^\d.-]/g, '')
  const n = Number(normalized)
  return Number.isFinite(n) && n >= 0 ? n : null
}

function arr(value) {
  return Array.isArray(value) ? value : value == null ? [] : [value]
}

function textList(value) {
  return [...new Set(arr(value).map((x) => typeof x === 'string' ? x : x?.name || x?.label || '')
    .map((x) => String(x).trim()).filter(Boolean))]
}

function normalizeRate(rate, room) {
  const price = num(rate?.nightlyPrice ?? rate?.nightly_price ?? rate?.price ?? rate?.amount)
  if (price == null || price <= 0) return null
  return {
    validFrom: rate?.validFrom ?? rate?.valid_from ?? rate?.startDate ?? rate?.start_date ?? null,
    validTo: rate?.validTo ?? rate?.valid_to ?? rate?.endDate ?? rate?.end_date ?? null,
    nightlyPrice: price,
    currency: String(rate?.currency ?? room?.currency ?? 'TRY').toUpperCase(),
    boardType: String(rate?.boardType ?? rate?.board_type ?? room?.boardType ?? room?.board_type ?? '').trim(),
    refundable: rate?.refundable ?? null,
    availableUnits: num(rate?.availableUnits ?? rate?.available_units),
  }
}

function normalizeHotel(raw) {
  const externalId = String(raw?.id ?? raw?.hotelId ?? raw?.hotel_id ?? raw?.propertyId ?? '').trim()
  if (!externalId) throw new Error('hotel_id_missing')
  const name = String(raw?.name ?? raw?.hotelName ?? raw?.title ?? '').trim()
  if (!name) throw new Error(`hotel_name_missing:${externalId}`)
  const images = textList(raw?.gallery ?? raw?.images ?? raw?.photos)
  const featured = String(raw?.featuredImage ?? raw?.featured_image ?? raw?.image ?? images[0] ?? '').trim()
  if (featured && !images.includes(featured)) images.unshift(featured)
  const rooms = arr(raw?.rooms ?? raw?.roomTypes ?? raw?.room_types).map((room, index) => {
    const rates = arr(room?.rates ?? room?.prices ?? room?.ratePlans ?? room?.rate_plans)
      .map((rate) => normalizeRate(rate, room)).filter(Boolean)
    return {
      id: String(room?.id ?? room?.roomId ?? room?.room_id ?? index + 1),
      name: String(room?.name ?? room?.roomName ?? room?.title ?? `Oda ${index + 1}`).trim(),
      capacity: (() => {
        const value = num(room?.capacity ?? room?.maxGuests ?? room?.max_guests)
        return value == null ? null : Math.max(1, Math.round(value))
      })(),
      unitCount: Math.max(1, Math.round(num(room?.unitCount ?? room?.unit_count) || 1)),
      boardType: String(room?.boardType ?? room?.board_type ?? '').trim(),
      image: String(room?.image ?? room?.imageUrl ?? room?.image_url ?? '').trim(),
      images: textList(room?.images ?? room?.gallery ?? room?.photos),
      features: textList(room?.features ?? room?.amenities),
      rates,
    }
  })
  const allRates = rooms.flatMap((room) => room.rates)
  const minPrice = allRates.reduce((min, rate) => min == null || rate.nightlyPrice < min ? rate.nightlyPrice : min, null)
  const city = String(raw?.city ?? raw?.region ?? raw?.location?.city ?? '').trim()
  const district = String(raw?.district ?? raw?.location?.district ?? '').trim()
  const provinceCity = String(
    raw?.provinceCity ?? raw?.province_city ?? raw?.province ?? raw?.location?.province ?? '',
  ).trim()
  const address = String(raw?.address ?? raw?.location?.address ?? '').trim()
  const lat = num(raw?.lat ?? raw?.latitude ?? raw?.mapLat ?? raw?.map_lat ?? raw?.location?.lat)
  const lng = num(raw?.lng ?? raw?.longitude ?? raw?.mapLng ?? raw?.map_lng ?? raw?.location?.lng)
  const locationName = [district, city, provinceCity].filter(Boolean).join(', ') || city || district || ''
  return {
    externalId,
    slug: hotelListingSlug(name, externalId, raw?.slug),
    name,
    description: String(raw?.description ?? raw?.content ?? '').trim(),
    url: String(raw?.url ?? raw?.sourceUrl ?? raw?.source_url ?? '').trim(),
    city,
    district,
    provinceCity,
    address,
    lat,
    lng,
    locationName,
    countryCode: String(raw?.countryCode ?? raw?.country_code ?? 'TR').trim().toUpperCase(),
    starRating: num(raw?.starRating ?? raw?.star_rating ?? raw?.stars),
    guestScore: num(raw?.guestScore ?? raw?.guest_score ?? raw?.rating),
    reviewCount: num(raw?.reviewCount ?? raw?.review_count),
    checkIn: String(raw?.checkIn ?? raw?.check_in ?? '').trim(),
    checkOut: String(raw?.checkOut ?? raw?.check_out ?? '').trim(),
    amenities: textList(raw?.amenities ?? raw?.features),
    images,
    rooms,
    minPrice,
    currency: String(raw?.currency ?? allRates[0]?.currency ?? 'TRY').toUpperCase(),
    raw,
  }
}

async function loadFeed() {
  let body
  let source
  if (FILE_PATH) {
    source = path.resolve(FILE_PATH)
    body = fs.readFileSync(source, 'utf8')
  } else if (FEED_URL) {
    source = FEED_URL
    const headers = { Accept: 'application/json' }
    if (process.env.TATILBUDUR_FEED_TOKEN) headers.Authorization = `Bearer ${process.env.TATILBUDUR_FEED_TOKEN}`
    if (process.env.TATILBUDUR_FEED_API_KEY) headers['X-API-Key'] = process.env.TATILBUDUR_FEED_API_KEY
    const response = await fetch(FEED_URL, { headers, signal: AbortSignal.timeout(120_000) })
    if (!response.ok) throw new Error(`feed_http_${response.status}`)
    body = await response.text()
  } else {
    throw new Error('TATILBUDUR_FEED_URL veya --file gerekli; yasaklı fiyat uçları taranmaz')
  }
  const parsed = safeJson(body, null)
  if (parsed == null) throw new Error('feed_json_invalid')
  const rows = Array.isArray(parsed) ? parsed : parsed.hotels ?? parsed.items ?? parsed.data ?? []
  if (!Array.isArray(rows)) throw new Error('feed_hotels_array_missing')
  return {
    source,
    fingerprint: createHash('sha256').update(body).digest('hex').slice(0, 16),
    hotels: rows,
  }
}

async function resolveContext(pg) {
  const org = await pg.query(`SELECT id FROM organizations ORDER BY created_at LIMIT 1`)
  const cat = await pg.query(`SELECT id FROM product_categories WHERE code='hotel' LIMIT 1`)
  const loc = await pg.query(`SELECT id FROM locales WHERE code='tr' AND is_active=true LIMIT 1`)
  if (!org.rows[0] || !cat.rows[0] || !loc.rows[0]) throw new Error('import_context_missing')
  return { orgId: org.rows[0].id, categoryId: cat.rows[0].id, localeId: loc.rows[0].id }
}

async function upsertHotel(pg, ctx, hotel) {
  await pg.query('BEGIN')
  try {
    const existing = await pg.query(
      `SELECT id::text FROM listings WHERE organization_id=$1::uuid
       AND external_provider_code=$2 AND external_listing_ref=$3 LIMIT 1`,
      [ctx.orgId, PROVIDER, hotel.externalId],
    )
    let listingId = existing.rows[0]?.id
    const created = !listingId
    if (listingId) {
      // Mevcut yayın URL'sini koru — yeniden import kısa slug'ı ezmesin
      await pg.query(
        `UPDATE listings SET status=CASE WHEN status='published' THEN status ELSE $2 END,
         currency_code=$3, location_name=$4,
         map_lat=coalesce($5::numeric, map_lat), map_lng=coalesce($6::numeric, map_lng),
         listing_source='api', last_synced_at=now(), updated_at=now()
         WHERE id=$1::uuid`,
        [listingId, LISTING_STATUS, hotel.currency,
          hotel.locationName || hotel.city || hotel.district || null,
          hotel.lat, hotel.lng],
      )
    } else {
      const inserted = await pg.query(
        `INSERT INTO listings (organization_id, category_id, slug, status, currency_code, location_name,
         map_lat, map_lng, listing_source, external_provider_code, external_listing_ref, last_synced_at)
         VALUES ($1::uuid,$2::smallint,$3,$4,$5,$6,$7,$8,'api',$9,$10,now()) RETURNING id::text`,
        [ctx.orgId, ctx.categoryId, hotel.slug, LISTING_STATUS, hotel.currency,
          hotel.locationName || hotel.city || hotel.district || null,
          hotel.lat, hotel.lng, PROVIDER, hotel.externalId],
      )
      listingId = inserted.rows[0].id
    }
    await pg.query(
      `INSERT INTO listing_translations (listing_id,locale_id,title,description)
       VALUES ($1::uuid,$2::smallint,$3,$4) ON CONFLICT (listing_id,locale_id) DO UPDATE SET
       title=excluded.title, description=coalesce(nullif(excluded.description,''),listing_translations.description)`,
      [listingId, ctx.localeId, hotel.name, hotel.description],
    )
    const country = await pg.query(`SELECT id FROM countries WHERE iso2=$1 LIMIT 1`, [hotel.countryCode])
    await pg.query(
      `INSERT INTO listing_hotel_details (listing_id,star_rating,country_id) VALUES ($1::uuid,$2,$3)
       ON CONFLICT (listing_id) DO UPDATE SET star_rating=coalesce(excluded.star_rating,listing_hotel_details.star_rating),
       country_id=coalesce(excluded.country_id,listing_hotel_details.country_id)`,
      [listingId, hotel.starRating, country.rows[0]?.id ?? null],
    )
    if (hotel.images.length) {
      await pg.query(`UPDATE listings SET featured_image_url=$2,thumbnail_url=$2 WHERE id=$1::uuid`, [listingId, hotel.images[0]])
      await pg.query(`DELETE FROM listing_images WHERE listing_id=$1::uuid`, [listingId])
      for (let i = 0; i < hotel.images.length; i++) {
        await pg.query(
          `INSERT INTO listing_images (listing_id,sort_order,storage_key,original_mime)
           VALUES ($1::uuid,$2,$3,'image/jpeg')`, [listingId, i, hotel.images[i]],
        )
      }
    }
    await pg.query(
      `INSERT INTO listing_attributes (listing_id,group_code,key,value_json)
       VALUES ($1::uuid,'otel_kplus','v1',$2::jsonb) ON CONFLICT (listing_id,group_code,key)
       DO UPDATE SET value_json=excluded.value_json`,
      [listingId, JSON.stringify({ source: PROVIDER, items: hotel.amenities.map((name) => ({ group: 'hotel_features', name })) })],
    )
    await pg.query(
      `INSERT INTO listing_attributes (listing_id,group_code,key,value_json)
       VALUES ($1::uuid,$2,'snapshot',$3::jsonb) ON CONFLICT (listing_id,group_code,key)
       DO UPDATE SET value_json=excluded.value_json`,
      [listingId, PROVIDER, JSON.stringify({ ...hotel.raw, normalized_at: new Date().toISOString() })],
    )
    await pg.query(
      `INSERT INTO listing_attributes (listing_id,group_code,key,value_json)
       VALUES ($1::uuid,'vertical_hotel','v1',$2::jsonb) ON CONFLICT (listing_id,group_code,key)
       DO UPDATE SET value_json=excluded.value_json`,
      [listingId, JSON.stringify({ source: PROVIDER, source_url: hotel.url, check_in: hotel.checkIn,
        check_out: hotel.checkOut, guest_score: hotel.guestScore, review_count: hotel.reviewCount,
        address: hotel.address, district: hotel.district })],
    )
    if (hotel.district || hotel.city || hotel.provinceCity || hotel.address || hotel.lat != null) {
      const meta = {
        district_label: hotel.district || '',
        city: hotel.city || '',
        province_city: hotel.provinceCity || '',
        address: hotel.address || '',
      }
      if (hotel.lat != null) meta.lat = String(hotel.lat)
      if (hotel.lng != null) meta.lng = String(hotel.lng)
      await pg.query(
        `INSERT INTO listing_attributes (listing_id,group_code,key,value_json)
         VALUES ($1::uuid,'listing_meta','v1',$2::jsonb) ON CONFLICT (listing_id,group_code,key)
         DO UPDATE SET value_json=listing_attributes.value_json || excluded.value_json`,
        [listingId, JSON.stringify(meta)],
      )
    }
    if (hotel.rooms.length) {
      await pg.query(`DELETE FROM hotel_rooms WHERE listing_id=$1::uuid`, [listingId])
      for (const room of hotel.rooms) {
        await pg.query(
          `INSERT INTO hotel_rooms (listing_id,name,capacity,board_type,meta_json,unit_count)
           VALUES ($1::uuid,$2,$3,$4,$5::jsonb,$6)`,
          [listingId, room.name, room.capacity, room.boardType || null,
            JSON.stringify({ tatilbudur_room_type_id: room.id, image: room.image || room.images[0] || '',
              images: room.images.length ? room.images : room.image ? [room.image] : [],
              features: room.features, seasonal_prices: room.rates }), room.unitCount],
        )
      }
    }
    if (hotel.minPrice != null) {
      await pg.query(`DELETE FROM listing_price_rules WHERE listing_id=$1::uuid AND rule_json->>'source'=$2`, [listingId, PROVIDER])
      const rateGroups = hotel.rooms.flatMap((room) => room.rates.map((rate) => ({ ...rate, roomId: room.id, roomName: room.name })))
      if (!rateGroups.length) rateGroups.push({ nightlyPrice: hotel.minPrice, currency: hotel.currency, roomId: '', roomName: '' })
      for (const rate of rateGroups) {
        await pg.query(
          `INSERT INTO listing_price_rules (listing_id,rule_json,valid_from,valid_to)
           VALUES ($1::uuid,$2::jsonb,$3::date,$4::date)`,
          [listingId, JSON.stringify({ source: PROVIDER, base_nightly: String(rate.nightlyPrice),
            base_price: String(rate.nightlyPrice), currency: rate.currency, room_type_id: rate.roomId,
            room_name: rate.roomName, board_type: rate.boardType || '' }), rate.validFrom || null, rate.validTo || null],
        )
      }
      await pg.query(
        `UPDATE listings SET vitrin_price=$2,first_charge_amount=$2,currency_code=$3 WHERE id=$1::uuid`,
        [listingId, hotel.minPrice, hotel.currency],
      )
    }
    await pg.query('COMMIT')
    return created ? 'created' : 'updated'
  } catch (error) {
    await pg.query('ROLLBACK')
    throw error
  }
}

async function main() {
  const state = loadState()
  if (STATUS) {
    console.log(JSON.stringify({ statePath: STATE_PATH, ...state }, null, 2))
    return
  }
  const feed = await loadFeed()
  if (state.fingerprint && state.fingerprint !== feed.fingerprint && !RESET) {
    state.nextIndex = 0
  }
  state.fingerprint = feed.fingerprint
  state.source = feed.source
  state.total = feed.hotels.length
  const end = LIMIT > 0 ? Math.min(feed.hotels.length, state.nextIndex + LIMIT) : feed.hotels.length
  await reporter.start(feed.hotels.length)
  console.log(`[tatilbudur] ${state.nextIndex}/${feed.hotels.length} -> ${end} dry-run=${DRY_RUN}`)
  const pg = DRY_RUN ? null : createPgClient()
  if (pg) await pg.connect()
  try {
    const ctx = pg ? await resolveContext(pg) : null
    for (let i = state.nextIndex; i < end; i++) {
      try {
        const hotel = normalizeHotel(feed.hotels[i])
        const action = pg ? await upsertHotel(pg, ctx, hotel) : 'dry-run'
        if (action === 'created') state.created++
        if (action === 'updated') state.updated++
        console.log(`[${i + 1}/${feed.hotels.length}] ${hotel.name} -> ${action} oda:${hotel.rooms.length} fiyat:${hotel.minPrice ?? '-'}`)
      } catch (error) {
        state.failed++
        state.failures = [...(state.failures || []).filter((x) => x.index !== i),
          { index: i, error: String(error?.message || error).slice(0, 300), at: new Date().toISOString() }].slice(-500)
        console.error(`[${i + 1}/${feed.hotels.length}] HATA: ${error?.message || error}`)
      }
      state.nextIndex = i + 1
      await reporter.step(
        `[tatilbudur] ${state.nextIndex}/${feed.hotels.length}`,
        state.nextIndex,
        feed.hotels.length,
      )
      if (!DRY_RUN && state.nextIndex % 25 === 0) saveState(state)
    }
    if (!DRY_RUN) saveState(state)
    console.log(`[tatilbudur] tamam: ${state.nextIndex}/${feed.hotels.length} created=${state.created} updated=${state.updated} failed=${state.failed}`)
    await reporter.done(`Tatilbudur tamam: ${state.created} yeni, ${state.updated} güncelleme, ${state.failed} hata.`)
  } finally {
    if (pg) await pg.end()
  }
}

main().catch(async (error) => {
  await reporter.fail(error?.message || String(error))
  console.error(`[tatilbudur] FATAL: ${error?.stack || error}`)
  process.exit(1)
})
