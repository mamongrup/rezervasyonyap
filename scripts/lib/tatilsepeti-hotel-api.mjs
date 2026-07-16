/**
 * Tatilsepeti.com — otel listesi + detay HTML + oda fiyat API.
 * Resmi API yok; site içi uçlar ve SSR HTML kullanılır.
 */
const ORIGIN = 'https://www.tatilsepeti.com'
const UA =
  process.env.TATILSEPETI_UA ||
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 TravelImport/1.0'

const DEFAULT_LIST_PATHS = ['yurtici-oteller']
/** Geçici hatalar — 400 (Bad Request) genelde kalıcıdır (özellikle GetRoomAllPrice). */
const RETRYABLE_HTTP = new Set([408, 429, 500, 502, 503, 504])

function jitterMs(base) {
  return base + Math.floor(Math.random() * Math.min(500, base * 0.35))
}

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
  const raw = String(text || '')
  // 46.200,00 | ₺7.673 | 7.673,88 TL
  const m = raw.match(/([\d.]+)(?:,\s*(\d{1,2}))?/)
  if (!m) return null
  const whole = m[1].replace(/\./g, '')
  const frac = m[2] != null ? `.${m[2]}` : ''
  const n = Number(`${whole}${frac}`)
  return Number.isFinite(n) && n > 0 ? n : null
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

/** GG.AA.YYYY */
export function formatTrDate(date) {
  const d = date instanceof Date ? date : new Date(date)
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`
}

/** Varsayılan arama penceresi: bugün+offset → +nights (oda listesi AJAX için zorunlu). */
export function defaultStayWindow(now = new Date()) {
  const offsetDays = Number(process.env.TATILSEPETI_STAY_OFFSET_DAYS || 14)
  const nights = Math.max(1, Number(process.env.TATILSEPETI_STAY_NIGHTS || 7))
  const checkIn = new Date(now)
  checkIn.setHours(12, 0, 0, 0)
  checkIn.setDate(checkIn.getDate() + offsetDays)
  const checkOut = new Date(checkIn)
  checkOut.setDate(checkOut.getDate() + nights)
  return {
    checkIn: formatTrDate(checkIn),
    checkOut: formatTrDate(checkOut),
    nights,
    adults: Math.max(1, Number(process.env.TATILSEPETI_STAY_ADULTS || 2)),
  }
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
    this.lastFetchAt = 0
  }

  async fetch(url, opts = {}) {
    const minGap = Number(process.env.TATILSEPETI_MIN_GAP_MS || 200)
    const since = Date.now() - this.lastFetchAt
    if (since < minGap) await sleep(minGap - since)

    const headers = {
      'User-Agent': UA,
      Accept: opts.accept || 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
      'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
      Cookie: this.cookies,
      ...(opts.headers || {}),
    }
    const r = await fetch(url, { ...opts, headers })
    this.lastFetchAt = Date.now()
    const next = collectCookies(r.headers)
    if (next) {
      const merged = new Set([...this.cookies.split('; ').filter(Boolean), ...next.split('; ')])
      this.cookies = [...merged].join('; ')
    }
    return r
  }

  /**
   * Geçici hatalarda üstel bekleme ile yeniden dene.
   * opts.retryableStatuses — varsayılan: 408/429/5xx (400 dahil değil).
   */
  async fetchWithRetry(url, opts = {}) {
    const maxRetries = Number(process.env.TATILSEPETI_FETCH_RETRIES || 6)
    const baseMs = Number(process.env.TATILSEPETI_RETRY_BASE_MS || 4000)
    const retryable = opts.retryableStatuses || RETRYABLE_HTTP
    const onRetry = opts.onRetry || (() => {})
    let last = null
    let lastError = null
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        const wait = jitterMs(baseMs * 2 ** (attempt - 1))
        onRetry({ attempt, wait, status: last?.status })
        await sleep(wait)
      }
      try {
        last = await this.fetch(url, opts)
        lastError = null
      } catch (error) {
        lastError = error
        last = { status: 0, ok: false }
        if (attempt >= maxRetries) break
        continue
      }
      if (last.ok) return last
      if (!retryable.has(last.status)) return last
      if (last.status === 429) {
        const extra = Number(process.env.TATILSEPETI_COOLDOWN_ON_429_MS || 45000)
        onRetry({ attempt: attempt + 1, wait: extra, status: 429, cooldown: true })
        await sleep(extra)
      }
    }
    if (lastError) {
      const cause = lastError?.cause
      const details = [cause?.code, cause?.address, cause?.port].filter(Boolean).join(' ')
      throw new Error(`Tatilsepeti ağ bağlantısı başarısız: ${details || lastError.message}`, {
        cause: lastError,
      })
    }
    return last
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
    const first = await session.fetchWithRetry(base, {
      onRetry: ({ attempt, wait, status }) =>
        log(`[retry] katalog ${path} HTTP/ağ ${status || 'bağlantı'} — ${wait}ms (#${attempt})`),
    })
    if (!first.ok) throw new Error(`Liste HTTP ${first.status} ${base}`)
    const firstHtml = await first.text()
    const totalPages = parseListTotalPages(firstHtml)
    const totalHotels = parseListTotalHotels(firstHtml)
    all.push(...parseListPageHotels(firstHtml, base))
    log(`[katalog] ${path} sayfa 1/${totalPages} (toplam ~${totalHotels ?? '?'})`)
    for (let p = 2; p <= totalPages; p++) {
      await sleep(Number(process.env.TATILSEPETI_PAGE_DELAY_MS || 400))
      const url = `${base}${base.includes('?') ? '&' : '?'}sayfa=${p}`
      const r = await session.fetchWithRetry(url, {
        onRetry: ({ attempt, wait, status }) =>
          log(`[retry] katalog ${path}/${p} HTTP/ağ ${status || 'bağlantı'} — ${wait}ms (#${attempt})`),
      })
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
  const patterns = [
    /(?:src|data-src)="(https:\/\/cdn\.tatilsepeti\.com\/Files\/Images\/Tesis\/[^"]+)"/gi,
    /(?:src|data-src)="(https:\/\/i\.travelapi\.com\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi,
    /(?:src|data-src)="(https:\/\/cdn\.tatilsepeti\.com\/Files\/Images\/TesisOda\/[^"]+)"/gi,
  ]
  for (const re of patterns) {
    let m
    while ((m = re.exec(html))) {
      const u = m[1].replace(/&amp;/g, '&')
      if (/ts-loading|wwwroot\/images|room-bed\.svg/i.test(u)) continue
      if (!urls.includes(u)) urls.push(u)
    }
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
      `getRoom(?:Images|Availability|AllPrice)\\(\\s*${hotelId}\\s*,\\s*${roomTypeId}[\\s\\S]{0,8000}`,
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
    const image =
      block.match(
        /(?:data-src|src)="(https:\/\/cdn\.tatilsepeti\.com\/Files\/Images\/TesisOda\/[^"]+)"/i,
      )?.[1] ||
      block.match(/(?:data-src|src)="(https:\/\/i\.travelapi\.com\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i)?.[1] ||
      null
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
  return attachDomesticQuotes(rooms, html, hotelId)
}

/** Yerli kartlarda toplam fiyat, getRoom çağrısından ÖNCE gelir; ayrı eşleştir. */
function attachDomesticQuotes(rooms, html, hotelId) {
  const quotes = new Map()
  const re = /hotel-detail-cards__price-div__single__all-prices__discount-price">([\d.]+),<small[^>]*>\s*(\d{2})\s*TL/gi
  let m
  while ((m = re.exec(html))) {
    const total = parseMoneyTr(`${m[1]},${m[2]}`)
    if (total == null) continue
    const before = html.slice(Math.max(0, m.index - 5000), m.index)
    const ids = [
      ...before.matchAll(
        new RegExp(`getRoom(?:Images|Availability|AllPrice)\\(\\s*${hotelId}\\s*,\\s*(\\d+)`, 'gi'),
      ),
    ].map((x) => x[1])
    const roomTypeId = ids.length ? ids[ids.length - 1] : null
    if (roomTypeId && !quotes.has(roomTypeId)) quotes.set(roomTypeId, total)
  }
  for (const room of rooms) {
    if (quotes.has(String(room.roomTypeId))) {
      room.quoteTotal = quotes.get(String(room.roomTypeId))
    }
  }
  return rooms
}

/** Yeni yabancı/entegre otel kartları (Hotel__Details--Card, id=room_*). */
export function parseForeignRoomCards(html) {
  const rooms = []
  const re = /id="room_(\d+)"([\s\S]*?)(?=id="room_\d+"|$)/gi
  let m
  while ((m = re.exec(html))) {
    const roomTypeId = m[1]
    const block = m[2]
    const name = stripTags(
      block.match(/Header--Title[^>]*>\s*([\s\S]*?)<\/span>/i)?.[1] ||
        block.match(/Section--Title[^>]*>\s*([\s\S]*?)<\/h2>/i)?.[1] ||
        '',
    )
    const capacityText = stripTags(
      block.match(/Header--Description[\s\S]*?<span>([\s\S]*?)<\/span>/i)?.[1] || '',
    )
    const image =
      block.match(/(?:src|data-src)="(https:\/\/i\.travelapi\.com\/[^"]+)"/i)?.[1] ||
      block.match(/(?:src|data-src)="(https:\/\/cdn\.tatilsepeti\.com\/Files\/Images\/[^"]+)"/i)?.[1] ||
      null
    const features = [
      ...block.matchAll(/class="Allowed">([\s\S]*?)<\/div>/gi),
    ]
      .map((x) => stripTags(x[1]))
      .filter(Boolean)
    const nightly =
      parseMoneyTr(block.match(/gecelik\s*₺\s*([\d.]+)/i)?.[1] || '') ||
      parseMoneyTr(block.match(/Gecelik\s*([\d.,\s]+)/i)?.[1] || '')
    rooms.push({
      roomTypeId,
      name: name || `Oda ${roomTypeId}`,
      boardType: '',
      capacityText,
      image,
      features: [...new Set(features)].slice(0, 40),
      quoteNightly: nightly,
      sourceLayout: 'foreign',
    })
  }
  return rooms
}

function mergeRoomLists(...lists) {
  const byId = new Map()
  for (const list of lists) {
    for (const room of list || []) {
      const id = String(room.roomTypeId)
      const prev = byId.get(id)
      if (!prev) {
        byId.set(id, { ...room })
        continue
      }
      byId.set(id, {
        ...prev,
        ...room,
        name: room.name && room.name !== `Oda ${id}` ? room.name : prev.name,
        boardType: room.boardType || prev.boardType,
        capacityText: room.capacityText || prev.capacityText,
        image: room.image || prev.image,
        features: [...new Set([...(prev.features || []), ...(room.features || [])])],
        quoteTotal: room.quoteTotal ?? prev.quoteTotal,
        quoteNightly: room.quoteNightly ?? prev.quoteNightly,
      })
    }
  }
  return [...byId.values()]
}

function applyStayQuotes(rooms, stay) {
  const dateRange = `${stay.checkIn} - ${stay.checkOut}`
  for (const room of rooms) {
    let nightly = room.quoteNightly ?? null
    if (nightly == null && room.quoteTotal != null && stay.nights > 0) {
      nightly = Math.round(room.quoteTotal / stay.nights)
    }
    if (nightly != null && nightly > 0) {
      room.seasonalPrices = room.seasonalPrices || []
      if (!room.seasonalPrices.length) {
        room.seasonalPrices.push({
          dateRange,
          priceType: room.boardType || 'Oda',
          doublePerPerson: nightly,
          singlePrice: null,
          extraBed: null,
          childPrice: null,
          raw: { source: 'hotel_detail_quote', total: room.quoteTotal ?? null, nights: stay.nights },
        })
      }
    }
  }
  return rooms
}

/**
 * Oda kartları SSR'da skeleton; gerçek liste tarihli POST /Hotel/Detail/ ile gelir.
 */
export async function fetchHotelRoomListHtml(session, hotelId, opts = {}) {
  const stay = opts.stay || defaultStayWindow()
  const log = opts.log || (() => {})
  const referer = opts.referer || `${ORIGIN}/`
  const search = `oda:${stay.adults};tarih:${stay.checkIn},${stay.checkOut};click:true`
  const body = new URLSearchParams({
    Id: String(hotelId),
    IsUndated: 'false',
    Search: search,
  })
  const r = await session.fetchWithRetry(`${ORIGIN}/Hotel/Detail/`, {
    method: 'POST',
    accept: 'application/json, text/javascript, */*; q=0.01',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
      Referer: referer,
      Origin: ORIGIN,
    },
    body: body.toString(),
    onRetry: ({ attempt, wait, status, cooldown }) =>
      log(
        `[retry] Hotel/Detail oda ${hotelId} HTTP ${status}${cooldown ? ' (cooldown)' : ''} — ${wait}ms (#${attempt})`,
      ),
  })
  if (!r.ok) return { ok: false, status: r.status, roomListHtml: '', stay, showLoadMore: false }
  const text = await r.text()
  try {
    const data = JSON.parse(text)
    return {
      ok: true,
      status: r.status,
      roomListHtml: String(data.roomList || ''),
      stay,
      showLoadMore: Boolean(data.showLoadMore),
      raw: data,
    }
  } catch (e) {
    return { ok: false, status: r.status, roomListHtml: '', stay, error: e.message, showLoadMore: false }
  }
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

export async function fetchRoomAllPrices(session, hotelId, roomTypeId, log = () => {}) {
  const url = `${ORIGIN}/Hotel/GetRoomAllPrice/?hotelId=${hotelId}&roomTypeId=${roomTypeId}`
  const r = await session.fetchWithRetry(url, {
    accept: 'application/json, text/javascript, */*; q=0.01',
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      Referer: `${ORIGIN}/`,
    },
    onRetry: ({ attempt, wait, status, cooldown }) =>
      log(
        `[retry] GetRoomAllPrice ${hotelId}/${roomTypeId} HTTP ${status}${cooldown ? ' (cooldown)' : ''} — ${wait}ms (#${attempt})`,
      ),
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
  const candidates = [
    listRow.url,
    listRow.slug ? `${ORIGIN}/${listRow.slug}` : null,
    listRow.hotelId ? `${ORIGIN}/otel/detay?hotelId=${listRow.hotelId}` : null,
  ].filter(Boolean)

  let html = ''
  let url = candidates[0]
  let lastStatus = 0
  for (const tryUrl of candidates) {
    const r = await session.fetchWithRetry(tryUrl, {
      headers: { Referer: `${ORIGIN}/yurtici-oteller` },
      onRetry: ({ attempt, wait, status, cooldown }) =>
        log(`[retry] detay ${listRow.hotelId} HTTP ${status}${cooldown ? ' (cooldown)' : ''} — ${wait}ms (#${attempt})`),
    })
    lastStatus = r.status
    if (r.ok) {
      url = tryUrl
      html = await r.text()
      break
    }
  }
  if (!html) throw new Error(`Detay HTTP ${lastStatus} ${url}`)
  const hidden = parseHiddenFields(html)
  const hotelId = String(hidden.hotelId || listRow.hotelId)
  const jsonLd = parseJsonLd(html)
  const regionM = html.match(/class="hotel__region"[^>]*>[\s\S]*?<i[^>]*><\/i>\s*([^<]+)/i)
  const region = stripTags(regionM?.[1] || listRow.region || '')
  const description = parseDescription(html) || stripTags(jsonLd?.description || '')
  const gallery = parseGalleryImages(html)
  const locationRows = parseLocationTable(html)
  const features = parseFeatureLists(html)

  // SSR sayfada oda kartları skeleton; tarihli Hotel/Detail POST zorunlu.
  const stay = opts.stay || defaultStayWindow()
  const roomList = await fetchHotelRoomListHtml(session, hotelId, {
    stay,
    referer: url,
    log,
  })
  if (!roomList.ok) {
    log(`[uyarı] oda listesi ${hotelId}: HTTP ${roomList.status}${roomList.error ? ` ${roomList.error}` : ''}`)
  } else if (/tarih seçiniz/i.test(roomList.roomListHtml || '')) {
    log(`[uyarı] oda listesi ${hotelId}: tarih zorunlu yanıtı (checkIn=${stay.checkIn})`)
  }

  const roomHtml = roomList.roomListHtml || ''
  let rooms = mergeRoomLists(
    parseRoomCards(html, hotelId),
    parseRoomCards(roomHtml, hotelId),
    parseForeignRoomCards(roomHtml),
  )
  applyStayQuotes(rooms, stay)

  // GetRoomAllPrice sezon takvimi — yalnızca klasik (yerli) oda tipi id'lerinde.
  if (fetchRoomPrices && rooms.length) {
    for (const room of rooms) {
      if (room.sourceLayout === 'foreign') continue
      if (!/^\d+$/.test(String(room.roomTypeId))) continue
      await sleep(Number(process.env.TATILSEPETI_ROOM_PRICE_DELAY_MS || 250))
      const priceResult = await fetchRoomAllPrices(session, hotelId, room.roomTypeId, log)
      room.priceFetchOk = priceResult.ok
      if (priceResult.ok && priceResult.rows.length) {
        room.seasonalPrices = priceResult.rows
      } else if (!priceResult.ok) {
        room.priceFetchError = priceResult.error
        log(`[uyarı] fiyat ${hotelId}/${room.roomTypeId}: ${priceResult.error}`)
      }
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
      if (room.quoteNightly != null && (min == null || room.quoteNightly < min)) {
        min = room.quoteNightly
      }
    }
    return min
  })()

  // Oda görsellerini galeriye ekle (özellikle travelapi kaynaklı).
  for (const room of rooms) {
    if (room.image && !gallery.includes(room.image)) gallery.push(room.image)
  }

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
    stayWindow: stay,
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
