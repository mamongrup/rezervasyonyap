/**
 * Akdeniz Villam villa detay sayfası → yapılandırılmış paket.
 */

import { formatHolidayHomeTitleTr, slugifyHolidayHomeName } from './villa-title-tr.mjs'

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
    if (!url || /\.webp$/i.test(url)) continue
    const key = url.replace(/\s+/g, ' ').trim().toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(url.trim())
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

function parseDescription(html) {
  const start = html.indexOf('Öne Çıkanlar')
  const end = html.indexOf('Yakındaki Villalar', start)
  if (start < 0) {
    const og = html.match(/meta name="description" content="([^"]+)"/)
    return og?.[1]?.trim() || ''
  }
  const block = stripTags(html.slice(start, end > 0 ? end : start + 15000))
  return block.replace(/^Öne Çıkanlar\s*/u, '').trim()
}

function parsePoolDimensions(html, description = '') {
  const poolSection = html.slice(html.indexOf('Havuz ve Bahçe'), html.indexOf('Havuz ve Bahçe') + 2500)
  const hiddenIdx = html.indexOf('id="S:1"')
  const hiddenChunk = hiddenIdx >= 0 ? html.slice(hiddenIdx, hiddenIdx + 120000) : ''
  const hay = `${description} ${poolSection} ${hiddenChunk}`
  const dims = [...hay.matchAll(/(\d+(?:[.,]\d+)?)\s*m\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*m/gi)].map((m) => ({
    a: Number(String(m[1]).replace(',', '.')),
    b: Number(String(m[2]).replace(',', '.')),
  }))
  const main = dims
    .filter((d) => d.a * d.b >= 8)
    .sort((x, y) => y.a * y.b - x.a * x.b)[0]
  if (!main) return null
  const length = Math.max(main.a, main.b)
  const width = Math.min(main.a, main.b)
  return { length: String(length), width: String(width), depth: '' }
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
  const themes = new Set(['sea_view', 'deniz_manzarali', 'ozel_havuzlu', 'pool'])
  const hay = `${rental?.description || ''} ${htmlText}`.toLowerCase()
  if (/jakuzi/.test(hay)) {
    themes.add('jacuzzi')
    themes.add('jakuzili')
  }
  if (/kalabalık aile|aileler/.test(hay)) {
    themes.add('family')
    themes.add('genis_aile_evi')
  }
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
  const description = parseDescription(html)
  const fees = parseFees(html)
  const poolDims = parsePoolDimensions(html, description)
  const seasonal = parseSeasonalPrices(html)
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

  const propertyType = 'villa'
  const title = formatHolidayHomeTitleTr(rental.name || 'Villa', propertyType)

  return {
    sourceUrl,
    externalRef: String(rental.identifier || product?.sku || slugFromUrl(sourceUrl)),
    slug: slugifyHolidayHomeName(title, propertyType),
    title,
    subtitle: stripTags(html.match(/<h3[^>]*>([^<]*Havuzlu[^<]*)<\/h3>/i)?.[1] || ''),
    description,
    shortDescription: rental.description || '',
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
    vitrinPrice,
    amenities,
    poolDims,
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
      pool_type: poolDims ? `${poolDims.length}x${poolDims.width}m özel havuz` : 'Özel havuz',
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
