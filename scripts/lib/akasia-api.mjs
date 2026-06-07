/**
 * Akasia Yachting (Active theme) — liste/detay HTML widget API.
 * Kaynak: https://akasiayachting.com/?get=…&theme=active-71&ref=akasiayachting.com
 */

import https from 'node:https'
import http from 'node:http'

export const AKASIA_ENGINE = 'https://akasiayachting.com'
export const AKASIA_THEME = 'active-71'
export const AKASIA_REF = 'akasiayachting.com'

/** Active `get` → travel `property_type` */
export const AKASIA_RENT_CATEGORIES = [
  { get: 'gulets', propertyType: 'gulet', label: 'Gulet' },
  { get: 'motoryachts', propertyType: 'motor_yat', label: 'Motor yat' },
  { get: 'sailingyachts', propertyType: 'yelkenli', label: 'Yelkenli' },
]

const UA = 'TravelImport/1.0 (+rezervasyonyap)'

export function fetchText(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http
    lib
      .get(url, { timeout: 90000, headers: { 'User-Agent': UA } }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume()
          fetchText(res.headers.location).then(resolve, reject)
          return
        }
        if (res.statusCode !== 200) {
          res.resume()
          reject(new Error(`HTTP ${res.statusCode} ${url}`))
          return
        }
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
      })
      .on('error', reject)
      .on('timeout', function () {
        this.destroy()
        reject(new Error(`timeout ${url}`))
      })
  })
}

function buildQuery(params) {
  return Object.entries(params)
    .filter(([, v]) => v != null && String(v) !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&')
}

export function listUrl(get, { page = 1, perpage = 24, sort = 'price', by = 'asc' } = {}) {
  const q = buildQuery({
    get,
    for: 'rent',
    sort,
    by,
    page,
    perpage,
    theme: AKASIA_THEME,
    ref: AKASIA_REF,
  })
  return `${AKASIA_ENGINE}/?${q}`
}

export function detailUrl(of) {
  const q = buildQuery({ get: 'detail', of, theme: AKASIA_THEME, ref: AKASIA_REF })
  return `${AKASIA_ENGINE}/?${q}`
}

function decodeHtml(s) {
  return String(s || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim()
}

function stripTags(s) {
  return decodeHtml(String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
}

/** "3.500 Euros" → { amount: 3500, currency: 'EUR' } */
export function parseAkasiaMoney(raw) {
  const s = stripTags(raw)
  if (!s || /^0\s/i.test(s)) return { amount: null, currency: 'EUR' }
  const curMatch = s.match(/\b(euros?|eur|usd|gbp|try|tl)\b/i)
  let currency = 'EUR'
  if (curMatch) {
    const c = curMatch[1].toLowerCase()
    if (c === 'usd') currency = 'USD'
    else if (c === 'gbp') currency = 'GBP'
    else if (c === 'try' || c === 'tl') currency = 'TRY'
    else currency = 'EUR'
  }
  const numPart = s.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.')
  const amount = parseFloat(numPart)
  return {
    amount: Number.isFinite(amount) && amount > 0 ? amount : null,
    currency,
  }
}

/** "22 meters" | "26 m" → 22 */
export function parseMeters(raw) {
  const m = String(raw || '').match(/([\d]+(?:[.,]\d+)?)/)
  if (!m) return null
  const n = parseFloat(m[1].replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : null
}

function parseIntField(raw) {
  const m = String(raw || '').match(/(\d+)/)
  if (!m) return null
  const n = parseInt(m[1], 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Küçük önizleme URL → galeri boyutu (1024-576). */
export function upgradeAkasiaImageUrl(url) {
  const u = String(url || '').trim()
  if (!u) return ''
  return u
    .replace(/-200-120\.(jpe?g|png|webp)$/i, '-1024-576.$1')
    .replace(/-1350-630\.(jpe?g|png|webp)$/i, '-1024-576.$1')
}

/**
 * @param {string} html
 * @returns {{ id: string, title: string, lengthM: number|null, pax: number|null, charterRate: {amount:number|null,currency:string}, thumbUrl: string }[]}
 */
export function parseListingCards(html) {
  const items = []
  const re = /<div class="view-box">([\s\S]*?)<\/div>\s*<!--\s*#view-box\s*-->/gi
  let m
  while ((m = re.exec(html)) !== null) {
    const block = m[1]
    const idM = block.match(/#get\/detail\/of\/(\d+)/i)
    if (!idM) continue
    const titleM = block.match(/<strong>([^<]+)<\/strong>/i)
    const imgM = block.match(/<img[^>]+src="([^"]+)"/i)
    const lengthM = block.match(/<span>Length<\/span>\s*([^<]+)/i)
    const paxM = block.match(/<span>Pax<\/span>\s*([^<]+)/i)
    const rateM = block.match(/<span>Charter Rate<\/span>\s*([^<]+)/i)
    items.push({
      id: idM[1],
      title: stripTags(titleM?.[1] || `Yacht ${idM[1]}`),
      lengthM: parseMeters(lengthM?.[1]),
      pax: parseIntField(paxM?.[1]),
      charterRate: parseAkasiaMoney(rateM?.[1] || ''),
      thumbUrl: decodeHtml(imgM?.[1] || ''),
    })
  }
  return items
}

/** Son sayfa numarası (yoksa 1). */
export function parseLastPage(html) {
  const pages = [...String(html || '').matchAll(/page\/(\d+)\//gi)].map((x) => Number(x[1]))
  if (!pages.length) return 1
  return Math.max(...pages)
}

function parseFeaturePairs(html, className) {
  const sectionRe = new RegExp(
    `<div class="${className}">([\\s\\S]*?)</div>\\s*<!--\\s*#lines`,
    'gi',
  )
  const out = {}
  let sec
  while ((sec = sectionRe.exec(html)) !== null) {
    const block = sec[1]
    const lineRe = /<div><span>([^<]*)<\/span>\s*([^<]*(?:<div>[^<]*<\/div>)?[^<]*)<\/div>/gi
    let lm
    while ((lm = lineRe.exec(block)) !== null) {
      const key = stripTags(lm[1])
      const val = stripTags(lm[2].replace(/<div>/g, ' '))
      if (key) out[key] = val
    }
  }
  return out
}

function parseSeasonRates(html) {
  const blockM = html.match(/<div class="lines-rates">([\s\S]*?)<\/div>\s*<!--\s*#lines/i)
  if (!blockM) return []
  const rates = []
  const lineRe = /<div><span>([^<]+)<\/span>\s*([^<]+)<\/div>/gi
  let m
  while ((m = lineRe.exec(blockM[1])) !== null) {
    const label = stripTags(m[1])
    const money = parseAkasiaMoney(m[2])
    if (label && money.amount != null) {
      rates.push({ label, amount: money.amount, currency: money.currency })
    }
  }
  return rates
}

function parseGalleryUrls(html) {
  const urls = []
  const seen = new Set()
  const push = (u) => {
    const full = upgradeAkasiaImageUrl(decodeHtml(u))
    if (!full || seen.has(full)) return
    seen.add(full)
    urls.push(full)
  }

  const photosM = html.match(/var\s+photos\s*=\s*(\[[\s\S]*?\]);/)
  if (photosM) {
    try {
      const arr = JSON.parse(photosM[1].replace(/'/g, '"'))
      for (const row of arr) push(row?.image)
    } catch {
      /* ignore */
    }
  }

  const thumbRe = /<div id="thumbnails"[\s\S]*?<\/div>\s*<!--\s*#thumbnails/i
  const thumbM = html.match(thumbRe)
  if (thumbM) {
    const imgRe = /<img[^>]+src="([^"]+)"/gi
    let im
    while ((im = imgRe.exec(thumbM[0])) !== null) push(im[1])
  }

  const heroM = html.match(/id="change-image"[\s\S]*?<img[^>]+src="([^"]+)"/i)
  if (heroM) push(heroM[1])

  return urls
}

const BATHROOM_SPEC_KEYS = [
  'Bathrooms',
  'Bathroom',
  'Guest Bathrooms',
  'Heads',
  'Head',
  'WC',
  'WCs',
  'Toilets',
  'Toilet',
  'Banyo',
  'Banyolar',
]

/** Akasia specs → banyo sayısı (yoksa null). */
export function parseBathroomCountFromSpecs(specs) {
  if (!specs || typeof specs !== 'object') return null
  for (const key of BATHROOM_SPEC_KEYS) {
    const n = parseIntField(specs[key])
    if (n) return n
  }
  for (const [k, v] of Object.entries(specs)) {
    if (!v || v === '--' || !/bath|head|wc|toilet|banyo/i.test(k)) continue
    const n = parseIntField(v)
    if (n) return n
  }
  return null
}

export function buildAkasiaCapacityLines(pax, cabinCount, bathCount) {
  const parts = []
  if (pax) parts.push(`${pax} misafir`)
  if (cabinCount) parts.push(`${cabinCount} kabin`)
  if (bathCount) parts.push(`${bathCount} banyo`)
  if (!parts.length) return []
  return ['Konaklama:', `- ${parts.join(', ')}`, '']
}

export function buildDescription(title, specs, rates, { pax, cabinCount, bathCount } = {}) {
  const lines = []
  lines.push(...buildAkasiaCapacityLines(pax, cabinCount, bathCount))
  if (rates.length) {
    lines.push('Haftalık charter ücretleri:')
    for (const r of rates) {
      lines.push(`- ${r.label}: ${r.amount} ${r.currency}`)
    }
    lines.push('')
  }
  if (Object.keys(specs).length) {
    lines.push('Teknik özellikler:')
    for (const [k, v] of Object.entries(specs)) {
      if (v && v !== '--') lines.push(`- ${k}: ${v}`)
    }
  }
  if (!lines.length) return title
  return lines.join('\n')
}

/**
 * @param {string} html
 */
export function parseYachtDetail(html) {
  const titleM = html.match(/<h1>([^<]+)<\/h1>/i)
  const title = stripTags(titleM?.[1] || '')
  const specs = {
    ...parseFeaturePairs(html, 'lines'),
    ...parseFeaturePairs(html, 'lines-desc'),
  }
  const rates = parseSeasonRates(html)
  const galleryUrls = parseGalleryUrls(html)

  const inquiryIdM = html.match(/name="inquiry-id"[^>]+value="(\d+)"/i)
  const id = inquiryIdM?.[1] || ''

  const lengthMeters =
    parseMeters(specs['Length Over All']) ||
    parseMeters(specs.Length) ||
    null
  const cabinCount =
    parseIntField(specs['Guest Cabins']) ||
    parseIntField(specs.Cabins) ||
    parseIntField(specs['Number of Cabins']) ||
    null
  const pax =
    parseIntField(specs['Guest Capacity']) ||
    parseIntField(specs.Pax) ||
    parseIntField(specs['Max Guests']) ||
    null
  const bathroomCount = parseBathroomCountFromSpecs(specs)
  const basePort = specs['Base Port'] || ''

  const lowestRate =
    rates.reduce((min, r) => (min == null || r.amount < min.amount ? r : min), null) ||
    parseAkasiaMoney(specs['Charter Rate'] || '')

  const currency = lowestRate?.currency || rates[0]?.currency || 'EUR'

  return {
    id,
    title,
    specs,
    rates,
    galleryUrls,
    lengthMeters,
    cabinCount,
    pax,
    bathroomCount,
    basePort,
    currency,
    weeklyLow: lowestRate?.amount ?? null,
    description: buildDescription(title, specs, rates, { pax, cabinCount, bathCount: bathroomCount }),
  }
}

export async function fetchAllListingCards(get, { perpage = 24, maxPages = 0 } = {}) {
  const firstHtml = await fetchText(listUrl(get, { page: 1, perpage }))
  const lastPage = maxPages > 0 ? Math.min(parseLastPage(firstHtml), maxPages) : parseLastPage(firstHtml)
  const all = [...parseListingCards(firstHtml)]
  const seen = new Set(all.map((x) => x.id))

  for (let page = 2; page <= lastPage; page += 1) {
    const html = await fetchText(listUrl(get, { page, perpage }))
    for (const card of parseListingCards(html)) {
      if (seen.has(card.id)) continue
      seen.add(card.id)
      all.push(card)
    }
  }
  return all
}

export async function fetchYachtDetail(of) {
  const html = await fetchText(detailUrl(of))
  return parseYachtDetail(html)
}
