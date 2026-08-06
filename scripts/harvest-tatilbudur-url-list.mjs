#!/usr/bin/env node
/**
 * TatilBudur açık tesis sayfaları → taslak otel feed'i.
 *
 * Bu araç KAPALI canlı fiyat/oda teklif uçlarını çağırmaz. Bu nedenle:
 * - Statik sayfada bulunmayan oda, çocuk politikası ve fiyat ASLA uydurulmaz.
 * - Fiyat `null` bırakılır; bunlar kalite kuyruğunda taslak kalır.
 * - Sağlayıcının açık sayfasındaki galeri bağlantıları sonraki adımda yerel AVIF'e alınır.
 *
 * Kullanım:
 * node scripts/harvest-tatilbudur-url-list.mjs \
 *   --urls deploy/data/tatilbudur/bodrum-request-urls.txt \
 *   --out backups/tatilbudur-bodrum-public-feed.json
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const argv = process.argv.slice(2)
const valueAfter = (name) => {
  const i = argv.indexOf(name)
  return i >= 0 ? String(argv[i + 1] || '').trim() : ''
}
const urlsPath = path.resolve(ROOT, valueAfter('--urls') || 'deploy/data/tatilbudur/bodrum-request-urls.txt')
const outPath = path.resolve(ROOT, valueAfter('--out') || 'backups/tatilbudur-public-feed.json')
const rawDir = path.resolve(ROOT, valueAfter('--raw-dir') || 'backups/tatilbudur-public-pages')
const concurrency = Math.max(1, Math.min(4, Number(valueAfter('--concurrency') || 3)))

function clean(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\*+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function slugFromUrl(url) {
  try {
    return new URL(url).pathname.replace(/^\/+|\/+$/g, '').toLocaleLowerCase('tr-TR')
  } catch {
    return ''
  }
}

function escapeHtml(value) {
  return clean(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function unique(values) {
  return [...new Set(values.map(clean).filter(Boolean))]
}

function section(text, heading, endHeadings) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const startMatch = text.match(new RegExp(`(?:^|\\n)#{0,6}\\s*${escaped}\\s*(?:\\n|$)`, 'i'))
  if (!startMatch || startMatch.index == null) return ''
  const start = startMatch.index + startMatch[0].length
  let end = text.length
  const rest = text.slice(start)
  for (const endHeading of endHeadings) {
    const endEscaped = endHeading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const match = rest.match(new RegExp(`(?:^|\\n)#{0,6}\\s*${endEscaped}\\b`, 'i'))
    if (match?.index != null) end = Math.min(end, start + match.index)
  }
  return text.slice(start, end).trim()
}

function bullets(text) {
  return unique(
    text
      .split('\n')
      .map((line) => line.match(/^\s*[-*]\s+(.+?)\s*$/)?.[1] || '')
      .map((item) => item.replace(/\[([^\]]+)]\([^)]+\)/g, '$1').replace(/\*+$/g, '').trim())
      .filter((item) =>
        item.length >= 2 &&
        item.length <= 120 &&
        !/Daha Fazla|Tümünü|Kampanya|Popüler|Rezervasyon Yap|Fiyat Tablosu/i.test(item),
      ),
  )
}

function extractImages(text) {
  const patterns = [
    /https:\/\/productcdn\.tatilbudur\.com\/Otel\/gallery\/[^\s)"'\]]+/g,
    /https:\/\/ucdn\.tatilbudur\.net\/Otel\/855x426\/[^\s)"'\]]+/g,
    /https:\/\/productcdn\.tatilbudur\.com\/Otel\/298x149\/[^\s)"'\]]+/g,
  ]
  const result = []
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      let url = match[0].replace(/[),.;]+$/g, '')
      url = url.replace('/298x149/', '/gallery/')
      if (url) result.push(url)
    }
  }
  return unique(result).slice(0, 40)
}

function extractTitle(text, fallback) {
  const match = text.match(/^#\s+(.+)$/m)
  return clean(match?.[1] || fallback)
}

function detectBoardType(text) {
  const ordered = [
    'Alkolsüz Her Şey Dahil',
    'Ultimate Her Şey Dahil',
    'Ultra Her Şey Dahil',
    'Her Şey Dahil',
    'Tam Pansiyon',
    'Yarım Pansiyon',
    'Oda Kahvaltı',
    'Sadece Oda',
  ]
  return ordered.find((label) => new RegExp(label.replace(/\s+/g, '\\s+'), 'i').test(text)) || ''
}

function extractLocation(text) {
  const block = section(text, 'Konum Bilgileri', ['Kampanyalar', 'Genel Özellikler', 'Odalar'])
  const lines = block
    .split('\n')
    .map((line) => clean(line.replace(/\*\*/g, '')))
    .filter((line) => line.length > 12 && !/Haritada Göster|Mevkii|Mesafe|Tümünü/i.test(line))
  const address = lines.find((line) => /Muğla|Bodrum|Gümüşlük|Turgutreis|Bitez|Gündoğan|Yalıkavak|Torba/i.test(line)) || ''
  const mevkii = clean((block.match(/Mevkii:?\s*(.+)/i) || [])[1] || '')
  return {
    address,
    district: mevkii || 'Bodrum',
    city: 'Bodrum',
    provinceCity: 'Muğla',
  }
}

function extractStarRating(text) {
  const match = text.match(/(?:^|\s)([1-5])\s*(?:yıldız|star)/i)
  return match ? Number(match[1]) : null
}

function buildDescription(title, boardType, sections) {
  const blocks = [
    `<h2>${escapeHtml(title)} Hakkında</h2>`,
    `<p>${escapeHtml(title)} için sağlayıcının açık tesis sayfasındaki bilgiler temel alınmıştır. Hizmetlerin kapsamı ve saatleri tesise göre değişebilir.</p>`,
  ]
  if (boardType) blocks.push(`<p><strong>Konsept:</strong> ${escapeHtml(boardType)}</p>`)
  for (const sectionRow of sections) {
    if (!sectionRow.items.length) continue
    blocks.push(`<h3>${escapeHtml(sectionRow.label)}</h3>`)
    blocks.push(`<ul>${sectionRow.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`)
  }
  return blocks.join('\n')
}

async function fetchPage(sourceUrl, attempt = 1) {
  const url = `https://r.jina.ai/${sourceUrl}`
  try {
    const response = await fetch(url, {
      headers: { Accept: 'text/plain', 'User-Agent': 'RezervasyonYapHotelImport/1.0' },
      signal: AbortSignal.timeout(90_000),
    })
    const text = await response.text()
    if (response.ok && text.length > 200 && !/Access Denied/i.test(text.slice(0, 500))) return text
    throw new Error(`http_${response.status}`)
  } catch (error) {
    if (attempt >= 3) throw error
    await new Promise((resolve) => setTimeout(resolve, attempt * 1500))
    return fetchPage(sourceUrl, attempt + 1)
  }
}

async function mapPool(items, fn) {
  const output = new Array(items.length)
  let cursor = 0
  async function worker() {
    for (;;) {
      const index = cursor++
      if (index >= items.length) return
      output[index] = await fn(items[index], index)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker))
  return output
}

const urls = unique(
  fs
    .readFileSync(urlsPath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.replace(/#.*/, '').trim())
    .filter((line) => /^https:\/\/www\.tatilbudur\.com\//i.test(line)),
)
if (!urls.length) throw new Error(`URL listesi boş: ${urlsPath}`)

fs.mkdirSync(rawDir, { recursive: true })
const entries = await mapPool(urls, async (sourceUrl, index) => {
  const slug = slugFromUrl(sourceUrl)
  process.stdout.write(`[${index + 1}/${urls.length}] ${slug}\n`)
  try {
    const text = await fetchPage(sourceUrl)
    fs.writeFileSync(path.join(rawDir, `${slug}.md`), text)
    const title = extractTitle(text, slug)
    const boardType = detectBoardType(section(text, 'Konsept Özellikleri', ['Önemli Notlar', 'Kampanyalar']))
    const sections = [
      ['Genel Özellikler', ['Tesis Aktiviteleri', 'Havuz ve Plaj', 'Balayı', 'Konsept Özellikleri']],
      ['Tesis Aktiviteleri', ['Havuz ve Plaj', 'Balayı', 'Konsept Özellikleri']],
      ['Havuz ve Plaj', ['Balayı', 'Konsept Özellikleri', 'Önemli Notlar']],
      ['Balayı', ['Konsept Özellikleri', 'Önemli Notlar']],
    ].map(([label, ends]) => ({ label, items: bullets(section(text, label, ends)).slice(0, 40) }))
    const location = extractLocation(text)
    return {
      id: slug,
      slug,
      name: title,
      description: buildDescription(title, boardType, sections),
      url: sourceUrl,
      ...location,
      countryCode: 'TR',
      starRating: extractStarRating(text),
      adultsOnly: /\+16|\+18|Adults?\s*Only|Yetişkin Oteli/i.test(text),
      amenities: unique(sections.flatMap((row) => row.items)).slice(0, 80),
      images: extractImages(text),
      // Statik sayfa, tarihli canlı teklif/oda API'sini vermez. Eksik alanlar kalite kapısında kalır.
      rooms: [],
      currency: 'TRY',
      sourceFacts: {
        sourceUrl,
        capturedAt: new Date().toISOString(),
        captureMethod: 'public_page',
        boardType,
        visibleSections: sections,
        priceQuery: {
          checkIn: '2026-08-10',
          checkOut: '2026-08-13',
          adults: 2,
          children: 0,
          status: 'not_captured_from_public_static_page',
        },
        childPolicy: 'not_verified',
        rooms: 'not_verified',
      },
    }
  } catch (error) {
    return {
      id: slug,
      slug,
      name: slug,
      description: '',
      url: sourceUrl,
      city: 'Bodrum',
      district: 'Bodrum',
      provinceCity: 'Muğla',
      countryCode: 'TR',
      amenities: [],
      images: [],
      rooms: [],
      currency: 'TRY',
      sourceFacts: {
        sourceUrl,
        capturedAt: new Date().toISOString(),
        captureError: String(error?.message || error),
      },
    }
  }
})

const hotels = entries.filter((hotel) => hotel.name && hotel.description && hotel.images.length >= 2)
const rejected = entries
  .filter((hotel) => !hotels.includes(hotel))
  .map((hotel) => ({ slug: hotel.slug, name: hotel.name, imageCount: hotel.images.length }))
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, `${JSON.stringify({ hotels }, null, 2)}\n`)
console.log(JSON.stringify({
  requested: urls.length,
  importableDrafts: hotels.length,
  rejected,
  output: outPath,
  rawDir,
  pricing: 'not written; needs live offer capture',
}, null, 2))
