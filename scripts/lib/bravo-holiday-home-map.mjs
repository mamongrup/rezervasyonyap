/**
 * Bravo `bravo_spaces` → travel tatil evi vitrin alanları.
 *
 * Panel / vitrin beklediği kaynaklar:
 *   - listing_meta (group listing_meta, key v1) — m², oda, giriş/çıkış, depozito meta
 *   - listings.first_charge_amount — hasar depozitosu (vitrin)
 *   - listings.pool_size_label — kısa havuz özeti
 *   - listing_owner_contacts — ev sahibi kartı (SectionHost)
 *   - vertical_holiday_home — havuz kartları (ListingPoolInfoSection)
 */

const CHILD_POOL_THEME = new Set(['cocuk-havuzlu-villalar', 'child_friendly'])
const HEATED_POOL_THEME = new Set(['isitmali-havuzlu-villalar', 'ozel_havuzlu', 'pool'])

/** Bravo attr_id=11 slug → `listing_holiday_home_details.rule_codes` */
export const BRAVO_RULE_SLUG_TO_CODE = {
  'cocuklara-uygun': 'child_friendly',
  'evcil-hayvan-istenmiyor': 'no_pets',
  'evcil-hayvan-dostu-1': 'pets_allowed',
  'etkinliklere-uygun': 'events_allowed',
}

/** rule_codes → kategori şablonu id (317_holiday_home_accommodation_rules_seed.sql) */
export const HOLIDAY_HOME_RULE_CODE_TO_ACCOMMODATION_ID = {
  child_friendly: 'hh-rule-child-friendly',
  no_pets: 'hh-rule-no-pets',
  pets_allowed: 'hh-rule-pets-allowed',
  events_allowed: 'hh-rule-events-allowed',
}

export function buildBravoHolidayHomeRuleCodes(terms = []) {
  const codes = new Set()
  for (const t of terms) {
    const slug = String(t.slug || '').trim().toLowerCase()
    const code = BRAVO_RULE_SLUG_TO_CODE[slug]
    if (code) codes.add(code)
  }
  return [...codes]
}

export function mapHolidayHomeRuleCodesToAccommodationIds(ruleCodes = []) {
  const ids = []
  const seen = new Set()
  for (const code of ruleCodes) {
    const id = HOLIDAY_HOME_RULE_CODE_TO_ACCOMMODATION_ID[String(code).trim()]
    if (id && !seen.has(id)) {
      seen.add(id)
      ids.push(id)
    }
  }
  return ids
}

function emptyPoolRow() {
  return {
    enabled: false,
    width: '',
    length: '',
    depth: '',
    description: '',
    heating_fee_per_day: '',
  }
}

function truthyBravoFlag(v) {
  const s = String(v ?? '')
    .trim()
    .toLowerCase()
  if (!s || s === '0' || s === 'false' || s === 'no' || s === 'hayir' || s === 'hayır') return false
  return true
}

function pickText(obj, ...keys) {
  for (const k of keys) {
    const v = obj?.[k]
    if (v != null && String(v).trim()) return String(v).trim()
  }
  return ''
}

/** "4x8x1.5" / "4 x 8 x 1,5" → { length, width, depth } veya { description } */
export function parseBravoPoolDimensions(text) {
  const s = String(text || '').trim()
  if (!s) return {}
  const m = s.match(
    /(\d+(?:[.,]\d+)?)\s*[x×*]\s*(\d+(?:[.,]\d+)?)(?:\s*[x×*]\s*(\d+(?:[.,]\d+)?))?/i,
  )
  if (!m) return { description: s }
  const norm = (x) => String(x).replace(',', '.')
  return {
    length: norm(m[1]),
    width: norm(m[2]),
    depth: m[3] ? norm(m[3]) : '',
    description: s,
  }
}

function normalizePoolDimension(raw) {
  const s = String(raw ?? '').trim()
  if (!s) return ''
  return s.replace(',', '.')
}

function readBravoOpenPoolDimensions(space) {
  return {
    width: normalizePoolDimension(space?.pool_width),
    length: normalizePoolDimension(space?.pool_length),
    depth: normalizePoolDimension(space?.pool_depth),
  }
}

function hasPoolDimensions(row) {
  return Boolean(String(row?.width ?? '').trim() || String(row?.length ?? '').trim() || String(row?.depth ?? '').trim())
}

function isBravoNegativeFlag(raw) {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase()
  return !s || s === '0' || s === 'false' || s === 'no' || s === 'hayir' || s === 'hayır'
}

function inheritOpenPoolDimensions(target, openDims) {
  if (hasPoolDimensions(target) || !hasPoolDimensions(openDims)) return target
  return { ...target, ...openDims }
}

function themeSlugs(terms) {
  return new Set((terms ?? []).map((t) => String(t.slug || '').trim().toLowerCase()).filter(Boolean))
}

function mergePoolRow(base, patch) {
  return { ...base, ...patch, enabled: true }
}

/**
 * Bravo havuz alanları + tema → panel `vertical_holiday_home.pools`.
 * @param {{
 *   pool_type?: string
 *   pool_width?: string
 *   pool_length?: string
 *   pool_depth?: string
 *   children_pool?: string
 *   heated_pool_status?: string
 *   heated_pool?: string
 * }} space
 * @param {{ slug?: string }[]} [terms]
 */
export function buildBravoHolidayHomePools(space, terms = []) {
  const pools = {
    open_pool: emptyPoolRow(),
    heated_pool: emptyPoolRow(),
    children_pool: emptyPoolRow(),
  }
  const slugs = themeSlugs(terms)
  const openDims = readBravoOpenPoolDimensions(space)
  const poolType = pickText(space, 'pool_type', 'pool_info')

  if (hasPoolDimensions(openDims)) {
    pools.open_pool = mergePoolRow(pools.open_pool, {
      ...openDims,
      description: poolType,
    })
  } else if (poolType) {
    const parsed = parseBravoPoolDimensions(poolType)
    if (hasPoolDimensions(parsed)) {
      pools.open_pool = mergePoolRow(pools.open_pool, {
        width: parsed.width ?? '',
        length: parsed.length ?? '',
        depth: parsed.depth ?? '',
        description: parsed.description === poolType ? '' : parsed.description,
      })
    } else {
      pools.open_pool = mergePoolRow(pools.open_pool, { description: poolType })
    }
  } else if (truthyBravoFlag(space?.has_pool) || truthyBravoFlag(space?.pool)) {
    pools.open_pool = mergePoolRow(pools.open_pool, { description: 'Özel havuz' })
  }

  const heatedRaw = pickText(space, 'heated_pool')
  const heatedStatus = pickText(space, 'heated_pool_status')

  if (heatedRaw) {
    const parsed = parseBravoPoolDimensions(heatedRaw)
    if (truthyBravoFlag(heatedRaw) && !hasPoolDimensions(parsed) && !parsed.description) {
      pools.heated_pool = mergePoolRow(pools.heated_pool, inheritOpenPoolDimensions(
        { description: 'Isıtmalı havuz' },
        openDims,
      ))
    } else {
      pools.heated_pool = mergePoolRow(
        pools.heated_pool,
        inheritOpenPoolDimensions(
          {
            width: parsed.width ?? '',
            length: parsed.length ?? '',
            depth: parsed.depth ?? '',
            description: parsed.description || 'Isıtmalı havuz',
          },
          openDims,
        ),
      )
    }
  } else if (truthyBravoFlag(heatedStatus)) {
    pools.heated_pool = mergePoolRow(pools.heated_pool, inheritOpenPoolDimensions(
      { description: 'Isıtmalı havuz' },
      openDims,
    ))
  }

  for (const slug of HEATED_POOL_THEME) {
    if (slugs.has(slug)) {
      pools.heated_pool = mergePoolRow(
        pools.heated_pool,
        inheritOpenPoolDimensions(
          { description: pools.heated_pool.description || 'Isıtmalı havuz' },
          openDims,
        ),
      )
      break
    }
  }

  const childrenRaw = String(space?.children_pool ?? '').trim()
  if (childrenRaw && !isBravoNegativeFlag(childrenRaw)) {
    if (truthyBravoFlag(childrenRaw) && !/\d/.test(childrenRaw)) {
      pools.children_pool = mergePoolRow(pools.children_pool, { description: 'Çocuk havuzu' })
    } else {
      const parsed = parseBravoPoolDimensions(childrenRaw)
      pools.children_pool = mergePoolRow(pools.children_pool, {
        width: parsed.width ?? '',
        length: parsed.length ?? '',
        depth: parsed.depth ?? '',
        description: parsed.description || 'Çocuk havuzu',
      })
    }
  }

  for (const slug of CHILD_POOL_THEME) {
    if (slugs.has(slug)) {
      pools.children_pool = mergePoolRow(pools.children_pool, {
        description: pools.children_pool.description || 'Çocuk havuzu',
      })
      break
    }
  }

  if (!pools.open_pool.enabled && (pools.heated_pool.enabled || pools.children_pool.enabled)) {
    pools.open_pool = mergePoolRow(pools.open_pool, inheritOpenPoolDimensions(
      { description: poolType || 'Özel havuz' },
      openDims,
    ))
  }

  return pools
}

export function bravoPoolsHaveContent(pools) {
  return (
    pools.open_pool.enabled || pools.heated_pool.enabled || pools.children_pool.enabled
  )
}

/** listings.pool_size_label — kısa özet */
export function buildBravoPoolSizeLabel(pools, space) {
  const parts = []
  for (const [key, label] of [
    ['open_pool', 'Açık'],
    ['heated_pool', 'Isıtmalı'],
    ['children_pool', 'Çocuk'],
  ]) {
    const row = pools[key]
    if (!row?.enabled) continue
    const dims = [row.length, row.width, row.depth].filter(Boolean).join('×')
    parts.push(dims ? `${label} ${dims}m` : label)
  }
  if (parts.length) return parts.join(' · ')
  const fallbackDims = readBravoOpenPoolDimensions(space)
  if (hasPoolDimensions(fallbackDims)) {
    return [fallbackDims.length, fallbackDims.width, fallbackDims.depth].filter(Boolean).join('×')
  }
  const fallback = pickText(space, 'pool_type')
  return fallback ? fallback.slice(0, 120) : ''
}

function parsePositiveAmount(raw) {
  if (raw == null || String(raw).trim() === '') return null
  const n = Number(String(raw).replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Bravo space + mevcut meta → panel `listing_meta` (vitrin arama ile uyumlu anahtarlar). */
export function mergeBravoListingMeta(space, existingMeta = {}, terms = []) {
  const meta = { ...(existingMeta && typeof existingMeta === 'object' ? existingMeta : {}) }
  const square =
    space.square != null
      ? String(space.square)
      : meta.square_meters || meta.square_m2 || ''

  const patch = {
    address: space.address || meta.address || '',
    lat: space.map_lat != null ? String(space.map_lat) : meta.lat || '',
    lng: space.map_lng != null ? String(space.map_lng) : meta.lng || '',
    max_guests: space.max_guests != null ? String(space.max_guests) : meta.max_guests || '',
    room_count: space.bed != null ? String(space.bed) : meta.room_count || '',
    bed_count: space.bed != null ? String(space.bed) : meta.bed_count || '',
    bath_count: space.bathroom != null ? String(space.bathroom) : meta.bath_count || '',
    square_meters: square,
    min_advance_booking_days:
      space.min_day_before_booking != null
        ? String(space.min_day_before_booking)
        : meta.min_advance_booking_days || '',
    damage_deposit:
      space.damage_deposit != null ? String(space.damage_deposit) : meta.damage_deposit || '',
    check_in_time: space.check_in_time || meta.check_in_time || '16:00',
    check_out_time: space.check_out_time || meta.check_out_time || '10:00',
    pool_type: space.pool_type || meta.pool_type || '',
    pool_width: space.pool_width != null ? String(space.pool_width) : meta.pool_width || '',
    pool_length: space.pool_length != null ? String(space.pool_length) : meta.pool_length || '',
    pool_depth: space.pool_depth != null ? String(space.pool_depth) : meta.pool_depth || '',
    heated_pool: space.heated_pool || meta.heated_pool || '',
    heated_pool_status: space.heated_pool_status || meta.heated_pool_status || '',
    children_pool: space.children_pool || meta.children_pool || '',
    legacy_bravo_id: String(space.id ?? meta.legacy_bravo_id ?? ''),
    short_stay_fee:
      space.cleaning_fee != null ? String(space.cleaning_fee) : meta.short_stay_fee || '',
    min_short_stay_nights:
      space.cleaning_fee_day != null
        ? String(space.cleaning_fee_day)
        : meta.min_short_stay_nights || '',
    youtube_url:
      pickText(space, 'video', 'youtube', 'youtube_url') || meta.youtube_url || '',
    tourism_cert_no:
      pickText(space, 'tourism_license', 'license', 'permit_number', 'tourism_cert') ||
      meta.tourism_cert_no ||
      '',
  }

  if (terms?.length && !patch.property_type && meta.property_type) {
    patch.property_type = meta.property_type
  }

  // Eski import `square_m2` — panel square_meters okur; ikisini hizala.
  if (patch.square_meters) patch.square_m2 = patch.square_meters

  return { ...meta, ...patch }
}

/** Doğrudan space üzerinde iletişim alanı varsa */
export function pickBravoOwnerContactFromSpace(space) {
  const name =
    pickText(space, 'vendor_name', 'owner_name', 'contact_name', 'host_name') ||
    [pickText(space, 'first_name'), pickText(space, 'last_name')].filter(Boolean).join(' ')
  const phone = pickText(space, 'phone', 'contact_phone', 'vendor_phone', 'mobile')
  const email = pickText(space, 'email', 'contact_email', 'vendor_email')
  if (!name && !phone && !email) return null
  return {
    contact_name: name || null,
    contact_phone: phone || null,
    contact_email: email || null,
  }
}

function normalizeOwnerRow(row) {
  if (!row || typeof row !== 'object') return null
  const name =
    pickText(row, 'business_name', 'name', 'display_name') ||
    [pickText(row, 'first_name'), pickText(row, 'last_name')].filter(Boolean).join(' ')
  const phone = pickText(row, 'phone', 'mobile', 'tel')
  const email = pickText(row, 'email')
  if (!name && !phone && !email) return null
  return {
    contact_name: name || null,
    contact_phone: phone || null,
    contact_email: email || null,
  }
}

/** author_id / vendor_id → users veya bravo_vendor (tablo yoksa sessizce atlanır). */
export async function loadBravoOwnerContact(mysql, space) {
  const direct = pickBravoOwnerContactFromSpace(space)
  if (direct) return direct

  const uid =
    space.author_id ??
    space.create_user ??
    space.vendor_id ??
    space.user_id ??
    space.owner_id
  if (!uid) return null

  const queries = [
    `SELECT first_name, last_name, email, phone FROM users WHERE id = ? LIMIT 1`,
    `SELECT name, email, phone FROM users WHERE id = ? LIMIT 1`,
    `SELECT business_name, email, phone FROM bravo_vendor WHERE id = ? LIMIT 1`,
    `SELECT name, email, phone FROM bravo_vendors WHERE id = ? LIMIT 1`,
  ]

  for (const sql of queries) {
    try {
      const [rows] = await mysql.query(sql, [uid])
      const normalized = normalizeOwnerRow(rows[0])
      if (normalized) return normalized
    } catch {
      /* tablo yok */
    }
  }
  return null
}

/**
 * Havuz + ev sahibi + depozito + pool_size_label — PostgreSQL upsert.
 * @param {import('pg').Client} pgClient
 */
export async function applyBravoHolidayHomeVitrinFields(
  pgClient,
  listingId,
  { meta, pools, ownerContact, poolSizeLabel, damageDepositAmount, accommodationRuleIds, tourismCertNo },
) {
  if (meta && Object.keys(meta).length) {
    await pgClient.query(
      `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
       VALUES ($1::uuid, 'listing_meta', 'v1', $2::jsonb)
       ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
         value_json = COALESCE(listing_attributes.value_json, '{}'::jsonb) || EXCLUDED.value_json`,
      [listingId, JSON.stringify(meta)],
    )
  }

  if (pools && bravoPoolsHaveContent(pools)) {
    const body = { category: 'holiday_home', data: { pools } }
    await pgClient.query(
      `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
       VALUES ($1::uuid, 'vertical_holiday_home', 'v1', $2::jsonb)
       ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = excluded.value_json`,
      [listingId, JSON.stringify(body)],
    )
  }

  if (ownerContact && (ownerContact.contact_name || ownerContact.contact_phone || ownerContact.contact_email)) {
    await pgClient.query(
      `INSERT INTO listing_owner_contacts (listing_id, contact_name, contact_phone, contact_email)
       VALUES ($1::uuid, $2, $3, $4)
       ON CONFLICT (listing_id) DO UPDATE SET
         contact_name = COALESCE(NULLIF(EXCLUDED.contact_name, ''), listing_owner_contacts.contact_name),
         contact_phone = COALESCE(NULLIF(EXCLUDED.contact_phone, ''), listing_owner_contacts.contact_phone),
         contact_email = COALESCE(NULLIF(EXCLUDED.contact_email, ''), listing_owner_contacts.contact_email)`,
      [
        listingId,
        ownerContact.contact_name || '',
        ownerContact.contact_phone || '',
        ownerContact.contact_email || '',
      ],
    )
  }

  if (accommodationRuleIds?.length) {
    await pgClient.query(
      `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
       VALUES ($1::uuid, 'catalog', 'accommodation_rule_ids', $2::jsonb)
       ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = excluded.value_json`,
      [listingId, JSON.stringify(accommodationRuleIds)],
    )
  }

  const listingPatch = []
  const listingParams = [listingId]
  let p = 2

  if (damageDepositAmount != null) {
    listingPatch.push(`first_charge_amount = $${p}::numeric`)
    listingParams.push(damageDepositAmount)
    p++
  }

  if (poolSizeLabel && String(poolSizeLabel).trim()) {
    listingPatch.push(`pool_size_label = $${p}`)
    listingParams.push(String(poolSizeLabel).trim().slice(0, 200))
    p++
  }

  // Bravo eski kayıtlarda belgeyi yalnız listing_meta.tourism_cert_no içine
  // getiriyordu. Vitrin/public API ise kanonik listings.ministry_license_ref
  // alanını okur. Kaynak boşsa mevcut panel değerini asla silme.
  const cert = String(tourismCertNo ?? meta?.tourism_cert_no ?? '').trim()
  if (cert) {
    listingPatch.push(`ministry_license_ref = COALESCE(NULLIF($${p}, ''), ministry_license_ref)`)
    listingParams.push(cert)
    p++
  }

  if (listingPatch.length) {
    listingPatch.push('updated_at = now()')
    await pgClient.query(
      `UPDATE listings SET ${listingPatch.join(', ')} WHERE id = $1::uuid`,
      listingParams,
    )
  }
}

/**
 * Villa sağlayıcılarının "temizlik ücreti" olarak verdiği tutar sistemde
 * kısa konaklama ücreti olarak gösterilir. Yeni paketler shortStayFee alanını,
 * eski paketler geriye dönük uyumluluk için cleaningFee alanını kullanabilir.
 */
export function withVillaShortStayFeeMeta(meta, pkg = {}) {
  const result = { ...(meta || {}) }
  const fee = pkg.shortStayFee ?? pkg.cleaningFee
  if (fee == null || fee === '') return result

  result.short_stay_fee = String(fee)
  const threshold = pkg.minShortStayNights
  if (threshold != null && threshold !== '') {
    result.min_short_stay_nights = String(threshold)
  }
  return result
}

/** Tek Bravo space + terms → vitrin paketi. */
export function buildBravoHolidayHomeVitrinPackage(space, existingMeta = {}, terms = []) {
  const meta = mergeBravoListingMeta(space, existingMeta, terms)
  const pools = buildBravoHolidayHomePools(space, terms)
  const poolSizeLabel = buildBravoPoolSizeLabel(pools, space)
  const damageDepositAmount =
    parsePositiveAmount(space.damage_deposit) ?? parsePositiveAmount(meta.damage_deposit)
  const ownerContact = pickBravoOwnerContactFromSpace(space)
  const ruleCodes = buildBravoHolidayHomeRuleCodes(terms)
  const accommodationRuleIds = mapHolidayHomeRuleCodesToAccommodationIds(ruleCodes)
  return { meta, pools, poolSizeLabel, damageDepositAmount, ownerContact, ruleCodes, accommodationRuleIds }
}
