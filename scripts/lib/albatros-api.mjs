/**
 * albatrosyachting.com — WordPress Houzez REST + detay HTML tamamlama.
 * Kaynak: https://www.albatrosyachting.com/ozelyatlar/
 */

import { fetchText } from './akasia-api.mjs'
import {
  isEnsuiteDefaultPropertyType,
  parseBathroomCount,
  parseCabinCountFromText,
  sanitizeBathCount,
} from './yacht-bathroom-parse.mjs'

const BASE = 'https://www.albatrosyachting.com'
const API = `${BASE}/wp-json/wp/v2`
const UA = 'TravelImport/1.0 (+rezervasyonyap)'

const TYPE_SLUG_MAP = {
  gulet: 'gulet',
  'gulet-2': 'gulet',
  motoryacht: 'motor_yat',
  'motoryacht-2': 'motor_yat',
  'motor-yat': 'motor_yat',
  trawler: 'motor_yat',
  'trawler-2': 'motor_yat',
  yelkenli: 'yelkenli',
  'sailing-yacht': 'yelkenli',
  katamaran: 'katamaran',
  catamaran: 'katamaran',
  motorsailer: 'yelkenli',
  'motorsailer-2': 'yelkenli',
}

const MONTH_RATES = [
  { key: 'april', meta: null, label: 'Nisan', from: '04-01', to: '04-30' },
  { key: 'may', meta: 'qodef_tour_may', label: 'Mayıs', from: '05-01', to: '05-31' },
  { key: 'june', meta: 'qodef_tour_june', label: 'Haziran', from: '06-01', to: '06-30' },
  { key: 'july', meta: 'qodef_tour_july', label: 'Temmuz', from: '07-01', to: '07-31' },
  { key: 'august', meta: 'qodef_tour_agust', label: 'Ağustos', from: '08-01', to: '08-31' },
  { key: 'september', meta: 'qodef_tour_september', label: 'Eylül', from: '09-01', to: '09-30' },
  { key: 'october', meta: 'qodef_tour_october', label: 'Ekim', from: '10-01', to: '10-31' },
]

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function decodeHtml(s) {
  return String(s || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim()
}

function stripTags(s) {
  return decodeHtml(String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
}

function htmlToPlain(html) {
  return decodeHtml(
    String(html || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
  )
}

function parseMoney(raw) {
  const s = String(raw ?? '').replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.')
  const n = parseFloat(s)
  return Number.isFinite(n) && n > 0 ? n : null
}

function metaVal(meta, key) {
  const v = meta?.[key]
  if (Array.isArray(v)) return v[0] ?? ''
  return v ?? ''
}

function metaInt(meta, key) {
  const n = parseInt(String(metaVal(meta, key)), 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

export async function fetchJson(url) {
  const text = await fetchText(url)
  return JSON.parse(text)
}

export async function loadTaxonomyMap(taxonomy) {
  const map = new Map()
  let page = 1
  for (;;) {
    const url = `${API}/${taxonomy}?per_page=100&page=${page}`
    const rows = await fetchJson(url)
    if (!Array.isArray(rows) || !rows.length) break
    for (const row of rows) {
      map.set(row.id, { id: row.id, name: decodeHtml(row.name), slug: row.slug })
    }
    if (rows.length < 100) break
    page += 1
    await sleep(200)
  }
  return map
}

export async function loadAllTaxonomies() {
  const [propertyType, propertyCity, propertyLabel, propertyFeature, propertyStatus] =
    await Promise.all([
      loadTaxonomyMap('property_type'),
      loadTaxonomyMap('property_city'),
      loadTaxonomyMap('property_label'),
      loadTaxonomyMap('property_feature'),
      loadTaxonomyMap('property_status'),
    ])
  return { propertyType, propertyCity, propertyLabel, propertyFeature, propertyStatus }
}

export function mapPropertyType(typeSlugs) {
  for (const slug of typeSlugs || []) {
    const k = String(slug || '').toLowerCase()
    if (TYPE_SLUG_MAP[k]) return TYPE_SLUG_MAP[k]
  }
  return 'gulet'
}

export function parseSeasonalRates(meta) {
  const postfix = String(metaVal(meta, 'fave_property_price_postfix'))
  const period = postfix === '0' ? 'weekly' : 'daily'
  const periodLabel = period === 'weekly' ? 'Haftalık' : 'Günlük'
  const rates = []

  for (const m of MONTH_RATES) {
    const raw = m.meta ? metaVal(meta, m.meta) : metaVal(meta, 'fave_property_price')
    const amount = parseMoney(raw)
    if (!amount) continue
    rates.push({
      label: m.label,
      amount,
      currency: 'EUR',
      period,
      periodLabel,
      validFrom: m.from,
      validTo: m.to,
    })
  }
  return rates
}

/** Dahil / hariç — açıklama metninden çıkarım. */
export function parseInclusionsExclusions(plainText) {
  const text = String(plainText || '')
  const inclusions = []
  const exclusions = []
  for (const m of text.matchAll(/([^.\n]{8,120}?)\s+dahildir/gi)) {
    const s = stripTags(m[1]).trim()
    if (s.length > 4) inclusions.push(s)
  }
  for (const m of text.matchAll(/([^.\n]{8,120}?)\s+haricidir/gi)) {
    const s = stripTags(m[1]).trim()
    if (s.length > 4) exclusions.push(s)
  }
  for (const m of text.matchAll(/fiyata\s+dahil[^:]*:?\s*([^.]+)/gi)) {
    const s = stripTags(m[1]).trim()
    if (s.length > 4) inclusions.push(s)
  }
  return { inclusions, exclusions }
}

export function buildSpecs(meta, tax, plainDescription) {
  const specs = {}
  const add = (k, v) => {
    if (v != null && String(v).trim() && String(v) !== '0') specs[k] = String(v).trim()
  }

  add('Uzunluk', metaVal(meta, 'fave_property_size') ? `${metaVal(meta, 'fave_property_size')} m` : '')
  add('Genişlik', metaVal(meta, 'fave_property_width') ? `${metaVal(meta, 'fave_property_width')} m` : '')
  add('Yapım yılı', metaVal(meta, 'fave_property_year'))
  add('Bayrak', metaVal(meta, 'fave_property_flag'))
  add('Mürettebat', metaVal(meta, 'fave_property_crew'))
  add('Motor', metaVal(meta, 'fave_property_engine'))
  add('Jeneratör', metaVal(meta, 'fave_property_generators'))
  add('Seyir hızı', metaVal(meta, 'fave_property_cruisingspeed'))
  add('Klima', metaVal(meta, 'fave_property_aircon') === '1' ? 'Var' : '')
  add('Master kabin', metaVal(meta, 'fave_property_rooms'))
  add('Double kabin', metaVal(meta, 'fave_property_doublec'))
  add('Twin kabin', metaVal(meta, 'fave_property_twinc'))
  add('VIP kabin', metaVal(meta, 'fave_property_vipc'))
  add('Triple kabin', metaVal(meta, 'fave_property_triplec'))
  add('Sınıf', tax.labelNames.join(', '))
  add('Durum', tax.statusNames.join(', '))
  add('Lokasyon', tax.cityNames.join(', '))

  if (plainDescription) {
    const cab = parseCabinCountFromText(plainDescription)
    if (cab) add('Kabin (metin)', String(cab))
  }

  return specs
}

function mediaSourceUrl(row) {
  const full =
    row?.media_details?.sizes?.full?.source_url ||
    row?.media_details?.sizes?.large?.source_url ||
    row?.source_url ||
    row?.guid?.rendered
  if (!full) return null
  return full.replace(/-\d+x\d+(?=\.\w+$)/, '')
}

export async function resolveMediaUrls(attachmentIds) {
  const ids = [...new Set(attachmentIds.map(String).filter(Boolean))].slice(0, 40)
  if (!ids.length) return []

  const urls = []
  for (const id of ids) {
    try {
      const row = await fetchJson(`${API}/media/${id}`)
      const full = mediaSourceUrl(row)
      if (full && !urls.includes(full)) urls.push(full)
    } catch {
      /* atlanan medya */
    }
    await sleep(90)
  }
  return urls
}

export function parsePhotoswipeGallery(html) {
  const marker = html.search(/initPhotoswipeDomForJson\s*\(/i)
  if (marker < 0) return []

  const braceStart = html.indexOf('{', marker)
  if (braceStart < 0) return []

  let depth = 0
  let end = braceStart
  for (let i = braceStart; i < html.length; i += 1) {
    const c = html[i]
    if (c === '{') depth += 1
    else if (c === '}') {
      depth -= 1
      if (depth === 0) {
        end = i
        break
      }
    }
  }

  const jsonStr = html.slice(braceStart, end + 1)
  try {
    const obj = JSON.parse(jsonStr)
    return Object.values(obj)
      .map((x) => String(x?.src || '').replace(/\\\//g, '/'))
      .filter(Boolean)
  } catch {
    return [...jsonStr.matchAll(/"src":"(https?:\\\/\\\/[^"]+|https?:\/\/[^"]+)"/g)]
      .map((m) => m[1].replace(/\\\//g, '/'))
      .filter(Boolean)
  }
}

export function parseHtmlFeatureLists(html) {
  const equipment = []
  const specs = {}
  const left = html.match(/fw-property-features-left[\s\S]*?<ul>([\s\S]*?)<\/ul>/i)
  if (left) {
    for (const li of left[1].matchAll(/<li[^>]*>[\s\S]*?<strong>([^<]*)<\/strong>\s*<span>([^<]*)<\/span>/gi)) {
      const k = stripTags(li[1]).replace(/:$/, '')
      const v = stripTags(li[2])
      if (k && v) specs[k] = v
    }
  }
  const right = html.match(/fw-property-features-right[\s\S]*?<ul>([\s\S]*?)<\/ul>/i)
  if (right) {
    for (const li of right[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) {
      const t = stripTags(li[1])
      if (t.length > 1) equipment.push(t)
    }
  }
  return { specs, equipment }
}

export function parseYachtRecord(item, taxMaps) {
  const meta = item.property_meta || {}
  const typeIds = item.property_type || []
  const cityIds = item.property_city || []
  const labelIds = item.property_label || []
  const featureIds = item.property_feature || []
  const statusIds = item.property_status || []

  const typeSlugs = typeIds.map((id) => taxMaps.propertyType.get(id)?.slug).filter(Boolean)
  const propertyType = mapPropertyType(typeSlugs)
  const cityNames = cityIds.map((id) => taxMaps.propertyCity.get(id)?.name).filter(Boolean)
  const labelNames = labelIds.map((id) => taxMaps.propertyLabel.get(id)?.name).filter(Boolean)
  const statusNames = statusIds.map((id) => taxMaps.propertyStatus.get(id)?.name).filter(Boolean)
  const amenities = featureIds
    .map((id) => taxMaps.propertyFeature.get(id)?.name)
    .filter(Boolean)

  const title = decodeHtml(item.title?.rendered || '')
  const contentHtml = item.content?.rendered || ''
  const plainDescription = htmlToPlain(contentHtml)

  const cabinCount = metaInt(meta, 'fave_property_bedrooms')
  const pax = metaInt(meta, 'fave_property_garage')
  const lengthM = metaInt(meta, 'fave_property_size')
  let bathroomCount = sanitizeBathCount(
    parseBathroomCount(plainDescription, cabinCount, { propertyType }),
    cabinCount,
    pax,
  )
  if (
    !bathroomCount &&
    cabinCount &&
    isEnsuiteDefaultPropertyType(propertyType)
  ) {
    bathroomCount = sanitizeBathCount(cabinCount, cabinCount, pax)
  }

  const monthlyRates = parseSeasonalRates(meta)
  const postfix = String(metaVal(meta, 'fave_property_price_postfix'))
  const pricePeriod = postfix === '0' ? 'weekly' : 'daily'
  const headlinePrice = parseMoney(metaVal(meta, 'fave_property_price'))

  const { inclusions, exclusions } = parseInclusionsExclusions(plainDescription)
  const specs = buildSpecs(meta, { labelNames, statusNames, cityNames }, plainDescription)

  const attachmentIds = (meta.fave_property_images || metaVal(meta, 'fave_property_images'))
  const imageIds = Array.isArray(attachmentIds)
    ? attachmentIds
    : String(attachmentIds || '')
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean)

  return {
    albatrosId: String(item.id),
    slug: item.slug,
    title,
    sourceUrl: item.link || `${BASE}/yat/${item.slug}/`,
    propertyType,
    typeLabels: typeIds.map((id) => taxMaps.propertyType.get(id)?.name).filter(Boolean),
    pax,
    cabinCount,
    bathroomCount,
    lengthM,
    marina: cityNames[0] || '',
    classLabel: labelNames[0] || '',
    statusLabel: statusNames[0] || '',
    currency: 'EUR',
    headlinePrice,
    pricePeriod,
    monthlyRates,
    plainDescription,
    contentHtml,
    amenities,
    inclusions,
    exclusions,
    specs,
    imageAttachmentIds: imageIds,
    featuredMediaId: item.featured_media || null,
    videoUrl: metaVal(meta, 'fave_video_url') || '',
    isFeatured: metaVal(meta, 'fave_featured') === '1',
  }
}

export async function enrichYachtFromHtml(record) {
  try {
    const html = await fetchText(record.sourceUrl)
    const ps = parsePhotoswipeGallery(html)
    const { specs: htmlSpecs, equipment: htmlEquipment } = parseHtmlFeatureLists(html)

    const mergedSpecs = { ...record.specs, ...htmlSpecs }
    const amenities = [...new Set([...record.amenities, ...htmlEquipment])]

    let galleryUrls = ps.length ? ps : []
    if (!galleryUrls.length && record.imageAttachmentIds.length) {
      galleryUrls = await resolveMediaUrls(record.imageAttachmentIds)
    } else if (record.featuredMediaId) {
      const extra = await resolveMediaUrls([
        ...record.imageAttachmentIds,
        record.featuredMediaId,
      ])
      galleryUrls = [...new Set([...galleryUrls, ...extra])]
    }

    let bathroomCount = record.bathroomCount
    if (!bathroomCount) {
      bathroomCount = sanitizeBathCount(
        parseBathroomCount(record.plainDescription, record.cabinCount, {
          propertyType: record.propertyType,
        }),
        record.cabinCount,
        record.pax,
      )
    }

    return {
      ...record,
      specs: mergedSpecs,
      amenities,
      galleryUrls,
      bathroomCount,
    }
  } catch {
    const galleryUrls = record.imageAttachmentIds.length
      ? await resolveMediaUrls(record.imageAttachmentIds)
      : []
    return { ...record, galleryUrls }
  }
}

/** 790 yat / 100 = 8 sayfa (WP REST). */
const DEFAULT_TOTAL_PAGES = 8

let taxonomyCache = null

async function getTaxonomyMaps() {
  if (!taxonomyCache) taxonomyCache = await loadAllTaxonomies()
  return taxonomyCache
}

export async function fetchYachtRecordById(albatrosId) {
  const id = String(albatrosId || '').trim()
  if (!id) return null
  const taxMaps = await getTaxonomyMaps()
  const item = await fetchJson(`${API}/Yachts/${id}`)
  if (!item?.id) return null
  return parseYachtRecord(item, taxMaps)
}

export async function fetchAllYachtRecords({ maxPages = 0, limit = 0 } = {}) {
  const taxMaps = await getTaxonomyMaps()
  const records = []
  const totalPages = maxPages > 0 ? maxPages : DEFAULT_TOTAL_PAGES

  for (let page = 1; page <= totalPages; page += 1) {
    const url = `${API}/Yachts?per_page=100&page=${page}`
    const rows = await fetchJson(url)
    if (!Array.isArray(rows) || !rows.length) break

    for (const item of rows) {
      records.push(parseYachtRecord(item, taxMaps))
      if (limit > 0 && records.length >= limit) return records
    }
    await sleep(350)
  }

  return records
}

export function buildAlbatrosDescription(record) {
  const lines = []
  lines.push('Konaklama:')
  const cap = []
  if (record.pax) cap.push(`${record.pax} misafir`)
  if (record.cabinCount) cap.push(`${record.cabinCount} kabin`)
  if (record.bathroomCount) cap.push(`${record.bathroomCount} banyo`)
  if (cap.length) lines.push(`- ${cap.join(', ')}`)
  lines.push('')

  if (record.plainDescription) {
    lines.push(record.plainDescription)
    lines.push('')
  }

  if (record.amenities?.length) {
    lines.push('Tekne donanımı:')
    for (const a of record.amenities) lines.push(`- ${a}`)
    lines.push('')
  }

  if (record.inclusions?.length) {
    lines.push('Fiyata dahil:')
    for (const x of record.inclusions) lines.push(`- ${x}`)
    lines.push('')
  }

  if (record.exclusions?.length) {
    lines.push('Fiyata dahil değil:')
    for (const x of record.exclusions) lines.push(`- ${x}`)
    lines.push('')
  }

  if (record.monthlyRates?.length) {
    const unit = record.pricePeriod === 'weekly' ? 'Haftalık' : 'Günlük'
    lines.push(`${unit} charter ücretleri (EUR):`)
    for (const r of record.monthlyRates) {
      lines.push(`- ${r.label}: ${r.amount} ${r.currency}`)
    }
    lines.push('')
  }

  if (Object.keys(record.specs || {}).length) {
    lines.push('Teknik özellikler:')
    for (const [k, v] of Object.entries(record.specs)) {
      if (v) lines.push(`- ${k}: ${v}`)
    }
  }

  return lines.join('\n').trim() || record.title
}
