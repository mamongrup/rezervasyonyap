/**
 * yatreyonu.com — arama + yat detay HTML parse (Akasia zenginleştirme).
 */

import { fetchText } from './akasia-api.mjs'

const BASE = 'https://www.yatreyonu.com'
const UA_DELAY_MS = 900
/** VPS → yatreyonu yavaş/engelli olabiliyor; 90s yerine kısa timeout + sonraki sorgu */
const FETCH_TIMEOUT_MS = 25000

function fetchYatreyonuText(url) {
  return fetchText(url, { timeoutMs: FETCH_TIMEOUT_MS })
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

function htmlToPlainText(html) {
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

export function normalizeYachtTitle(title) {
  return String(title || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(
      /\b(gulet|motor\s*yacht|motoryacht|sailing\s*yacht|yelkenli|catamaran|super\s*yacht|superyacht|yat|m\/y|s\/y)\b/gi,
      '',
    )
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

export function scoreTitleMatch(queryTitle, resultTitle) {
  const q = normalizeYachtTitle(queryTitle)
  const r = normalizeYachtTitle(resultTitle)
  if (!q || !r) return 0
  if (q === r) return 100
  if (r.includes(q) || q.includes(r)) return 85
  const qTokens = q.split(' ').filter((t) => t.length > 1)
  const rSet = new Set(r.split(' '))
  const overlap = qTokens.filter((t) => rSet.has(t)).length
  if (!qTokens.length) return 0
  return Math.round((overlap / qTokens.length) * 70)
}

export function searchUrl(query) {
  const q = String(query || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '+')
  return `${BASE}/search/${q}/`
}

/** Arama için alternatif sorgular (Motor Yacht X → X, vb.). */
export function buildSearchQueries(title, { slug = '', boatName = '' } = {}) {
  const out = []
  const add = (s) => {
    const v = String(s || '').trim()
    if (v && !out.includes(v)) out.push(v)
  }

  add(boatName)
  add(title)
  const stripped = String(title || '')
    .replace(
      /^(gulet|motor\s*yacht|motoryacht|sailing\s*yacht|yelkenli|m\/y|s\/y|catamaran)\s+/i,
      '',
    )
    .replace(/\s+(gulet|motor\s*yacht|motoryacht|yelkenli|motoryat)$/i, '')
    .trim()
  add(stripped)

  if (slug) {
    const fromSlug = slug
      .replace(/-ak-\d+$/, '')
      .replace(/-(motor-yacht|sailing-yacht|motoryacht|gulet)-/gi, ' ')
      .replace(/-/g, ' ')
      .trim()
    add(fromSlug)
  }

  return out
}

/**
 * @param {string} html
 * @returns {{ url: string, title: string, score?: number }[]}
 */
export function parseSearchResults(html) {
  const results = []
  const re =
    /<a href="(https:\/\/www\.yatreyonu\.com\/yatlar\/[^"]+)"[^>]*rel="bookmark"[^>]*title="([^"]*)"[\s\S]*?<h2 class="post-title">\s*([^<]+)\s*<\/h2>/gi
  let m
  while ((m = re.exec(html)) !== null) {
    results.push({
      url: m[1].replace(/\/$/, '') + '/',
      title: stripTags(m[3] || m[2]),
    })
  }
  if (results.length) return results

  const fallback =
    /href="(https:\/\/www\.yatreyonu\.com\/yatlar\/[^"]+)"[^>]*title="([^"]+)"/gi
  while ((m = fallback.exec(html)) !== null) {
    results.push({ url: m[1].replace(/\/$/, '') + '/', title: stripTags(m[2]) })
  }
  return results
}

import { parseBathroomCount } from './yacht-bathroom-parse.mjs'

/** @deprecated use parseBathroomCount */
export function parseBathroomFromText(text, cabinCount) {
  return parseBathroomCount(text, cabinCount)
}

/**
 * @param {string} html
 */
export function parseYatDetail(html, sourceUrl) {
  const h1M = html.match(/<h1[^>]*class="[^"]*product_title[^"]*"[^>]*>([^<]+)</i)
  const title = stripTags(h1M?.[1] || '')

  const metaDescM =
    html.match(/<meta\s+name="description"\s+content="([^"]+)"/i) ||
    html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i)
  const metaDescription = decodeHtml(metaDescM?.[1] || '')

  let pax = null
  let cabinCount = null
  let lengthM = null
  let buildYear = null

  const infoM = html.match(/<ul class="yacht-info">([\s\S]*?)<\/ul>/i)
  if (infoM) {
    const block = infoM[1]
    for (const spanM of block.matchAll(/<span>\s*([^<]+?)\s*<\/span>/gi)) {
      const raw = stripTags(spanM[1])
      if (/kişi/i.test(raw)) pax = parseIntField(raw) ?? pax
      else if (/kabin/i.test(raw)) cabinCount = parseIntField(raw) ?? cabinCount
      else if (/^\d{4}$/.test(raw.trim())) buildYear = parseInt(raw, 10)
      else if (/^\d{1,3}$/.test(raw.trim()) && !buildYear) lengthM = parseInt(raw, 10)
    }
  }

  const descM = html.match(
    /<div class="elementor-product-description">\s*([\s\S]*?)\s*<\/div>/i,
  )
  const descriptionHtml = descM?.[1] || ''
  const description = htmlToPlainText(descriptionHtml) || metaDescription

  const amenities = []
  const featM = html.match(/<ul class="ovabrw_woo_features[^"]*">([\s\S]*?)<\/ul>/i)
  if (featM) {
    for (const labelM of featM[1].matchAll(/<label>([^<]+)<\/label>/gi)) {
      const label = stripTags(labelM[1])
      if (label) amenities.push(label)
    }
  }

  const bathroomCount = parseBathroomFromText(description, cabinCount)

  return {
    source: 'yatreyonu',
    url: sourceUrl,
    title,
    pax,
    cabinCount,
    bathroomCount,
    lengthM,
    buildYear,
    description,
    amenities,
    metaDescription,
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * @param {string} queryTitle — ilan başlığı
 * @param {{ minScore?: number, slug?: string }} [opts]
 */
export async function findYatreyonuMatch(queryTitle, { minScore = 55, slug = '', boatName = '' } = {}) {
  const queries = buildSearchQueries(queryTitle, { slug, boatName })
  let best = null
  let bestScore = 0
  let lastCandidateCount = 0

  for (const q of queries) {
    let html
    try {
      html = await fetchYatreyonuText(searchUrl(q))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(`  [yatreyonu] arama atlandı (${q}): ${msg}`)
      continue
    }
    const candidates = parseSearchResults(html)
    if (!candidates.length) continue
    lastCandidateCount = candidates.length

    for (const c of candidates) {
      const score = scoreTitleMatch(queryTitle, c.title)
      if (score > bestScore) {
        bestScore = score
        best = { ...c, score, search_query: q }
      }
    }
    if (best && bestScore >= minScore) break
    await sleep(500)
  }

  const threshold = lastCandidateCount === 1 ? Math.min(minScore, 45) : minScore
  if (!best || bestScore < threshold) return null
  return best
}

export async function fetchYatreyonuDetail(url) {
  await sleep(UA_DELAY_MS)
  try {
    const html = await fetchYatreyonuText(url)
    return parseYatDetail(html, url)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`  [yatreyonu] detay atlandı: ${msg}`)
    return null
  }
}

export async function enrichFromYatreyonu(queryTitle, { minScore = 55, slug = '', boatName = '' } = {}) {
  const match = await findYatreyonuMatch(queryTitle, { minScore, slug, boatName })
  if (!match) return null
  await sleep(UA_DELAY_MS)
  const detail = await fetchYatreyonuDetail(match.url)
  return { match, detail }
}
