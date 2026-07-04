/**
 * Airbnb ilan detayı (pdp_listing_details API) → tatil evi paketi.
 */

import { formatHolidayHomeTitleTr, slugifyHolidayHomeName } from './villa-title-tr.mjs'
import { plainTextToHtmlParagraphs, toSeoListingDescriptionHtml } from './text-to-html.mjs'

const AIRBNB_API_KEY = process.env.AIRBNB_API_KEY || 'd306zoyjsyarp7ifhu67rjxn52tv0t20'

export function parseAirbnbRoomId(input) {
  const s = String(input || '').trim()
  if (!s) return null
  const fromUrl = s.match(/airbnb\.[^/]+\/rooms\/(\d+)/i)
  if (fromUrl) return fromUrl[1]
  if (/^\d+$/.test(s)) return s
  return null
}

export function parseTurkishMoney(raw) {
  const s = String(raw ?? '')
    .replace(/[^\d.,]/g, '')
    .trim()
  if (!s) return null
  if (s.includes(',')) {
    const n = Number(s.replace(/\./g, '').replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }
  const n = Number(s.replace(/\./g, ''))
  return Number.isFinite(n) ? n : null
}

function parseCountLabel(label) {
  const m = String(label || '').match(/(\d+)/)
  return m ? Number(m[1]) : null
}

function cleanAirbnbTitle(raw) {
  let t = String(raw || '')
    .replace(/&/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  t = t.replace(/\s*Fethiye\b.*$/i, '').trim()
  t = t.replace(/\s*Denize\s+S[ıi]f[ıi]r.*$/i, '').trim()
  t = t.replace(/\s*Luxury\s+Seafront.*$/i, '').trim()
  t = t.replace(/\s*L[üu]ks\s+Villa.*$/i, '').trim()
  const villaFirst = t.match(/^villa\s+([A-Za-zÇĞİÖŞÜçğıöşü0-9]+)/i)
  if (villaFirst) return `Villa ${villaFirst[1]}`
  const villaLast = t.match(/^([A-Za-zÇĞİÖŞÜçğıöşü0-9]+)\s+villa$/i)
  if (villaLast) return `Villa ${villaLast[1]}`
  return t || 'Villa'
}

function parseCheckTime(raw, fallback = '16:00') {
  const m = String(raw || '').match(/(\d{1,2})[:.](\d{2})/)
  if (!m) return fallback
  return `${String(m[1]).padStart(2, '0')}:${m[2]}`
}

/**
 * Airbnb `sectioned_description.description` alanı zaten özet + mekân + ulaşım +
 * notlar bölümlerinin tamamını birleştirilmiş biçimde içerir (\n\n ile ayrılmış
 * paragraflar). Diğer alanları (`space`, `access`, `notes`…) ayrıca eklemek
 * aynı metni tekrar tekrar üretir; bu yüzden tek kaynak olarak kullanılır.
 */
function buildDescription(sd = {}, title = '') {
  const raw = String(sd.description || sd.summary || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\r/g, '')
    .trim()
  return toSeoListingDescriptionHtml(plainTextToHtmlParagraphs(raw), { title })
}

function photoUrl(photo) {
  const large = photo?.large || photo?.xx_large || photo?.small || ''
  if (!large) return ''
  return String(large).split('?')[0]
}

function parseDeposit(priceDetails = []) {
  for (const p of priceDetails) {
    if (p?.attribute_type === 'HOST_REQUIRED_SECURITY_DEPOSIT') {
      return parseTurkishMoney(p.value)
    }
  }
  return null
}

function buildThemes(amenities = [], description = '') {
  const themes = new Set(['ozel_havuzlu', 'pool'])
  const hay = `${amenities.join(' ')} ${description}`.toLowerCase()
  if (/deniz|sea|su kenar|waterfront|sıfır|sifir/.test(hay)) {
    themes.add('sea_view')
    themes.add('deniz_manzarali')
  }
  if (/jakuzi|jacuzzi|hot tub/.test(hay)) {
    themes.add('jacuzzi')
    themes.add('jakuzili')
  }
  if (/sonsuzluk|infinity/.test(hay)) themes.add('luxury')
  if (/aile|çocuk|cocuk|family/.test(hay)) {
    themes.add('family')
    themes.add('genis_aile_evi')
  }
  return [...themes]
}

function buildRuleCodes(guestControls = {}) {
  const codes = new Set()
  if (guestControls.allows_pets === false) codes.add('no_pets')
  if (guestControls.allows_children) codes.add('child_friendly')
  if (guestControls.allows_smoking === false) codes.add('no_smoking')
  return [...codes]
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

function buildPools(amenities = []) {
  const pools = {
    open_pool: emptyPoolRow(),
    heated_pool: emptyPoolRow(),
    children_pool: emptyPoolRow(),
  }
  const hay = amenities.join(' ').toLowerCase()
  if (/havuz|pool/.test(hay)) {
    pools.open_pool = {
      enabled: true,
      width: '',
      length: '',
      depth: '',
      description: /sonsuzluk|infinity/i.test(hay) ? 'Özel açık sonsuzluk havuzu' : 'Özel açık havuz',
      heating_fee_per_day: '',
    }
  }
  return pools
}

export async function fetchAirbnbPdp(roomId, { locale = 'tr', currency = 'TRY' } = {}) {
  const id = String(roomId)
  const url =
    `https://www.airbnb.com.tr/api/v2/pdp_listing_details/${id}` +
    `?_format=for_native&_source=mobile&currency=${encodeURIComponent(currency)}` +
    `&locale=${encodeURIComponent(locale)}&key=${encodeURIComponent(AIRBNB_API_KEY)}`

  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'X-Airbnb-API-Key': AIRBNB_API_KEY,
      'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
    },
  })
  if (!res.ok) throw new Error(`Airbnb PDP HTTP ${res.status} room=${id}`)
  const json = await res.json()
  const detail = json?.pdp_listing_detail
  if (!detail?.id) throw new Error(`Airbnb PDP boş yanıt room=${id}`)
  return detail
}

export function parseAirbnbPdp(detail, sourceUrl) {
  const roomId = String(detail.id)
  const sd = detail.sectioned_description || {}
  const amenities = (detail.listing_amenities || [])
    .filter((a) => a?.is_present && a?.name)
    .map((a) => String(a.name).trim())

  const galleryUrls = (detail.photos || []).map(photoUrl).filter(Boolean)
  const bedrooms = parseCountLabel(detail.bedroom_label) || 0
  const bathrooms = parseCountLabel(detail.bathroom_label) || 0
  const beds = parseCountLabel(detail.bed_label) || bedrooms
  const maxGuests =
    detail.guest_controls?.person_capacity || parseCountLabel(detail.guest_label) || 0
  const damageDeposit = parseDeposit(detail.price_details)
  const cleanName = cleanAirbnbTitle(detail.p3_summary_title || sd.name || `Villa ${roomId}`)
  const propertyType = 'villa'
  const title = formatHolidayHomeTitleTr(cleanName, propertyType)
  const description = buildDescription(sd, title)
  const slug = slugifyHolidayHomeName(title, propertyType)
  const checkInTime = parseCheckTime(detail.localized_check_in_time_window, '16:00')
  const checkOutTime = parseCheckTime(detail.localized_check_out_time, '10:00')
  const locationName = detail.location_title || detail.p3_summary_address || detail.city || ''
  const city = detail.city || 'Fethiye'
  const province = /mu[gğ]la/i.test(locationName) ? 'Muğla' : ''
  const pools = buildPools(amenities)
  const themeCodes = buildThemes(amenities, description)
  const ruleCodes = buildRuleCodes(detail.guest_controls || {})
  const poolSizeLabel = pools.open_pool.enabled ? 'Özel havuz' : ''

  return {
    sourceUrl: sourceUrl || `https://www.airbnb.com.tr/rooms/${roomId}`,
    externalRef: roomId,
    slug,
    title,
    description,
    shortDescription: plainTextToHtmlParagraphs(sd.summary || sd.description || ''),
    galleryUrls,
    locationName,
    mapLat: detail.lat != null ? String(detail.lat) : '',
    mapLng: detail.lng != null ? String(detail.lng) : '',
    currency: 'TRY',
    bedrooms,
    bathrooms,
    beds,
    maxGuests,
    minStayNights: Number(detail.min_nights) || 5,
    maxStayNights: Number(detail.max_nights) || null,
    checkInTime,
    checkOutTime,
    damageDeposit,
    cleaningFee: null,
    tourismCertNo: detail.license || '',
    seasonalPrices: [],
    calendarDays: [],
    calendarBookings: [],
    vitrinPrice: null,
    amenities,
    pools,
    poolDims: null,
    poolSizeLabel,
    themeCodes,
    ruleCodes,
    ratingValue: detail.star_rating ?? null,
    ratingCount: null,
    meta: {
      address: locationName,
      lat: detail.lat != null ? String(detail.lat) : '',
      lng: detail.lng != null ? String(detail.lng) : '',
      check_in_time: checkInTime,
      check_out_time: checkOutTime,
      bed_count: String(bedrooms || ''),
      bath_count: String(bathrooms || ''),
      room_count: String(bedrooms || ''),
      max_guests: String(maxGuests || ''),
      property_type: 'villa',
      city,
      province_city: province || city,
      tourism_cert_no: detail.license || '',
      pool_type: pools.open_pool.enabled ? pools.open_pool.description : '',
      damage_deposit: damageDeposit != null ? String(damageDeposit) : '',
      source_url: sourceUrl || `https://www.airbnb.com.tr/rooms/${roomId}`,
      airbnb_room_id: roomId,
    },
  }
}

export async function scrapeAirbnbListing(urlOrId) {
  const roomId = parseAirbnbRoomId(urlOrId)
  if (!roomId) throw new Error(`Geçersiz Airbnb URL/id: ${urlOrId}`)
  const sourceUrl = String(urlOrId).startsWith('http')
    ? String(urlOrId).split('?')[0]
    : `https://www.airbnb.com.tr/rooms/${roomId}`
  const detail = await fetchAirbnbPdp(roomId)
  return parseAirbnbPdp(detail, sourceUrl)
}
