/**
 * Tatilsepeti.com — otel listesi + detay HTML + oda fiyat API.
 * Resmi API yok; site içi uçlar ve SSR HTML kullanılır.
 */
const ORIGIN = 'https://www.tatilsepeti.com'
const UA =
  process.env.TATILSEPETI_UA ||
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 TravelImport/1.0'

const DEFAULT_LIST_PATHS = ['yurtici-oteller']

export function decodeHtml(s) {
  return String(s || '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim()
}

function stripTags(html) {
  return decodeHtml(
    String(html || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  )
}

function slugFromHref(href) {
  const m = String(href || '').match(/^\/([^?#]+)/)
  return m ? m[1] : String(href || '').replace(/^https?:\/\/[^/]+/i, '').replace(/^\//, '')
}

function parseMoneyTr(text) {
  const m = String(text || '').match(/([\d.]+)/)
  if (!m) return null
  const n = Number(m[1].replace(/\./g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

/** @param {Headers} headers */
function collectCookies(headers) {
  const parts = []
  if (typeof headers.getSetCookie === 'function') {
    for (const c of headers.getSetCookie()) parts.push(c.split(';')[0])
  } else {
    const raw = headers.get('set-cookie')
    if (raw) for (const c of raw.split(/,(?=[^;]+?=)/)) parts.push(c.split(';')[0].trim())
  }
  return [...new Set(parts.filter(Boolean))].join('; ')
}

export class TatilsepetiSession {
  constructor() {
    this.cookies = ''
  }

  async fetch(url, opts = {}) {
    const headers = {
      'User-Agent': UA,
      Accept: opts.accept || 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
      Cookie: this.cookies,
      ...(opts.headers || {}),
    }
    const r = await fetch(url, { ...opts, headers })
    const next = collectCookies(r.headers)
    if (next) {
      const merged = new Set([...this.cookies.split('; ').filter(Boolean), ...next.split('; ')])
      this.cookies = [...merged].join('; ')
    }
    return r
  }
}

export function parseListPageHotels(html, pageUrl) {
  const hotels = []
  const articleRe = /<article\b([^>]*)>([\s\S]*?)<\/article>/gi
  let m
  while ((m = articleRe.exec(html))) {
    const attrs = m[1]
    const block = m[2]
    const idM = attrs.match(/data-hotelid="(\d+)"/i) || block.match(/data-hotelid="(\d+)"/i)
    if (!idM) continue
    const nameM = attrs.match(/data-hotelname="([^"]+)"/i) || block.match(/data-hotelname="([^"]+)"/i)
    const hrefM = block.match(/panel-heading[\s\S]*?<a[^>]+href="([^"]+)"/i)
    const href = hrefM ? hrefM[1] : ''
    const slug = slugFromHref(href)
    hotels.push({
      hotelId: idM[1],
      name: decodeHtml(nameM?.[1] || ''),
      slug,
      url: href.startsWith('http') ? href : `${ORIGIN}/${slug}`,
      theme: decodeHtml(attrs.match(/data-theme="([^"]*)"/i)?.[1] || ''),
      guestScore: attrs.match(/data-point="([^"]*)"/i)?.[1] || null,
      reviewCount: attrs.match(/data-reviewcount="([^"]*)"/i)?.[1] || null,
      region: decodeHtml(attrs.match(/data-country="([^"]*)"/i)?.[1] || ''),
      areaId: attrs.match(/data-areaid="([^"]*)"/i)?.[1] || null,
      pageUrl,
    })
  }
  return hotels
}

export function parseListTotalPages(html) {
  const last = html.match(/PagedList-skipToLast"><a href="[^"]*sayfa=(\d+)/i)
  if (last) return Number(last[1])
  const nums = (html.match(/sayfa=(\d+)/gi) || []).map((x) => Number(x.replace(/\D/g, '')))
  return nums.length ? Math.max(...nums) : 1
}

export function parseListTotalHotels(html) {
  const m = html.match(/id="totalHotelCount"[^>]*>\s*<strong>(\d+)/i)
    || html.match(/id="hotelTotalCount"[^>]*value=\s*(\d+)/i)
  return m ? Number(m[1]) : null
}

export async function fetchHotelListCatalog(session, listPaths = DEFAULT_LIST_PATHS, log = () => {}) {
  const all = []
  for (const path of listPaths) {
    const base = `${ORIGIN}/${path.replace(/^\/+/, '')}`
    const first = await session.fetch(base)
    if (!first.ok) throw new Error(`Liste HTTP ${first.status} ${base}`)
    const firstHtml = await first.text()
    const totalPages = parseListTotalPages(firstHtml)
    const totalHotels = parseListTotalHotels(firstHtml)
    all.push(...parseListPageHotels(firstHtml, base))
    log(`[katalog] ${path} sayfa 1/${totalPages} (toplam ~${totalHotels ?? '?'})`)
    for (let p = 2; p <= totalPages; p++) {
      await sleep(Number(process.env.TATILSEPETI_PAGE_DELAY_MS || 400))
      const url = `${base}${base.includes('?') ? '&' : '?'}sayfa=${p}`
      const r = await session.fetch(url)
      if (!r.ok) throw new Error(`Liste HTTP ${r.status} ${url}`)
      const html = await r.text()
      all.push(...parseListPageHotels(html, url))
      if (p % 10 === 0 || p === totalPages) log(`[katalog] ${path} sayfa ${p}/${totalPages}`)
    }
  }
  const byId = new Map()
  for (const h of all) {
    if (!byId.has(h.hotelId)) byId.set(h.hotelId, h)
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'tr'))
}

function parseJsonLd(html) {
  const m = html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)<\/script>/i)
  if (!m) return null
  try {
    return JSON.parse(m[1])
  } catch {
    return null
  }
}

function parseHiddenFields(html) {
  const pick = (id) => decodeHtml(html.match(new RegExp(`id="${id}"[^>]*value="([^"]*)"`, 'i'))?.[1] || '')
  return {
    hotelId: pick('hidHotelId') || html.match(/CTX\.hotelId\s*=\s*(\d+)/)?.[1] || null,
    hotelName: pick('hidHotelName'),
    cityCode: pick('hidCityCode'),
    pensionType: html.match(/var ttl_pension_type\s*=\s*"([^"]*)"/)?.[1] || '',
    guestScore: html.match(/var ttl_guest_point\s*=\s*"([^"]*)"/)?.[1] || '',
    theme: html.match(/var ttl_theme\s*=\s*"([^"]*)"/)?.[1] || '',
  }
}

function parseGalleryImages(html) {
  const urls = []
  const re = /(?:src|data-src)="(https:\/\/cdn\.tatilsepeti\.com\/Files\/Images\/Tesis\/[^"]+)"/gi
  let m
  while ((m = re.exec(html))) {
    const u = m[1].replace(/&amp;/g, '&')
    if (!urls.includes(u)) urls.push(u)
  }
  return urls
}

function parseDescription(html) {
  const m = html.match(/class="ts-card descriptions"[^>]*>([\s\S]*?)<\/div>/i)
  return m ? stripTags(m[1]) : ''
}

function parseLocationTable(html) {
  const rows = []
  const tableM = html.match(/class="table table-bordered ts-card"[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/i)
  if (!tableM) return rows
  const trRe = /<tr>([\s\S]*?)<\/tr>/gi
  let tr
  while ((tr = trRe.exec(tableM[1]))) {
    const cells = [...tr[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => stripTags(c[1]))
    for (let i = 0; i + 1 < cells.length; i += 2) {
      if (cells[i]) rows.push({ label: cells[i].replace(/:$/, ''), value: cells[i + 1] })
    }
  }
  return rows
}

function parseFeatureLists(html) {
  const features = []
  const sections = [
    { key: 'hotel_features', title: 'Otel Özellikleri' },
    { key: 'free_activities', title: 'Ücretsiz Aktiviteler' },
    { key: 'paid_activities', title: 'Ücretli Aktiviteler' },
  ]
  for (const sec of sections) {
    const re = new RegExp(
      `<h[23][^>]*>${sec.title}<[\\s\\S]*?<ul>([\\s\\S]*?)<\\/ul>`,
      'i',
    )
    const m = html.match(re)
    if (!m) continue
    const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi
    let li
    while ((li = liRe.exec(m[1]))) {
      const text = stripTags(li[1].replace(/<i[^>]*>[\s\S]*?<\/i>/gi, ''))
      if (text) features.push({ group: sec.key, name: text })
    }
  }
  const schema = parseJsonLd(html)
  if (schema?.amenityFeature) {
    for (const a of schema.amenityFeature) {
      if (a?.name && String(a.value).toLowerCase() === 'true') {
        features.push({ group: 'schema_amenity', name: String(a.name) })
      }
    }
  }
  const seen = new Set()
  return features.filter((f) => {
    const k = f.name.toLowerCase()
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

function parseRoomCards(html, hotelId) {
  const rooms = []
  const idRe = new RegExp(
    `getRoom(?:Images|Availability|AllPrice)\\(\\s*${hotelId}\\s*,\\s*(\\d+)`,
    'gi',
  )
  const roomTypeIds = [...new Set([...html.matchAll(idRe)].map((m) => m[1]))]

  for (const roomTypeId of roomTypeIds) {
    const cardRe = new RegExp(
      `getRoom(?:Images|Availability|AllPrice)\\(\\s*${hotelId}\\s*,\\s*${roomTypeId}[\\s\\S]{0,4000}?<h3[^>]*>([\\s\\S]*?)<\\/h3>`,
      'i',
    )
    const modalRe = new RegExp(
      `id="roomFeaturesModal_${roomTypeId}"[\\s\\S]*?<h4 class="modal-title">([\\s\\S]*?)<\\/h4>`,
      'i',
    )
    const blockRe = new RegExp(
      `getRoom(?:Images|Availability|AllPrice)\\(\\s*${hotelId}\\s*,\\s*${roomTypeId}[\\s\\S]{0,6000}`,
      'i',
    )
    const block = blockRe.exec(html)?.[0] || ''
    const name = stripTags(cardRe.exec(html)?.[1] || modalRe.exec(html)?.[1] || '')
    const boardType = stripTags(
      block.match(/room-detail-info-upper__all-inclusive[^>]*>([\s\S]*?)<\/span>/i)?.[1] || '',
    )
    const capacity = stripTags(
      block.match(/hotel-detail-cards__content-div__description[\s\S]*?<span>([\s\S]*?)<\/span>/i)?.[1] ||
        '',
    )
    const image = block.match(
      /data-src="(https:\/\/cdn\.tatilsepeti\.com\/Files\/Images\/TesisOda\/[^"]+)"/i,
    )?.[1]
    const roomFeatures = [
      ...block.matchAll(
        /hotel-detail-cards__content-div__hotel-features[\s\S]*?<span>([\s\S]*?)<\/span>/gi,
      ),
    ]
      .map((x) => stripTags(x[1]))
      .filter(Boolean)
    const modalM = html.match(
      new RegExp(
        `id="roomFeaturesModal_${roomTypeId}"[\\s\\S]*?<div class="room-properties">([\\s\\S]*?)<\\/div>`,
        'i',
      ),
    )
    const modalFeatures = []
    if (modalM) {
      for (const li of modalM[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) {
        const t = stripTags(li[1])
        if (t) modalFeatures.push(t)
      }
    }
    rooms.push({
      roomTypeId,
      name: name || `Oda ${roomTypeId}`,
      boardType,
      capacityText: capacity,
      image: image || null,
      features: [...new Set([...roomFeatures, ...modalFeatures])],
    })
  }
  return rooms
}

export function parseRoomAllPriceHtml(htmlJson) {
  let html = htmlJson
  if (typeof htmlJson === 'string' && htmlJson.startsWith('"')) {
    try {
      html = JSON.parse(htmlJson)
    } catch {
      html = htmlJson
    }
  }
  const rows = []
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  let tr
  let headerSkipped = false
  while ((tr = trRe.exec(String(html)))) {
    const cells = [...tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) => stripTags(c[1]))
    if (!cells.length) continue
    if (!headerSkipped && /başlangıç|fiyat tipi/i.test(cells[0])) {
      headerSkipped = true
      continue
    }
    if (cells.length < 3) continue
    const [dateRange, priceType, doublePrice, singlePrice, extraBed, childPrice] = cells
    rows.push({
      dateRange,
      priceType,
      doublePerPerson: parseMoneyTr(doublePrice),
      singlePrice: parseMoneyTr(singlePrice),
      extraBed: parseMoneyTr(extraBed),
      childPrice: parseMoneyTr(childPrice),
      raw: { doublePrice, singlePrice },
    })
  }
  return rows
}

export async function fetchRoomAllPrices(session, hotelId, roomTypeId) {
  const url = `${ORIGIN}/Hotel/GetRoomAllPrice/?hotelId=${hotelId}&roomTypeId=${roomTypeId}`
  const r = await session.fetch(url, {
    accept: 'application/json, text/javascript, */*; q=0.01',
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      Referer: `${ORIGIN}/`,
    },
  })
  if (!r.ok) return { ok: false, status: r.status, rows: [], error: `HTTP ${r.status}` }
  const text = await r.text()
  try {
    const rows = parseRoomAllPriceHtml(text)
    return { ok: true, rows }
  } catch (e) {
    return { ok: false, rows: [], error: e.message }
  }
}

export async function fetchHotelDetailPackage(session, listRow, opts = {}) {
  const { fetchRoomPrices = true, log = () => {} } = opts
  const url = listRow.url || `${ORIGIN}/${listRow.slug}`
  const r = await session.fetch(url)
  if (!r.ok) throw new Error(`Detay HTTP ${r.status} ${url}`)
  const html = await r.text()
  const hidden = parseHiddenFields(html)
  const hotelId = String(hidden.hotelId || listRow.hotelId)
  const jsonLd = parseJsonLd(html)
  const regionM = html.match(/class="hotel__region"[^>]*>[\s\S]*?<i[^>]*><\/i>\s*([^<]+)/i)
  const region = stripTags(regionM?.[1] || listRow.region || '')
  const description = parseDescription(html) || stripTags(jsonLd?.description || '')
  const gallery = parseGalleryImages(html)
  const locationRows = parseLocationTable(html)
  const features = parseFeatureLists(html)
  const rooms = parseRoomCards(html, hotelId)

  if (fetchRoomPrices && rooms.length) {
    for (const room of rooms) {
      await sleep(Number(process.env.TATILSEPETI_ROOM_PRICE_DELAY_MS || 250))
      const priceResult = await fetchRoomAllPrices(session, hotelId, room.roomTypeId)
      room.seasonalPrices = priceResult.rows
      room.priceFetchOk = priceResult.ok
      if (!priceResult.ok) room.priceFetchError = priceResult.error
      if (!priceResult.ok) log(`[uyarı] fiyat ${hotelId}/${room.roomTypeId}: ${priceResult.error}`)
    }
  }

  const minPrice = (() => {
    let min = null
    for (const room of rooms) {
      for (const row of room.seasonalPrices || []) {
        for (const p of [row.doublePerPerson, row.singlePrice]) {
          if (p != null && (min == null || p < min)) min = p
        }
      }
    }
    return min
  })()

  return {
    hotelId,
    slug: listRow.slug,
    url,
    name: hidden.hotelName || listRow.name || jsonLd?.name || `Otel ${hotelId}`,
    region: region || listRow.region,
    theme: hidden.theme || listRow.theme,
    guestScore: hidden.guestScore || listRow.guestScore,
    reviewCount: listRow.reviewCount || jsonLd?.aggregateRating?.[0]?.reviewCount || null,
    pensionType: hidden.pensionType,
    checkInTime: jsonLd?.checkinTime || null,
    checkOutTime: jsonLd?.checkoutTime || null,
    description,
    gallery,
    locationRows,
    features,
    rooms,
    minNightlyPrice: minPrice,
    listMeta: listRow,
    fetchedAt: new Date().toISOString(),
  }
}

/** Aktarım tamlık skoru (0–100) */
export function scoreHotelPackage(pkg) {
  const checks = [
    { id: 'name', ok: Boolean(pkg.name), w: 5 },
    { id: 'description', ok: Boolean(pkg.description && pkg.description.length > 80), w: 10 },
    { id: 'gallery', ok: (pkg.gallery?.length || 0) >= 2, w: 15 },
    { id: 'features', ok: (pkg.features?.length || 0) >= 5, w: 10 },
    { id: 'rooms', ok: (pkg.rooms?.length || 0) >= 1, w: 15 },
    { id: 'room_prices', ok: pkg.rooms?.some((r) => (r.seasonalPrices?.length || 0) > 0), w: 20 },
    { id: 'region', ok: Boolean(pkg.region), w: 5 },
    { id: 'location', ok: (pkg.locationRows?.length || 0) >= 2, w: 10 },
    { id: 'min_price', ok: pkg.minNightlyPrice != null && pkg.minNightlyPrice > 0, w: 10 },
  ]
  const totalW = checks.reduce((s, c) => s + c.w, 0)
  const got = checks.filter((c) => c.ok).reduce((s, c) => s + c.w, 0)
  const missing = checks.filter((c) => !c.ok).map((c) => c.id)
  return { score: Math.round((got / totalW) * 100), checks, missing }
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}
