/**
 * baranselyachting.com — liste + detay HTML parse.
 */

import { fetchText, parseBathroomCountFromSpecs } from './akasia-api.mjs'
import { parseBathroomCount } from './yacht-bathroom-parse.mjs'
import { structuredPlainTextToHtml } from './text-to-html.mjs'

const BASE = 'https://www.baranselyachting.com'
const LIST_PATH = '/tekne-kirala/'

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

function parseIntField(raw) {
  const m = String(raw || '').match(/(\d+)/)
  if (!m) return null
  const n = parseInt(m[1], 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

function parseMoney(raw) {
  const s = String(raw || '').replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.')
  const n = parseFloat(s)
  return Number.isFinite(n) && n > 0 ? n : null
}

export const BOAT_TYPE_MAP = {
  gulet: 'gulet',
  motoryat: 'motor_yat',
  'motor yat': 'motor_yat',
  yelkenli: 'yelkenli',
  katamaran: 'katamaran',
  trawler: 'motor_yat',
}

export function mapBoatType(label) {
  const k = String(label || '').trim().toLowerCase()
  return BOAT_TYPE_MAP[k] || 'gulet'
}

export function listPageUrl(page = 1) {
  if (page <= 1) return `${BASE}${LIST_PATH}`
  return `${BASE}${LIST_PATH}${page}/`
}

export function parseLastListPage(html) {
  const pages = [...String(html || '').matchAll(/tekne-kirala\/(\d+)\//gi)].map((m) =>
    parseInt(m[1], 10),
  )
  return pages.length ? Math.max(...pages) : 1
}

/**
 * @param {string} html
 */
export function parseListingCards(html) {
  const cards = []
  const blocks = String(html || '').split(/boat-single-item/)
  for (const block of blocks) {
    if (!block.includes('boat-name')) continue
    const linkM = block.match(
      /<a\s+href="([^"]+)"[^>]*class="boat-name"[^>]*>([\s\S]*?)<\/a>/i,
    )
    if (!linkM) continue

    const detailUrl = linkM[1].trim()
    const displayName = stripTags(linkM[2])
    const idM = displayName.match(/#(\d+)/)
    const baransenId = idM?.[1] || detailUrl.match(/-(\d+)\/?$/)?.[1] || ''

    const typeM = block.match(/<div class="badges">\s*<span[^>]*>([^<]+)</i)
    const boatTypeLabel = stripTags(typeM?.[1] || 'Gulet')

    let pax = null
    let marina = ''
    for (const liM of block.matchAll(/<li>([^<]*)<\/li>/gi)) {
      const li = stripTags(liM[1])
      const paxM = li.match(/Konaklama\s*:\s*(\d+)\s*kişi/i)
      if (paxM) pax = parseInt(paxM[1], 10)
      const marM = li.match(/Marina:\s*(.+)/i)
      if (marM) marina = marM[1].trim().replace(/\s+yat\s+kiralama\b/gi, '').trim()
    }

    const imgs = []
    for (const imgM of block.matchAll(/data-lazy="([^"]+)"/gi)) {
      const u = imgM[1].replace(/-w640-/, '-w1920-')
      if (!imgs.includes(u)) imgs.push(u)
    }

    let dailyPrice = null
    const priceM = block.match(/class="current-price"[\s\S]*?fa-euro-sign[\s\S]*?<\/i>\s*([\d.,]+)/i)
    if (priceM) dailyPrice = parseMoney(priceM[1])

    cards.push({
      baransenId: String(baransenId),
      title: displayName.replace(/^#\d+,?\s*/i, '').trim(),
      displayName,
      detailUrl,
      boatTypeLabel,
      propertyType: mapBoatType(boatTypeLabel),
      pax,
      marina,
      thumbUrls: imgs,
      dailyPrice,
      currency: 'EUR',
    })
  }

  const seen = new Set()
  return cards.filter((c) => {
    const k = c.detailUrl
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

export async function fetchAllListingCards({ maxPages = 0 } = {}) {
  const firstHtml = await fetchText(listPageUrl(1))
  const lastPage = maxPages > 0 ? Math.min(parseLastListPage(firstHtml), maxPages) : parseLastListPage(firstHtml)
  const all = [...parseListingCards(firstHtml)]
  const seen = new Set(all.map((c) => c.detailUrl))

  for (let page = 2; page <= lastPage; page += 1) {
    const html = await fetchText(listPageUrl(page))
    for (const card of parseListingCards(html)) {
      if (seen.has(card.detailUrl)) continue
      seen.add(card.detailUrl)
      all.push(card)
    }
  }
  return all
}

function parseSpecs(html) {
  const specs = {}
  for (const m of html.matchAll(/<dt>([^<]+)<\/dt>\s*<dd[^>]*>([^<]*)<\/dd>/gi)) {
    const k = stripTags(m[1]).replace(/:$/, '')
    const v = stripTags(m[2])
    if (k && v) specs[k] = v
  }
  return specs
}

function parseMonthlyRates(html) {
  const rates = []
  for (const m of html.matchAll(/<strong>€([\d.,]+)<\/strong>\s*<small>([^<]+)<\/small>/gi)) {
    const amount = parseMoney(m[1])
    const label = stripTags(m[2])
    if (amount && label) rates.push({ label, amount, currency: 'EUR' })
  }
  return rates
}

/**
 * @param {string} html
 */
export function parseBoatDetail(html, sourceUrl) {
  const h1M = html.match(/<h1[^>]*class="[^"]*ui-title[^"]*"[^>]*>([^<]+)</i)
  const title = stripTags(h1M?.[1] || '')

  let boatTypeLabel = 'Gulet'
  let cabinCount = null
  let pax = null
  let lengthM = null

  // İlk boat-features UL aylık fiyat; kapasite ayrı blokta — tüm <strong> etiketlerini tara.
  for (const sm of html.matchAll(/<strong>([^<]+)<\/strong>/gi)) {
    const raw = stripTags(sm[1])
    if (/gulet|motoryat|motor\s*yat|yelkenli|katamaran|trawler/i.test(raw)) boatTypeLabel = raw
    const cabM = raw.match(/(\d+)\s*Kabin/i)
    if (cabM) cabinCount = parseInt(cabM[1], 10)
    const paxM = raw.match(/(\d+)\s*Kişi/i)
    if (paxM) pax = parseInt(paxM[1], 10)
    const lenM = raw.match(/(\d+)\s*Metre/i)
    if (lenM) lengthM = parseInt(lenM[1], 10)
  }

  const articleM = html.match(/<article id="article">([\s\S]*?)<\/article>/i)
  const articleHtml = articleM?.[1] || ''
  const articleText = htmlToPlain(articleHtml)

  const specs = parseSpecs(html)
  if (!lengthM && specs['Tekne Uzunluğu']) {
    lengthM = parseIntField(specs['Tekne Uzunluğu'])
  }

  const gallery = []
  const pushGalleryUrl = (raw) => {
    if (!raw) return
    const u = String(raw)
      .replace(/-w1278-/, '-w1920-')
      .replace(/-w640-/, '-w1920-')
      .replace(/-w800-/, '-w1920-')
    if (u.startsWith('http') && !gallery.includes(u)) gallery.push(u)
  }

  const galleryJsonStart = html.search(/<div id="galleryJson"/i)
  if (galleryJsonStart >= 0) {
    const bracketStart = html.indexOf('[', galleryJsonStart)
    if (bracketStart >= 0) {
      let depth = 0
      let end = bracketStart
      for (let i = bracketStart; i < html.length; i += 1) {
        const c = html[i]
        if (c === '[') depth += 1
        else if (c === ']') {
          depth -= 1
          if (depth === 0) {
            end = i
            break
          }
        }
      }
      try {
        const arr = JSON.parse(html.slice(bracketStart, end + 1))
        for (const item of arr) {
          pushGalleryUrl(item['src-1200'] || item['src-800'] || item.src)
        }
      } catch {
        /* ignore */
      }
    }
  }

  for (const m of html.matchAll(/class="[^"]*boat-img[^"]*"[^>]*src="([^"]+)"/gi)) {
    pushGalleryUrl(m[1])
  }
  for (const m of html.matchAll(/data-lazy="([^"]+)"/gi)) {
    pushGalleryUrl(m[1])
  }
  if (!gallery.length) {
    for (const m of html.matchAll(
      /https?:\/\/static\.baranselgrup\.com\/nwm-\d+-w\d+-[^"'\s<>]+\.(?:png|jpe?g|webp)/gi,
    )) {
      pushGalleryUrl(m[0])
    }
  }

  const monthlyRates = parseMonthlyRates(html)
  const propertyType = mapBoatType(boatTypeLabel)
  const bathroomCount =
    parseBathroomCountFromSpecs(specs) ??
    parseBathroomCount(articleText, cabinCount, { propertyType })

  let marina = ''
  const breadcrumbMarina = html.match(/Marina[:\s]*([^<]+)/i)
  if (breadcrumbMarina) {
    marina = stripTags(breadcrumbMarina[1]).replace(/\s+yat\s+kiralama\b/gi, '').trim()
  }

  const idM = sourceUrl.match(/-(\d+)\/?$/)
  const baransenId = idM?.[1] || ''

  return {
    baransenId,
    title: title || stripTags(sourceUrl.split('/').filter(Boolean).pop()?.replace(/-/g, ' ')),
    boatTypeLabel,
    propertyType: mapBoatType(boatTypeLabel),
    pax,
    cabinCount,
    bathroomCount,
    lengthM,
    marina,
    articleText,
    specs,
    monthlyRates,
    galleryUrls: gallery,
    currency: 'EUR',
    sourceUrl,
  }
}

export function buildBaransenDescription(detail, { displayTitle, pax, cabinCount, bathCount, marina, dailyPrice }) {
  const lines = []
  lines.push('Konaklama:')
  const cap = []
  if (pax) cap.push(`${pax} misafir`)
  if (cabinCount) cap.push(`${cabinCount} kabin`)
  if (bathCount) cap.push(`${bathCount} banyo`)
  if (cap.length) lines.push(`- ${cap.join(', ')}`)
  lines.push('')

  if (detail.articleText) {
    lines.push(detail.articleText)
    lines.push('')
  }

  if (marina) {
    lines.push(`Kalkış marinası: ${marina}`)
    lines.push('')
  }

  if (dailyPrice) {
    lines.push(`Günlük kiralama (başlangıç): ${dailyPrice} EUR`)
    lines.push('')
  }

  if (detail.monthlyRates?.length) {
    lines.push('Aylık charter ücretleri:')
    for (const r of detail.monthlyRates) {
      lines.push(`- ${r.label}: ${r.amount} ${r.currency}`)
    }
    lines.push('')
  }

  if (Object.keys(detail.specs || {}).length) {
    lines.push('Teknik özellikler:')
    for (const [k, v] of Object.entries(detail.specs)) {
      lines.push(`- ${k}: ${v}`)
    }
  }

  const plain = lines.join('\n').trim()
  return plain ? structuredPlainTextToHtml(plain) : displayTitle
}

export async function fetchBoatDetail(url) {
  const html = await fetchText(url)
  return parseBoatDetail(html, url)
}
