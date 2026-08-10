#!/usr/bin/env node
/**
 * Club Med Türkiye'nin herkese açık sitemap ve tesis yapılandırılmış verisinden
 * manuel içe aktarma kataloğu üretir. Çıktı canlı fiyat/müsaitlik içermez.
 *
 *   node scripts/build-clubmed-catalog.mjs
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUTPUT = path.join(ROOT, 'deploy', 'data', 'clubmed', 'catalog.json')
const SITEMAP_URL = 'https://www.clubmed.com.tr/pages/sitemap.xml'

const COUNTRY_ISO = new Map([
  ['bahamalar', 'BS'], ['brezilya', 'BR'], ['çin', 'CN'], ['cin', 'CN'],
  ['bahamas', 'BS'], ['brazil', 'BR'], ['china', 'CN'],
  ['dominik cumhuriyeti', 'DO'], ['endonezya', 'ID'], ['fas', 'MA'],
  ['dominican republic', 'DO'], ['indonesia', 'ID'], ['morocco', 'MA'],
  ['fransa', 'FR'], ['guadeloupe', 'GP'], ['güney afrika', 'ZA'],
  ['france', 'FR'], ['south africa', 'ZA'],
  ['guney afrika', 'ZA'], ['ispanya', 'ES'], ['isviçre', 'CH'],
  ['spain', 'ES'], ['switzerland', 'CH'],
  ['isvicre', 'CH'], ['italya', 'IT'], ['japonya', 'JP'], ['kanada', 'CA'],
  ['italia', 'IT'], ['japan', 'JP'], ['canada', 'CA'],
  ['malezya', 'MY'], ['maldivler', 'MV'], ['martinik', 'MQ'],
  ['malaysia', 'MY'], ['maldives', 'MV'], ['martinique', 'MQ'],
  ['mauritius', 'MU'], ['meksika', 'MX'], ['portekiz', 'PT'],
  ['mexico', 'MX'], ['portugal', 'PT'],
  ['senegal', 'SN'], ['seyseller', 'SC'], ['tayland', 'TH'],
  ['seyşeller cumhuriyeti', 'SC'], ['seyseller cumhuriyeti', 'SC'], ['seychelles', 'SC'], ['thailand', 'TH'],
  ['tunus', 'TN'], ['turks ve caicos adaları', 'TC'],
  ['tunisia', 'TN'], ['turks and caicos islands', 'TC'],
  ['turks ve caicos adalari', 'TC'], ['türkiye', 'TR'], ['turkiye', 'TR'],
  ['turkey', 'TR'], ['turquie', 'TR'],
  ['yunanistan', 'GR'],
  ['greece', 'GR'],
])

const FALLBACK_RESORTS = new Map(Object.entries({
  beidahu: { name: 'Beidahu', country: 'Çin', country_iso2: 'CN', destination: 'Jilin' },
  'ixtapa-pasifik': { name: 'Ixtapa Pacific', country: 'Meksika', country_iso2: 'MX', destination: 'Ixtapa' },
  sanya: { name: 'Sanya', country: 'Çin', country_iso2: 'CN', destination: 'Hainan' },
  'serre-chevalier': { name: 'Serre Chevalier', country: 'Fransa', country_iso2: 'FR', destination: 'Hautes-Alpes' },
  'vikela-safari-lodge': { name: 'Vikela Safari Lodge', country: 'Güney Afrika', country_iso2: 'ZA', destination: 'KwaZulu-Natal' },
}))

const FALLBACK_PAGE_URLS = new Map([
  ['beidahu', 'https://www.clubmed.us/r/beidahu/y'],
])

const ALP_RESORT_SLUGS = new Set([
  'alpe-d-huez', 'grand-massif-samoens-morillon', 'grand-massif-samoens-morillon-saleler',
  'la-plagne-2100', 'la-rosiere', 'les-arcs-panorama', 'peisey-vallandry',
  'pragelato-sestriere', 'saint-moritz-roi-soleil', 'serre-chevalier', 'tignes',
  'val-d-isere', 'val-thorens-sensations', 'valmorel', 'valmorel-saleler',
])

const MACRO_REGION_BY_ISO = new Map([
  ['TR', 'Türkiye'],
  ['FR', 'Avrupa ve Akdeniz'], ['GR', 'Avrupa ve Akdeniz'],
  ['IT', 'Avrupa ve Akdeniz'], ['ES', 'Avrupa ve Akdeniz'], ['PT', 'Avrupa ve Akdeniz'],
  ['CH', 'Alpler'],
  ['ID', 'Asya Pasifik'], ['TH', 'Asya Pasifik'], ['MY', 'Asya Pasifik'],
  ['JP', 'Asya Pasifik'], ['CN', 'Asya Pasifik'],
  ['MV', 'Hint Okyanusu'], ['MU', 'Hint Okyanusu'], ['SC', 'Hint Okyanusu'],
  ['DO', 'Karayipler'], ['BS', 'Karayipler'], ['GP', 'Karayipler'],
  ['MQ', 'Karayipler'], ['TC', 'Karayipler'],
  ['MX', 'Kuzey Amerika'], ['CA', 'Kuzey Amerika'],
  ['BR', 'Güney Amerika'],
  ['MA', 'Afrika'], ['TN', 'Afrika'], ['SN', 'Afrika'], ['ZA', 'Afrika'],
])

function normalizeText(value) {
  return String(value || '')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;|&#x27;/g, "'")
    .trim()
}

function slugFromUrl(url) {
  return new URL(url).pathname.split('/').filter(Boolean)[1]
}

function seasonFromUrl(url) {
  return new URL(url).pathname.split('/').filter(Boolean)[2] || 'y'
}

function seasonPriority(season) {
  return ({ y: 0, s: 1, w: 2 })[season] ?? 9
}

async function fetchText(url, attempts = 3) {
  let lastError
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { 'user-agent': 'RezervasyonYap-ClubMed-Catalog/1.0' },
        signal: AbortSignal.timeout(45_000),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return await response.text()
    } catch (error) {
      lastError = error
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 1000))
    }
  }
  throw lastError
}

function extractJsonString(html, marker) {
  const markerIndex = html.indexOf(marker)
  if (markerIndex < 0) return null
  const start = html.lastIndexOf('"', markerIndex)
  if (start < 0) return null
  for (let i = start + 1; i < html.length; i++) {
    if (html[i] !== '"') continue
    let slashCount = 0
    for (let j = i - 1; j >= start && html[j] === '\\'; j--) slashCount++
    if (slashCount % 2 === 0) {
      try {
        return JSON.parse(html.slice(start, i + 1))
      } catch {
        return null
      }
    }
  }
  return null
}

function extractResortSchema(html) {
  const encoded = extractJsonString(
    html,
    '{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"Resort\\"',
  )
  if (!encoded) return null
  try {
    return JSON.parse(encoded)
  } catch {
    return null
  }
}

function extractMeta(html, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const patterns = [
    new RegExp(`<meta[^>]+(?:name|property)="${escaped}"[^>]+content="([^"]*)"`, 'i'),
    new RegExp(`<meta[^>]+content="([^"]*)"[^>]+(?:name|property)="${escaped}"`, 'i'),
  ]
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match) return normalizeText(match[1])
  }
  return ''
}

function extractGallery(html, primaryImage) {
  const found = [...html.matchAll(/https:\\?\/\\?\/(?:assets\.dream\.clubmed|production\.media\.dcx\.clubmed)\/[^"\\\s<]+/g)]
    .map((match) => match[0].replaceAll('\\/', '/').replaceAll('\\u0026', '&'))
    .map((url) => {
      if (!url.startsWith('https://production.media.dcx.clubmed/')) return url
      try {
        return new URL(url).searchParams.get('url') || url
      } catch {
        return url
      }
    })
    .filter((url) => /\.(?:jpe?g|png|webp)(?:\?|$)/i.test(url))
  return [...new Set([primaryImage, ...found].filter(Boolean))].slice(0, 16)
}

function isoForCountry(country) {
  const key = String(country || '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replaceAll('ı', 'i')
  return COUNTRY_ISO.get(key) || null
}

async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length)
  let cursor = 0
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++
      results[index] = await mapper(items[index], index)
    }
  }))
  return results
}

async function main() {
  const sitemap = await fetchText(SITEMAP_URL)
  const urls = [...sitemap.matchAll(/<loc>(https:\/\/www\.clubmed\.com\.tr\/r\/[^<]+)<\/loc>/g)]
    .map((match) => match[1])

  const bySlug = new Map()
  for (const url of urls) {
    const slug = slugFromUrl(url)
    const current = bySlug.get(slug)
    if (!current || seasonPriority(seasonFromUrl(url)) < seasonPriority(seasonFromUrl(current))) {
      bySlug.set(slug, url)
    }
  }

  const selectedUrls = [...bySlug.values()].sort()
  const failures = []
  const resorts = await mapLimit(selectedUrls, 4, async (url, index) => {
    try {
      const slug = slugFromUrl(url)
      let html = ''
      try {
        html = await fetchText(url)
      } catch (error) {
        const fallbackUrl = FALLBACK_PAGE_URLS.get(slug)
        if (fallbackUrl) html = await fetchText(fallbackUrl)
        else if (!FALLBACK_RESORTS.has(slug)) throw error
      }
      const schema = extractResortSchema(html)
      const fallback = FALLBACK_RESORTS.get(slug) || {}
      if (!schema && !Object.keys(fallback).length) throw new Error('Resort structured data bulunamadı')
      const country = normalizeText(schema?.address?.addressCountry || fallback.country)
      const iso2 = isoForCountry(country) || fallback.country_iso2 || null
      const image = normalizeText(schema?.image || extractMeta(html, 'og:image'))
      const amenities = (schema?.amenityFeature || [])
        .map((item) => normalizeText(item?.name))
        .filter(Boolean)
      const resort = {
        external_ref: slug,
        slug,
        name: normalizeText(schema?.name || fallback.name || extractMeta(html, 'og:title').split('|')[0]) || slug,
        description: normalizeText(schema?.description || extractMeta(html, 'description')),
        source_url: url,
        country,
        country_iso2: iso2,
        macro_region: ALP_RESORT_SLUGS.has(slug) ? 'Alpler' : (MACRO_REGION_BY_ISO.get(iso2) || 'Diğer'),
        destination: normalizeText(schema?.address?.addressRegion || fallback.destination),
        address: normalizeText(schema?.address?.streetAddress),
        postal_code: normalizeText(schema?.address?.postalCode),
        telephone: normalizeText(schema?.telephone),
        email: normalizeText(schema?.email),
        rating: Number(schema?.aggregateRating?.ratingValue) || null,
        review_count: Number(schema?.aggregateRating?.ratingCount) || 0,
        amenities: [...new Set(amenities)],
        images: extractGallery(html, image),
      }
      console.log(`[${index + 1}/${selectedUrls.length}] ${resort.name} (${country || '?'})`)
      return resort
    } catch (error) {
      failures.push({ url, error: error.message })
      console.error(`[HATA] ${url}: ${error.message}`)
      return null
    }
  })

  const catalog = {
    provider: 'clubmed',
    source: SITEMAP_URL,
    generated_at: new Date().toISOString(),
    pricing_mode: 'manual',
    availability_mode: 'manual',
    default_status: 'draft',
    resort_count: resorts.filter(Boolean).length,
    macro_regions: [...new Set(resorts.filter(Boolean).map((item) => item.macro_region))].sort(),
    failures,
    resorts: resorts.filter(Boolean).sort((a, b) => a.name.localeCompare(b.name, 'tr')),
  }

  await fs.mkdir(path.dirname(OUTPUT), { recursive: true })
  await fs.writeFile(OUTPUT, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8')
  console.log(`Katalog yazıldı: ${OUTPUT}`)
  console.log(`Tesis: ${catalog.resort_count}, hata: ${failures.length}`)
  if (failures.length) process.exitCode = 2
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
