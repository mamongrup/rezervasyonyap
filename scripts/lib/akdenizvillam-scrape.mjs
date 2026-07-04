/**
 * Akdeniz Villam villa detay sayfası → yapılandırılmış paket.
 */

import { formatHolidayHomeTitleTr, slugifyHolidayHomeName } from './villa-title-tr.mjs'
import { buildCalendarDays, parseAvailabilityBookings } from './akdenizvillam-calendar.mjs'
import { plainTextToHtmlParagraphs, toSeoListingDescriptionHtml } from './text-to-html.mjs'

const MONTHS = {
  oca: 1,
  şub: 2,
  sub: 2,
  mar: 3,
  nis: 4,
  may: 5,
  haz: 6,
  tem: 7,
  ağu: 8,
  agu: 8,
  eyl: 9,
  eki: 10,
  kas: 11,
  ara: 12,
}

export function parseTurkishMoney(raw) {
  const s = String(raw ?? '').trim()
  if (!s) return null
  if (s.includes(',')) {
    const n = Number(s.replace(/\./g, '').replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }
  const n = Number(s.replace(/\./g, ''))
  return Number.isFinite(n) ? n : null
}

export function parseTrDateLabel(label) {
  const m = String(label || '')
    .trim()
    .match(/^(\d{1,2})\s+([A-Za-zÇĞİÖŞÜçğıöşü]+)\s+(\d{4})$/u)
  if (!m) return null
  const day = Number(m[1])
  const monKey = m[2].slice(0, 3).toLowerCase().replace('ğ', 'g').replace('ü', 'u').replace('ı', 'i')
  const month = MONTHS[monKey]
  const year = Number(m[3])
  if (!month || !day || !year) return null
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function stripTags(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseJsonLd(html) {
  const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
  if (!m) return null
  const data = JSON.parse(m[1])
  const graph = data['@graph'] || [data]
  const rental = graph.find((n) => n['@type'] === 'VacationRental') || null
  const product = graph.find((n) => n['@type'] === 'Product') || null
  return { rental, product, graph }
}

function uniqueImages(rental) {
  const seen = new Set()
  const out = []
  for (const img of rental?.image || []) {
    const url = typeof img === 'string' ? img : img?.url
    if (!url || /\/poster\//i.test(url)) continue
    if (!/\/slider\//i.test(url)) continue

    const trimmed = url.replace(/\s+/g, ' ').trim()
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(trimmed)
  }
  return out
}

function parseSeasonalPrices(html) {
  const idx = html.indexOf('id="S:1"')
  if (idx < 0) return []
  const chunk = html.slice(idx, idx + 200000)
  const rows = chunk.split('bg-[#ddeefe]').slice(1)
  const bands = []
  for (const row of rows) {
    const period = row.match(
      /(\d{1,2}\s+[A-Za-zÇĞİÖŞÜçğıöşü]+\s+\d{4})\s*-\s*(\d{1,2}\s+[A-Za-zÇĞİÖŞÜçğıöşü]+\s+\d{4})/u,
    )
    const nightly = row.match(
      /₺<!-- -->([\d.,]+)<span class="text-xs ms-1">\/<\/span> <span class="text-xs">gece/u,
    )
    const weekly = row.match(
      /₺<!-- -->([\d.,]+)<span class="text-xs ms-1">\/<\/span> <span class="text-xs">hafta/u,
    )
    if (!period || !nightly) continue
    const from = parseTrDateLabel(period[1])
    const to = parseTrDateLabel(period[2])
    const baseNightly = parseTurkishMoney(nightly[1])
    const weeklyTotal = weekly ? parseTurkishMoney(weekly[1]) : null
    if (!from || !to || !baseNightly) continue
    bands.push({ from, to, baseNightly, weeklyTotal })
  }
  return bands
}

/** İçindeki <div>'leri bracket-eşleştirerek verilen konumdan başlayan div'in kapanışını bulur. */
function findMatchingDivEnd(html, wrapStart) {
  let depth = 0
  let i = wrapStart
  while (i < html.length) {
    const openIdx = html.indexOf('<div', i)
    const closeIdx = html.indexOf('</div>', i)
    if (closeIdx === -1) return -1
    if (openIdx !== -1 && openIdx < closeIdx) {
      depth++
      i = openIdx + 4
    } else {
      depth--
      i = closeIdx + 6
      if (depth === 0) return i
    }
  }
  return -1
}

/**
 * Kaynak sayfadaki `<div class="rich-text-content ...">…</div>` bloğu zaten
 * <p>/<strong> etiketleriyle biçimlendirilmiştir; paragraf yapısını korumak
 * için doğrudan bu iç HTML'i alırız (düz metne çevirip boşlukları ezmeyiz).
 */
function extractRichTextContentHtml(html) {
  const marker = 'rich-text-content'
  const markerIdx = html.indexOf(marker)
  if (markerIdx < 0) return ''
  const wrapStart = html.lastIndexOf('<div', markerIdx)
  if (wrapStart < 0) return ''
  const wrapEnd = findMatchingDivEnd(html, wrapStart)
  if (wrapEnd < 0) return ''
  const openTagEnd = html.indexOf('>', markerIdx)
  if (openTagEnd < 0 || openTagEnd >= wrapEnd) return ''
  const inner = html.slice(openTagEnd + 1, wrapEnd - '</div>'.length)
  return inner.trim()
}

function parseDescription(html, title = '', subtitle = '') {
  const opts = { title, subtitle }
  const rich = extractRichTextContentHtml(html)
  if (rich) return toSeoListingDescriptionHtml(rich, opts)

  const start = html.indexOf('Öne Çıkanlar')
  const end = html.indexOf('Yakındaki Villalar', start)
  if (start < 0) {
    const og = html.match(/meta name="description" content="([^"]+)"/)
    return toSeoListingDescriptionHtml(plainTextToHtmlParagraphs(og?.[1]?.trim() || ''), opts)
  }
  const block = stripTags(html.slice(start, end > 0 ? end : start + 15000))
  return toSeoListingDescriptionHtml(
    plainTextToHtmlParagraphs(block.replace(/^Öne Çıkanlar\s*/u, '').trim()),
    opts,
  )
}

function parsePoolMetric(raw) {
  const s = String(raw ?? '')
    .trim()
    .replace(',', '.')
  const m = s.match(/(\d+(?:\.\d+)?)\s*(m|cm|mt|metre)?/i)
  if (!m) return ''
  let n = Number(m[1])
  if (!Number.isFinite(n)) return ''
  const unit = (m[2] || '').toLowerCase()
  if (unit === 'cm') {
    // Kaynak sitede derinlik bazen "1.60 cm" yazılıyor (metre kastediliyor)
    if (n <= 3) return String(n)
    return String(n / 100)
  }
  return String(n)
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

function mapPoolType(name) {
  const n = String(name || '').toLowerCase()
  if (/çocuk|sığ/.test(n)) return 'children_pool'
  if (/ısıtmalı|isitmali|kapalı|iç/.test(n)) return 'heated_pool'
  return 'open_pool'
}

function poolRowFromEntry({ name, depthRaw, dimA, dimB }) {
  const a = Number(parsePoolMetric(dimA))
  const b = Number(parsePoolMetric(dimB))
  if (!a || !b) return null
  const depth = parsePoolMetric(depthRaw)
  return {
    enabled: true,
    length: String(Math.max(a, b)),
    width: String(Math.min(a, b)),
    depth,
    description: String(name || '').trim() || 'Özel havuz',
    heating_fee_per_day: '',
  }
}

function parsePoolSidebar(html) {
  const start = html.indexOf('Havuzlar')
  if (start < 0) return []
  let end = html.length
  for (const marker of ['Henüz Yorum Yok', 'Yorum Yap', 'Rezervasyon Talebi']) {
    const i = html.indexOf(marker, start)
    if (i >= 0 && i < end) end = i
  }
  const text = html
    .slice(start, end)
    .replace(/<!-- -->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const pools = []
  for (const m of text.matchAll(
    /\d+\s*\.\s*Havuz\s+(Açık|Isıtmalı|Kapalı|Çocuk|Özel(?:\s+Havuzlu?)?|Sığ|İç)\s+([\d.,]+\s*(?:cm|m)?)\s+([\d.,]+\s*m)\s+([\d.,]+\s*m)/gi,
  )) {
    pools.push({ name: m[1], depthRaw: m[2], dimA: m[3], dimB: m[4] })
  }
  return pools
}

function parsePoolroomJson(html) {
  const start = html.indexOf('Havuzlar')
  const end = html.indexOf('Henüz Yorum Yok', start > 0 ? start : 0)
  const chunk =
    start >= 0 && end > start ? html.slice(start, end) : html.slice(0, 250000)

  const pools = []
  const seen = new Set()
  for (const m of chunk.matchAll(
    /\\"name\\":\\"([^\\"]+)\\"[^}]*?\\"size\\":\\"([^\\"]*)\\"[^}]*?\\"width\\":\\"([^\\"]*)\\"[^}]*?\\"height\\":\\"([^\\"]*)\\"/g,
  )) {
    const key = `${m[1]}|${m[2]}|${m[3]}|${m[4]}`
    if (seen.has(key)) continue
    seen.add(key)
    pools.push({ name: m[1], depthRaw: m[2], dimA: m[3], dimB: m[4] })
  }
  return pools
}

function parsePoolInfo(html, description = '') {
  const pools = {
    open_pool: emptyPoolRow(),
    heated_pool: emptyPoolRow(),
    children_pool: emptyPoolRow(),
  }

  const entries = parsePoolSidebar(html)
  const source = entries.length ? entries : parsePoolroomJson(html)

  for (const entry of source) {
    const row = poolRowFromEntry(entry)
    if (!row) continue
    const key = mapPoolType(entry.name)
    pools[key] = { ...pools[key], ...row, enabled: true }
  }

  // Açıklama metnindeki ek havuz satırları (çocuk/sığ/iç)
  const hay = description.replace(/\s+/g, ' ')
  for (const m of hay.matchAll(
    /(Çocuk havuzu|Sığ havuz|İç havuz)[^;|]{0,40}?\s*(\d+(?:[.,]\d+)?)\s*m\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*m[^|]{0,60}?derinlik\s+([\d.,]+\s*(?:cm|m)?)/gi,
  )) {
    const row = poolRowFromEntry({
      name: m[1],
      dimA: `${m[2]} m`,
      dimB: `${m[3]} m`,
      depthRaw: m[4],
    })
    if (!row) continue
    const key = mapPoolType(m[1])
    if (!pools[key].enabled) pools[key] = { ...pools[key], ...row, enabled: true }
  }

  const primary = pools.open_pool.enabled
    ? pools.open_pool
    : pools.heated_pool.enabled
      ? pools.heated_pool
      : pools.children_pool.enabled
        ? pools.children_pool
        : null

  const poolDims = primary
    ? { length: primary.length, width: primary.width, depth: primary.depth }
    : null

  const poolSizeLabel = primary
    ? [primary.length, primary.width, primary.depth].filter(Boolean).join('×')
    : ''

  return { pools, poolDims, poolSizeLabel }
}

function parsePoolDimensions(html, description = '') {
  return parsePoolInfo(html, description).poolDims
}

function parseFees(html) {
  const dep =
    html.match(/Hasar Depozitosu\s*:\s*<!-- -->\s*₺<!-- -->([\d.,]+)/i) ||
    html.match(/Hasar Depozitosu[^₺]*₺<!-- -->([\d.,]+)/i)
  const clean = html.match(/Temizlik Ücreti\s*:\s*<!-- -->\s*₺<!-- -->([\d.,]+)/i)
  return {
    damageDeposit: dep ? parseTurkishMoney(dep[1]) : null,
    cleaningFee: clean ? parseTurkishMoney(clean[1]) : null,
  }
}

function parseLicense(html) {
  const m = html.match(/İzin Belge No:\s*<span[^>]*>([^<]+)</i)
  return m?.[1]?.trim() || ''
}

function parseMinStay(html) {
  const m = html.match(/Minimum Kiralama Süresi[\s\S]{0,120}?(\d+)\s*Gece/i)
  return m ? Number(m[1]) : 5
}

function buildThemes(rental, htmlText) {
  // Yalnızca kanonik kodlar (sea_view / pool / jacuzzi / family) — alias yok
  const themes = new Set(['sea_view', 'pool'])
  const hay = `${rental?.description || ''} ${htmlText}`.toLowerCase()
  if (/jakuzi/.test(hay)) themes.add('jacuzzi')
  if (/kalabalık aile|aileler/.test(hay)) themes.add('family')
  if (/sauna/.test(hay)) themes.add('luxury')
  return [...themes]
}

function buildRuleCodes(rental, htmlText) {
  const codes = new Set(['no_pets'])
  const hay = `${htmlText} ${(rental?.containsPlace?.amenityFeature || []).map((a) => a.name).join(' ')}`.toLowerCase()
  if (/çocuk/.test(hay)) codes.add('child_friendly')
  return [...codes]
}

function slugFromUrl(url) {
  try {
    const p = new URL(url).pathname.split('/').filter(Boolean)
    return p[p.length - 1] || 'villa'
  } catch {
    return 'villa'
  }
}

export async function fetchAkdenizvillamHtml(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'TravelAkdenizvillamImport/1.0',
      Accept: 'text/html,application/xhtml+xml',
    },
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`)
  return res.text()
}

export function parseAkdenizvillamVillaPage(html, sourceUrl) {
  const { rental, product } = parseJsonLd(html)
  if (!rental) throw new Error('JSON-LD VacationRental bulunamadı')

  const acc = rental.containsPlace || {}
  const propertyType = 'villa'
  const title = formatHolidayHomeTitleTr(
    (rental.name || product?.name || 'Villa').replace(/\s*\|.*$/, '').trim(),
    propertyType,
  )
  const subtitle = stripTags(html.match(/<h3[^>]*>([^<]*Havuzlu[^<]*)<\/h3>/i)?.[1] || '')
  const description = parseDescription(html, title, subtitle)
  const fees = parseFees(html)
  const poolInfo = parsePoolInfo(html, description)
  const { pools, poolDims, poolSizeLabel } = poolInfo
  const seasonal = parseSeasonalPrices(html)
  const calendarBookings = parseAvailabilityBookings(html)
  const calendarDays = buildCalendarDays(seasonal, calendarBookings)
  const amenities = (acc.amenityFeature || [])
    .filter((a) => a?.name && a.value !== false)
    .map((a) => String(a.name).trim())

  const lat = rental.geo?.latitude
  const lng = rental.geo?.longitude
  const lowPrice = parseTurkishMoney(product?.offers?.lowPrice || rental.priceRange?.split(' ')?.[0])
  const vitrinPrice =
    seasonal.length > 0
      ? Math.min(...seasonal.map((b) => b.baseNightly))
      : lowPrice

  return {
    sourceUrl,
    externalRef: String(rental.identifier || product?.sku || slugFromUrl(sourceUrl)),
    slug: slugifyHolidayHomeName(title, propertyType),
    title,
    subtitle,
    description,
    shortDescription: plainTextToHtmlParagraphs(rental.description || ''),
    galleryUrls: uniqueImages(rental),
    locationName: 'Kalkan, Kışla, Antalya',
    mapLat: lat != null ? String(lat) : '',
    mapLng: lng != null ? String(lng) : '',
    currency: product?.offers?.priceCurrency || 'TRY',
    bedrooms: acc.numberOfBedrooms ?? 3,
    bathrooms: acc.numberOfBathroomsTotal ?? 3,
    maxGuests: acc.occupancy?.value ?? 6,
    squareMeters: acc.floorSize?.value ?? 250,
    minStayNights: parseMinStay(html),
    checkInTime: (rental.checkinTime || '16:00:00').slice(0, 5),
    checkOutTime: (rental.checkoutTime || '10:00:00').slice(0, 5),
    damageDeposit: fees.damageDeposit,
    cleaningFee: fees.cleaningFee,
    tourismCertNo: parseLicense(html),
    phone: (html.match(/0\d{3}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}/) || [])[0] || '',
    seasonalPrices: seasonal,
    calendarBookings,
    calendarDays,
    vitrinPrice,
    amenities,
    pools,
    poolDims,
    poolSizeLabel,
    themeCodes: buildThemes(rental, description),
    ruleCodes: buildRuleCodes(rental, description),
    meta: {
      address: 'Kalkan Kışla, Antalya',
      lat: lat != null ? String(lat) : '',
      lng: lng != null ? String(lng) : '',
      check_in_time: (rental.checkinTime || '16:00:00').slice(0, 5),
      check_out_time: (rental.checkoutTime || '10:00:00').slice(0, 5),
      bed_count: String(acc.numberOfBedrooms ?? 3),
      bath_count: String(acc.numberOfBathroomsTotal ?? 3),
      room_count: String(acc.numberOfBedrooms ?? 3),
      max_guests: String(acc.occupancy?.value ?? 6),
      square_meters: String(acc.floorSize?.value ?? 250),
      square_m2: String(acc.floorSize?.value ?? 250),
      property_type: 'villa',
      district_label: 'Kışla',
      city: 'Kaş',
      province_city: 'Antalya',
      tourism_cert_no: parseLicense(html),
      pool_type: poolDims
        ? `${poolDims.length}x${poolDims.width}m özel havuz${poolDims.depth ? ` (${poolDims.depth}m derinlik)` : ''}`
        : 'Özel havuz',
      pool_length: poolDims?.length || '',
      pool_width: poolDims?.width || '',
      pool_depth: poolDims?.depth || '',
      damage_deposit: fees.damageDeposit != null ? String(fees.damageDeposit) : '',
      short_stay_fee: fees.cleaningFee != null ? String(fees.cleaningFee) : '',
      source_url: sourceUrl,
    },
  }
}

export async function scrapeAkdenizvillamVilla(url) {
  const html = await fetchAkdenizvillamHtml(url)
  return parseAkdenizvillamVillaPage(html, url)
}
