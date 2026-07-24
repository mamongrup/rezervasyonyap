#!/usr/bin/env node
/**
 * Fairy Stone Travel (Kapadokya) tur sayfalarını aktivite feed'ine dönüştürür.
 *
 *   node scripts/harvest-fairystone-activities.mjs
 *   node scripts/harvest-fairystone-activities.mjs --out deploy/data/fairystone/kapadokya-activities.json
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
function argValue(flag) {
  const i = process.argv.indexOf(flag)
  return i >= 0 ? String(process.argv[i + 1] || '').trim() : ''
}
const OUT = path.resolve(
  ROOT,
  argValue('--out') || 'deploy/data/fairystone/kapadokya-activities.json',
)
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

/** Kaynak URL + vitrin meta (süre, başlangıç, kapasite). Fiyat sayfadan Product JSON-LD / WooCommerce. */
const CATALOG = [
  {
    id: 'fs-kapadokya-fotograf-cekimleri',
    sourceUrl: 'https://fairystonetravel.com/tr/tour/kapadokya-fotograf-cekimleri/',
    slug: 'kapadokya-fotograf-cekimleri-fairy-stone',
    durationHours: 2,
    startTime: '09:00',
    capacity: 6,
    themeTags: ['photography', 'cappadocia'],
  },
  {
    id: 'fs-kapadokya-evlilik-teklifi',
    sourceUrl: 'https://fairystonetravel.com/tr/tour/kapadokya-evlilik-teklifi/',
    slug: 'kapadokya-evlilik-teklifi-fairy-stone',
    durationHours: 3,
    startTime: '08:00',
    capacity: 4,
    themeTags: ['romance', 'proposal', 'cappadocia'],
  },
  {
    id: 'fs-kapadokya-turk-gecesi',
    sourceUrl: 'https://fairystonetravel.com/tr/tour/kapadokya-turk-gecesi/',
    slug: 'kapadokya-turk-gecesi-fairy-stone',
    durationHours: 3.5,
    startTime: '19:30',
    capacity: 40,
    themeTags: ['nightlife', 'dinner', 'cappadocia'],
  },
  {
    id: 'fs-kapadokya-atv-turu',
    sourceUrl: 'https://fairystonetravel.com/tr/tour/kapadokya-atv-turu/',
    slug: 'kapadokya-atv-turu-fairy-stone',
    durationHours: 2,
    startTime: '10:00',
    capacity: 12,
    themeTags: ['adventure', 'atv', 'cappadocia'],
  },
  {
    id: 'fs-kapadokya-jeep-safari',
    sourceUrl: 'https://fairystonetravel.com/tr/tour/kapadokya-jeep-safari-turu/',
    slug: 'kapadokya-jeep-safari-fairy-stone',
    durationHours: 4,
    startTime: '09:00',
    capacity: 10,
    themeTags: ['adventure', 'safari', 'cappadocia'],
  },
  {
    id: 'fs-kapadokya-balon-turu',
    sourceUrl: 'https://fairystonetravel.com/tr/tour/kapadokya-balon-turu/',
    slug: 'kapadokya-balon-turu-fairy-stone',
    durationHours: 3,
    startTime: '05:00',
    capacity: 20,
    themeTags: ['balloon', 'sunrise', 'cappadocia'],
  },
  {
    id: 'fs-kapadokya-at-turu',
    sourceUrl: 'https://fairystonetravel.com/tr/tour/kapadokya-at-turu/',
    slug: 'kapadokya-at-turu-fairy-stone',
    durationHours: 2,
    startTime: '10:00',
    capacity: 8,
    themeTags: ['horse', 'nature', 'cappadocia'],
  },
  {
    id: 'fs-kirmizi-tur',
    sourceUrl: 'https://fairystonetravel.com/tr/tour/kirmizi-tur/',
    slug: 'kapadokya-kirmizi-tur-fairy-stone',
    durationHours: 8,
    startTime: '09:00',
    capacity: 16,
    themeTags: ['day_tour', 'cappadocia'],
    fullDay: true,
  },
  {
    id: 'fs-yesil-tur',
    sourceUrl: 'https://fairystonetravel.com/tr/tour/yesil-tur/',
    slug: 'kapadokya-yesil-tur-fairy-stone',
    durationHours: 8,
    startTime: '09:00',
    capacity: 16,
    themeTags: ['day_tour', 'cappadocia'],
    fullDay: true,
  },
  {
    id: 'fs-mavi-tur',
    sourceUrl: 'https://fairystonetravel.com/tr/tour/mavi-tur/',
    slug: 'kapadokya-mavi-tur-fairy-stone',
    durationHours: 8,
    startTime: '09:00',
    capacity: 16,
    themeTags: ['day_tour', 'cappadocia'],
    fullDay: true,
  },
]

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8' },
    redirect: 'follow',
    signal: AbortSignal.timeout(45_000),
  })
  if (!res.ok) throw new Error(`http_${res.status}:${url}`)
  return res.text()
}

function parseJsonLdProduct(html) {
  for (const m of html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      const data = JSON.parse(m[1])
      const list = Array.isArray(data) ? data : [data]
      for (const d of list) {
        if (d && typeof d === 'object' && d['@type'] === 'Product') return d
      }
    } catch {
      /* ignore */
    }
  }
  return null
}

function uniq(arr) {
  return [...new Set(arr.filter(Boolean))]
}

function galleryFromHtml(html, featured) {
  const found = [
    ...html.matchAll(
      /https:\/\/fairystonetravel\.com\/wp-content\/uploads\/[^"' <>\s]+\.(?:jpe?g|png|webp)/gi,
    ),
  ].map((m) => m[0].split('?')[0])
  const filtered = found.filter(
    (u) => !/-\d{2,4}x\d{2,4}\./i.test(u) && !/thumbnail|icon|logo/i.test(u),
  )
  const out = uniq([featured, ...filtered]).slice(0, 24)
  return out
}

function wooAmounts(html) {
  const amounts = [
    ...html.matchAll(/woocommerce-Price-amount[^>]*>\s*(?:<[^>]+>\s*)*([\d.,]+)/gi),
  ].map((m) => m[1])
  const nums = []
  for (const a of amounts) {
    const n =
      a.includes(',') && !a.includes('.')
        ? Number(a.replace(/\./g, '').replace(',', '.'))
        : Number(a.replace(/,/g, ''))
    if (Number.isFinite(n) && n >= 5 && n <= 5000) nums.push(n)
  }
  return nums
}

function cleanLines(text) {
  return String(text || '')
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.replace(/^[\t •\-]+/, '').trim())
    .filter((l) => l && l.length > 1 && l !== '&nbsp;')
}

function sectionItems(raw, headerRe) {
  const text = String(raw || '').replace(/\r/g, '')
  const m = text.match(headerRe)
  if (!m) return []
  const after = text.slice(m.index + m[0].length)
  const stop = after.search(
    /\n(?:Lokasyon|Tura D[aâ]hil|Menüye|Program|Kapadokya|Fairy|&nbsp;)/i,
  )
  const block = stop >= 0 ? after.slice(0, stop) : after.slice(0, 800)
  return cleanLines(block)
    .filter((l) => !/^(Lokasyon|Tura|Menü|Program|&nbsp;|nlar|lanlar|Olanlar)/i.test(l))
    .filter((l) => l.length >= 3 && l.length <= 120)
    .slice(0, 16)
}

function valleyStops(desc) {
  return cleanLines(desc)
    .filter((l) => l.length >= 4 && l.length <= 55)
    .filter((l) => !/[.!?]/.test(l))
    .filter((l) => !/&amp;nbsp;|klimalı|öğle|müze|profesyonel|hizmet|alkollü|bahşiş/i.test(l))
    .filter((l) =>
      /vadi|valley|paşabağ|uçhisar|avanos|ihlara|kaymaklı|güvercin|kızıl|göreme|selime|belisırma|devrent|ürgüp|üçgüzeller|nazar|güllü|görçeli|panorama/i.test(
        l,
      ),
    )
    .slice(0, 10)
}

function refineStops(list) {
  return (list || [])
    .map((l) =>
      String(l)
        .replace(/&amp;nbsp;/gi, '')
        .replace(/&nbsp;/gi, '')
        .trim(),
    )
    .filter((l) => l.length >= 3 && l.length <= 100)
    .filter(
      (l) =>
        !/klima|ogle\s*yemek|müze|muze|profesyonel|hizmet\s*ücret|alkoll|bahşiş|bahsis|kişisel|kisisel|sigara|nbsp/i.test(
          l,
        ),
    )
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function editorialHtml({ name, paragraphs, locations, includes, excludes, priceEur }) {
  const paras = paragraphs
    .slice(0, 6)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join('')
  const loc =
    locations.length > 0
      ? `<h2>Rota / Lokasyonlar</h2><ul>${locations.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`
      : ''
  const inc =
    includes.length > 0
      ? `<h2>Dahil Olanlar</h2><ul>${includes.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`
      : ''
  const exc =
    excludes.length > 0
      ? `<h2>Dahil Olmayanlar</h2><ul>${excludes.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`
      : ''
  const priceNote = priceEur
    ? `<h2>Fiyat</h2><p>Yetişkin fiyatı <strong>${priceEur} EUR</strong> üzerinden başlar (Fairy Stone Travel güncel liste). Sezon ve paket seçimine göre değişebilir.</p>`
    : ''
  return `<section><h2>${escapeHtml(name)}</h2>${paras}${loc}${inc}${exc}${priceNote}<h2>Önemli Bilgi</h2><p>Rezervasyon ve operasyon Fairy Stone Travel / Cappadocia Fairy Stone Travel üzerinden yürütülür. Hava koşulları veya resmi kısıtlar nedeniyle program güncellenebilir.</p></section>`
}

function splitBody(desc) {
  const text = String(desc || '').replace(/\r/g, '\n')
  const chunks = text
    .split(/\n{2,}/)
    .map((c) => c.replace(/\s+/g, ' ').trim())
    .filter((c) => c.length > 40)
    .filter(
      (c) =>
        !/^(Lokasyon|Tura D|Menüye D|Program)/i.test(c) &&
        !/^Klimalı ve Sigara/i.test(c),
    )
  return chunks.slice(0, 8)
}

async function harvestOne(row) {
  console.log(`[harvest] ${row.id}`)
  const html = await fetchText(row.sourceUrl)
  const product = parseJsonLdProduct(html) || {}
  const offersRaw = product.offers
  const offer = Array.isArray(offersRaw) ? offersRaw[0] : offersRaw || {}
  let priceEur = Number(offer?.price || offer?.priceSpecification?.price || 0) || null
  const currency = String(
    offer?.priceCurrency || offer?.priceSpecification?.priceCurrency || 'EUR',
  )
    .trim()
    .toUpperCase()
  const woo = wooAmounts(html)
  if (priceEur == null && woo.length) priceEur = woo[0]

  const featured =
    (typeof product.image === 'string' ? product.image : null) ||
    html.match(/property=["']og:image["'][^>]*content=["']([^"']+)/i)?.[1] ||
    null
  const images = galleryFromHtml(html, featured)
  if (images.length < 1) throw new Error(`media_incomplete:${row.id}`)

  const desc = String(product.description || '')
  let locations = refineStops(sectionItems(desc, /Lokasyonalar?\s*\n*/i))
  let includes = refineStops(
    sectionItems(
      desc,
      /Tura D[aâ]hil O(?:lanlar|Ianlar)?\s*\n*|Menüye D[aâ]hil Olanlar\s*\n*/i,
    ),
  )
  // Türk gecesi menü satırları uzun olabilir
  if (!includes.length) {
    includes = sectionItems(desc, /Menüye D[aâ]hil Olanlar\s*\n*/i)
      .filter((l) => l.length <= 100)
      .slice(0, 12)
  }
  let excludes = refineStops(sectionItems(desc, /Tura D[aâ]hil Olmayanlar\s*\n*/i))
  const excludeLike = /alkollü|kişisel gider|bahşiş/i
  if (includes.some((x) => excludeLike.test(x)) && excludes.length === 0) {
    excludes = includes.filter((x) => excludeLike.test(x))
    includes = includes.filter((x) => !excludeLike.test(x))
  }
  if (!locations.length) {
    locations = valleyStops(desc)
  }

  const name = String(product.name || row.id).trim()
  const paragraphs = splitBody(desc)
  const description = editorialHtml({
    name,
    paragraphs,
    locations,
    includes,
    excludes,
    priceEur,
  })

  if (priceEur == null || !(priceEur > 0)) throw new Error(`price_missing:${row.id}`)

  return {
    id: row.id,
    slug: row.slug,
    name,
    url: row.sourceUrl,
    sku: product.sku != null ? String(product.sku) : null,
    countryCode: 'TR',
    city: 'Göreme',
    district: 'Kapadokya',
    provinceCity: 'Nevşehir',
    locationName: 'Göreme, Kapadokya, Nevşehir',
    address: 'Göreme, Nevşehir, Türkiye',
    lat: 38.6431,
    lng: 34.8289,
    currency: currency === 'EUR' ? 'EUR' : currency || 'EUR',
    adultPrice: priceEur,
    childPrice: null,
    durationHours: row.durationHours,
    startTime: row.startTime,
    capacity: row.capacity,
    fullDay: Boolean(row.fullDay || row.durationHours >= 8),
    themeTags: row.themeTags || [],
    locations,
    includes,
    excludes,
    description,
    images,
    sourceFacts: {
      provider: 'fairystone',
      sourceUrl: row.sourceUrl,
      priceEur,
      currency,
      wooPricesSample: woo.slice(0, 8),
      verifiedAt: new Date().toISOString().slice(0, 10),
    },
  }
}

async function main() {
  const activities = []
  const failures = []
  for (const row of CATALOG) {
    try {
      activities.push(await harvestOne(row))
    } catch (e) {
      failures.push({ id: row.id, error: String(e.message || e) })
      console.error(`[FAIL] ${row.id}: ${e.message || e}`)
    }
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  const out = {
    provider: 'fairystone',
    harvestedAt: new Date().toISOString(),
    note: 'Kapadokya Fairy Stone Travel aktiviteleri. Fiyatlar EUR (kaynak Product/WooCommerce).',
    activities,
    failures,
  }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n')
  console.log(
    JSON.stringify(
      {
        out: OUT,
        ok: activities.length,
        fail: failures.length,
        failures,
        summary: activities.map((a) => ({
          id: a.id,
          priceEur: a.adultPrice,
          images: a.images.length,
          durationHours: a.durationHours,
        })),
      },
      null,
      2,
    ),
  )
  if (!activities.length) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
