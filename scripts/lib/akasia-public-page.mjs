/**
 * akasiayachting.com SEO sayfaları — doğrulanmış açıklama kaynağı (aynı broker).
 */

import { fetchText } from './akasia-api.mjs'
import { normalizeYachtTitle } from './yatreyonu-api.mjs'
import { slugifyYachtName } from './yacht-title-tr.mjs'

const BASE = 'https://akasiayachting.com'

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

function parseIntField(raw) {
  const m = String(raw || '').match(/(\d+)/)
  if (!m) return null
  const n = parseInt(m[1], 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

function parseMeters(raw) {
  const m = String(raw || '').match(/([\d]+(?:[.,]\d+)?)/)
  if (!m) return null
  const n = parseFloat(m[1].replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null
}

function parseFeatureLines(html) {
  const specs = {}
  const re = /<div class="lines">\s*<div><span>([^<]+)<\/span>([^<]*)<\/div>\s*<div><span>([^<]+)<\/span>([^<]*)<\/div>/gi
  let m
  while ((m = re.exec(html)) !== null) {
    const k1 = stripTags(m[1])
    const v1 = stripTags(m[2])
    const k2 = stripTags(m[3])
    const v2 = stripTags(m[4])
    if (k1 && v1 && v1 !== '--') specs[k1] = v1
    if (k2 && v2 && v2 !== '--') specs[k2] = v2
  }
  const singleRe = /<div class="lines">\s*<div><span>([^<]+)<\/span>([^<]*)<\/div>\s*<\/div>/gi
  while ((m = singleRe.exec(html)) !== null) {
    const k = stripTags(m[1])
    const v = stripTags(m[2])
    if (k && v && v !== '--') specs[k] = v
  }
  return specs
}

function parseNarrativeParagraphs(html) {
  const blockM = html.match(/<div class="view-exp">[\s\S]*?<div class="content">([\s\S]*?)<\/div>\s*<!--\s*#content\s*-->[\s\S]*?<div class="features">/i)
  if (!blockM) return []
  const paras = []
  for (const pM of blockM[1].matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
    const text = stripTags(pM[1].replace(/<br\s*\/?>/gi, ' '))
    if (text.length > 40) paras.push(text)
  }
  return paras
}

export function candidatePublicUrls(title, propertyType) {
  const slug = slugifyYachtName(title)
  if (!slug) return []
  const urls = []
  if (propertyType === 'motor_yat') {
    urls.push(`${BASE}/${slug}-motor-yacht`)
    urls.push(`${BASE}/${slug}`)
  } else if (propertyType === 'yelkenli') {
    urls.push(`${BASE}/${slug}-sailing-yacht`)
    urls.push(`${BASE}/${slug}`)
  } else {
    urls.push(`${BASE}/${slug}`)
    urls.push(`${BASE}/${slug}-gulet`)
    urls.push(`${BASE}/gulet-${slug}`)
  }
  return [...new Set(urls)]
}

export function verifyAkasiaPageMatch(expected, parsed) {
  const issues = []
  let points = 0
  let total = 0

  const expName = normalizeYachtTitle(expected.title)
  const gotName = normalizeYachtTitle(parsed.boatName || parsed.title)
  total += 2
  if (expName && gotName && (expName === gotName || expName.includes(gotName) || gotName.includes(expName))) {
    points += 2
  } else {
    issues.push(`isim: ${expName} ≠ ${gotName}`)
  }

  for (const [label, expVal, gotVal, tol = 0] of [
    ['misafir', expected.pax, parsed.pax, 0],
    ['kabin', expected.cabinCount, parsed.cabinCount, 0],
    ['uzunluk', expected.lengthM, parsed.lengthM, 2],
  ]) {
    if (expVal == null || gotVal == null) continue
    total += 1
    if (tol > 0 ? Math.abs(expVal - gotVal) <= tol : expVal === gotVal) {
      points += 1
    } else {
      issues.push(`${label}: ${expVal} ≠ ${gotVal}`)
    }
  }

  return {
    verified: points >= Math.max(2, total - 1),
    points,
    total,
    issues,
  }
}

export function parseAkasiaPublicPage(html, sourceUrl) {
  const h1M = html.match(/<div class="view-exp">[\s\S]*?<h1>([^<]+)<\/h1>/i)
  const title = stripTags(h1M?.[1] || '')
  const specs = parseFeatureLines(html)
  const paragraphs = parseNarrativeParagraphs(html)

  return {
    source: 'akasia_public',
    url: sourceUrl,
    title,
    boatName: specs['Boat Name'] || title,
    pax: parseIntField(specs['Guest Capacity']),
    cabinCount: parseIntField(specs['Guest Cabins']),
    lengthM: parseMeters(specs['Length Over All'] || specs.Length),
    built: parseIntField(specs.Built),
    refit: parseIntField(specs.Refit),
    basePort: specs['Base Port'] || '',
    specs,
    paragraphs,
  }
}

export async function fetchAkasiaPublicPage(title, propertyType, expected = {}) {
  const urls = candidatePublicUrls(title, propertyType)
  let lastParsed = null
  for (const url of urls) {
    try {
      const html = await fetchText(url)
      if (!html.includes('view-exp')) continue
      const parsed = parseAkasiaPublicPage(html, url)
      if (!parsed.paragraphs.length && !parsed.pax) continue
      const check = verifyAkasiaPageMatch(
        {
          title: expected.title || title,
          pax: expected.pax,
          cabinCount: expected.cabinCount,
          lengthM: expected.lengthM,
        },
        parsed,
      )
      lastParsed = { ...parsed, verification: check }
      if (check.verified) return lastParsed
    } catch {
      /* sonraki URL */
    }
  }
  return lastParsed?.verification?.points >= 2 ? lastParsed : null
}
