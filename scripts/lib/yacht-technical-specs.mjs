/**
 * Yat teknik özellikleri — kaynak etiketlerini (TR/EN) kanonik alanlara map eder.
 * Baransen/Akasia/Ada Yacht tarzı dt/dd ve açıklama blokları desteklenir.
 */

const KEY_ALIASES = {
  boat_code: [
    'tekne kodu',
    'boat code',
    'code',
    'ref',
    'referans',
  ],
  yacht_type: [
    'tekne sınıfı',
    'tekne sinifi',
    'boat type',
    'yacht type',
    'class',
    'tip',
    'yat tipi',
  ],
  build_year: ['yapım yılı', 'yapim yili', 'build year', 'year built', 'year', 'model year'],
  port_name: ['liman', 'port', 'marina', 'base port', 'kalkış', 'kalkis', 'departure'],
  length_meters: [
    'boy',
    'length',
    'tekne uzunluğu',
    'tekne uzunlugu',
    'loa',
    'uzunluk',
  ],
  beam_meters: ['en', 'beam', 'genişlik', 'genislik', 'width'],
  cabin_count: ['kabin', 'cabins', 'cabin', 'cabins count'],
  bathroom_count: ['banyo', 'bathrooms', 'bathroom', 'wc', 'tuvalet'],
  air_conditioning: ['klima', 'air conditioning', 'air con', 'ac', 'a/c'],
  crew_count: ['personel', 'crew', 'mürettebat', 'murettebat'],
  passenger_count: [
    'misafir kapasitesi',
    'misafir',
    'max guest',
    'guest capacity',
    'capacity',
    'kişi',
    'kisi',
    'yolcu',
    'pax',
  ],
  generator: ['jeneratör', 'jenerator', 'generator', 'genset'],
  speed_knots: ['hız', 'hiz', 'speed', 'max speed', 'cruise speed'],
  fuel_policy: ['yakıt', 'yakit', 'fuel', 'fuel policy'],
}

function normKey(raw) {
  return String(raw || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[:.]/g, '')
    .trim()
}

function parseIntField(raw) {
  const m = String(raw ?? '').match(/(\d+)/)
  if (!m) return null
  const n = parseInt(m[1], 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

function parseYesNo(raw) {
  const v = String(raw || '')
    .trim()
    .toLowerCase()
  if (!v) return null
  if (/^(var|evet|yes|true|1|dahil|included|ok)$/i.test(v)) return 'yes'
  if (/^(yok|hayır|hayir|no|false|0|none)$/i.test(v)) return 'no'
  return v.length <= 40 ? v : null
}

function canonicalField(label) {
  const k = normKey(label)
  if (!k) return null
  for (const [field, aliases] of Object.entries(KEY_ALIASES)) {
    if (aliases.some((a) => k === normKey(a) || k.includes(normKey(a)))) return field
  }
  return null
}

function setField(out, field, value) {
  const v = String(value ?? '').trim()
  if (!v) return
  if (!out[field]) out[field] = v
}

/** `- Boy: 18 M` veya `Boy: 18` satırları */
export function parseDescriptionSpecsBlock(text) {
  const out = {}
  const src = String(text || '')
  const idx = src.search(/teknik\s+özellikler|teknik\s+ozellikler/i)
  const block = idx >= 0 ? src.slice(idx) : src
  for (const line of block.split('\n')) {
    const trimmed = line.trim().replace(/^[-•*]\s*/, '')
    const m = trimmed.match(/^([^:–—-]+)\s*[:–—-]\s*(.+)$/)
    if (!m) continue
    const field = canonicalField(m[1])
    if (!field) continue
    setField(out, field, m[2].trim())
  }
  return out
}

/** dt/dd veya düz key-value map */
export function normalizeSpecsMap(specs) {
  const out = {}
  if (!specs || typeof specs !== 'object') return out
  for (const [label, value] of Object.entries(specs)) {
    const field = canonicalField(label)
    if (field) setField(out, field, value)
  }
  return out
}

export function mergeTechnicalSpecs(...layers) {
  const out = {}
  for (const layer of layers) {
    if (!layer || typeof layer !== 'object') continue
    for (const [k, v] of Object.entries(layer)) {
      if (v != null && String(v).trim() !== '') out[k] = String(v).trim()
    }
  }
  return out
}

export function buildYachtExtraFromTechnical(specs, prevExtra = {}) {
  const merged = mergeTechnicalSpecs(prevExtra, specs)
  const out = { ...prevExtra }

  const assign = (key, val) => {
    if (val != null && String(val).trim() !== '') out[key] = String(val).trim()
  }

  assign('yacht_type', merged.yacht_type)
  assign('boat_code', merged.boat_code)
  assign('build_year', merged.build_year)
  assign('port_name', merged.port_name)
  assign('length_meters', merged.length_meters)
  assign('beam_meters', merged.beam_meters)
  assign('cabin_count', merged.cabin_count)
  assign('bathroom_count', merged.bathroom_count)
  assign('passenger_count', merged.passenger_count)
  assign('crew_count', merged.crew_count)
  assign('generator', merged.generator)
  assign('speed_knots', merged.speed_knots)
  assign('fuel_policy', merged.fuel_policy)

  const ac = parseYesNo(merged.air_conditioning)
  if (ac) out.air_conditioning = ac

  return out
}

export function technicalSpecsFromYatreyonuDetail(detail) {
  if (!detail) return {}
  const out = {}
  if (detail.lengthM) out.length_meters = String(detail.lengthM)
  if (detail.cabinCount) out.cabin_count = String(detail.cabinCount)
  if (detail.bathroomCount) out.bathroom_count = String(detail.bathroomCount)
  if (detail.pax) out.passenger_count = String(detail.pax)
  if (detail.buildYear) out.build_year = String(detail.buildYear)
  return out
}

export function technicalSpecsFromBaransenDetail(detail) {
  const out = normalizeSpecsMap(detail?.specs || {})
  if (detail?.lengthM && !out.length_meters) out.length_meters = String(detail.lengthM)
  if (detail?.cabinCount && !out.cabin_count) out.cabin_count = String(detail.cabinCount)
  if (detail?.bathroomCount && !out.bathroom_count) out.bathroom_count = String(detail.bathroomCount)
  if (detail?.pax && !out.passenger_count) out.passenger_count = String(detail.pax)
  if (detail?.marina && !out.port_name) out.port_name = String(detail.marina).trim()
  if (detail?.propertyType && !out.yacht_type) {
    out.yacht_type = String(detail.propertyType).replace(/_/g, ' ')
  }
  return out
}

export function parseLengthMeters(raw) {
  const n = parseFloat(String(raw || '').replace(/[^\d.,]/g, '').replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : null
}

export function parseSmallInt(raw) {
  return parseIntField(raw)
}

/** `listing_attributes.vertical_yacht_extra/v1` upsert (mevcut JSON ile birleşir). */
export async function upsertVerticalYachtExtra(pgClient, listingId, extraPatch, { replace = false } = {}) {
  let prev = {}
  if (!replace) {
    const cur = await pgClient.query(
      `SELECT value_json FROM listing_attributes
       WHERE listing_id = $1::uuid AND group_code = 'vertical_yacht_extra' AND key = 'v1'`,
      [listingId],
    )
    prev = cur.rows[0]?.value_json || {}
  }
  const next = buildYachtExtraFromTechnical(extraPatch, prev)
  await pgClient.query(
    `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
     VALUES ($1::uuid, 'vertical_yacht_extra', 'v1', $2::jsonb)
     ON CONFLICT (listing_id, group_code, key)
     DO UPDATE SET value_json = excluded.value_json`,
    [listingId, JSON.stringify(next)],
  )
  return next
}

const CORE_TECH_FIELDS = [
  'boat_code',
  'yacht_type',
  'build_year',
  'port_name',
  'length_meters',
  'beam_meters',
  'cabin_count',
  'bathroom_count',
  'air_conditioning',
  'crew_count',
  'passenger_count',
  'generator',
]

export function countCoreTechnicalFields(extra) {
  if (!extra || typeof extra !== 'object') return 0
  return CORE_TECH_FIELDS.filter((k) => String(extra[k] ?? '').trim()).length
}

export function missingCoreTechnicalFields(extra) {
  return CORE_TECH_FIELDS.filter((k) => !String(extra?.[k] ?? '').trim())
}
