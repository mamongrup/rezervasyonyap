#!/usr/bin/env node
/**
 * Fethiye kuşağı otellerini aegeanhotels + bookeder aynalarından hasat eder.
 * TatilBudur/Etstur Cloudflare 403 olduğu için bu aynalar kullanılır.
 *
 *   node scripts/harvest-fethiye-belt-hotels.mjs
 *   node scripts/harvest-fethiye-belt-hotels.mjs --limit 2
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const MANIFEST = path.join(ROOT, 'deploy/data/tatilbudur/fethiye-belt-14.manifest.json')
const OUT = path.join(ROOT, 'deploy/data/tatilbudur/fethiye-belt-14.json')
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const TRY_PER_USD = Number(process.env.HARVEST_TRY_PER_USD || 40)
const LIMIT = (() => {
  const i = process.argv.indexOf('--limit')
  return i >= 0 ? Math.max(1, Number(process.argv[i + 1]) || 1) : Infinity
})()

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8' },
    redirect: 'follow',
    signal: AbortSignal.timeout(45_000),
  })
  if (!res.ok) throw new Error(`http_${res.status}:${url}`)
  return res.text()
}

function uniq(arr) {
  return [...new Set(arr.filter(Boolean))]
}

function slugify(value) {
  return String(value || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64)
}

/**
 * AegeanHotels CDN (`*.aegeanhotels.net`) tarayıcıdan sık 403 verir.
 * Aynı path Bookeder Photos/Big aynasında açık — galeri URL'lerini oraya yaz.
 */
function aegeanPathToBookeder(path) {
  const m = String(path).match(
    /^\/data\/Imgs\/(?:1920x1080w|OriginalPhoto)\/(\d+\/\d+\/\d+\/[^"' <>]+\.jpe?g)$/i,
  )
  if (!m) return null
  return `https://bookeder.com/data/Photos/Big/${m[1]}`
}

function extractAegeanImages(html, _baseUrl) {
  const paths = uniq(
    [...html.matchAll(/\/data\/Imgs\/(?:1920x1080w|OriginalPhoto)\/\d+\/\d+\/\d+\/[^"' <>]+\.JPEG/gi)].map(
      (m) => m[0],
    ),
  )
  return paths.map((p) => aegeanPathToBookeder(p)).filter(Boolean)
}

function parseJsonLdBlocks(html) {
  const out = []
  for (const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      out.push(JSON.parse(m[1]))
    } catch {
      /* ignore */
    }
  }
  return out
}

/**
 * Bookeder bazen haftalık/paket tutarını "US$ ve üzeri" olarak yazar (≥2000).
 * Bu durumda 5–7 geceye bölünmüş aday gecelik aralığa düşüyorsa onu kullan.
 */
function normalizeNightlyUsd(rawUsd) {
  if (rawUsd == null || !Number.isFinite(rawUsd)) return { usd: null, adjusted: false }
  if (rawUsd >= 80 && rawUsd < 2000) return { usd: rawUsd, adjusted: false }
  if (rawUsd >= 2000 && rawUsd <= 20_000) {
    for (const nights of [7, 6, 5]) {
      const per = rawUsd / nights
      if (per >= 180 && per <= 900) {
        return { usd: Math.round(per), adjusted: true, packageUsd: rawUsd, assumedNights: nights }
      }
    }
  }
  if (rawUsd >= 80 && rawUsd <= 5000) return { usd: rawUsd, adjusted: false }
  return { usd: null, adjusted: false }
}

function extractRoomsFromJsonLd(blocks) {
  const rooms = []
  for (const o of blocks) {
    for (const p of o.containsPlace || []) {
      const name = String(p?.name || '')
        .replace(/\\"/g, '"')
        .replace(/^"+|"+$/g, '')
        .replace(/\s+/g, ' ')
        .trim()
      if (!name) continue
      if (!/oda|suite|süit|villa|ev|room|penthouse|residence|deluxe|delüks|standart|family|aile|junior|king|twin|dubleks|premium|elegant/i.test(name)) {
        continue
      }
      if (/benzer|popüler|fotoğraf/i.test(name)) continue
      const capacity = Number(p?.bed?.value ?? p?.occupancy?.value ?? 0) || null
      const bedNote = String(p?.description || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 160)
      rooms.push({
        id: slugify(name) || `oda-${rooms.length + 1}`,
        name,
        capacity: capacity && capacity >= 1 && capacity <= 12 ? capacity : 2,
        bedNote: bedNote || null,
      })
    }
  }
  // Dedup by id, keep first
  const seen = new Set()
  return rooms.filter((r) => {
    if (seen.has(r.id)) return false
    seen.add(r.id)
    return true
  }).slice(0, 10)
}

function extractBookeder(html) {
  const blocks = parseJsonLdBlocks(html)
  const hotelLd = blocks.find((b) => String(b?.['@type'] || '').toLowerCase() === 'hotel') || {}

  const lat =
    Number(
      hotelLd?.geo?.latitude ||
        html.match(/property=["']og:latitude["'][^>]*content=["']([^"']+)/i)?.[1] ||
        html.match(/content=["']([^"']+)["'][^>]*property=["']og:latitude/i)?.[1] ||
        html.match(/class=["']latitude["'][^>]*>([^<]+)/i)?.[1] ||
        '',
    ) || null
  const lng =
    Number(
      hotelLd?.geo?.longitude ||
        html.match(/property=["']og:longitude["'][^>]*content=["']([^"']+)/i)?.[1] ||
        html.match(/content=["']([^"']+)["'][^>]*property=["']og:longitude/i)?.[1] ||
        html.match(/class=["']longitude["'][^>]*>([^<]+)/i)?.[1] ||
        '',
    ) || null

  const desc =
    hotelLd?.description ||
    html.match(/property=["']og:description["'][^>]*content=["']([^"']+)/i)?.[1] ||
    html.match(/name=["']description["'][^>]*content=["']([^"']+)/i)?.[1] ||
    ''
  const title =
    html.match(/property=["']og:title["'][^>]*content=["']([^"']+)/i)?.[1] ||
    html.match(/<title[^>]*>([^<]+)/i)?.[1] ||
    ''

  const titleUsdRaw =
    html.match(/<title[^>]*>[\s\S]*?(\d{2,5}(?:[.,]\d{1,2})?)\s*US\$\s*ve üzeri/i)?.[1] ||
    html.match(/(\d{2,5}(?:[.,]\d{1,2})?)\s*US\$\s*ve üzeri/i)?.[1] ||
    null
  let rawUsd = titleUsdRaw ? Number(String(titleUsdRaw).replace(',', '.')) : null
  const priceRange = String(hotelLd?.priceRange || '')
  const rangeMin = priceRange.match(/(\d+(?:[.,]\d+)?)\s*USD/i)?.[1]
  if ((rawUsd == null || !Number.isFinite(rawUsd)) && rangeMin) {
    rawUsd = Number(String(rangeMin).replace(',', '.'))
  }

  const normalized = normalizeNightlyUsd(rawUsd)
  const usdOk = normalized.usd

  let tryFloor = null
  const priceMatch =
    html.match(/(\d{1,3}(?:[.\s]\d{3})+|\d{3,6})\s*(?:TL|₺)/i) ||
    html.match(/(?:TL|₺)\s*(\d{1,3}(?:[.\s]\d{3})+|\d{3,6})/i)
  if (priceMatch) {
    const n = Number(String(priceMatch[1]).replace(/[.\s]/g, ''))
    if (Number.isFinite(n) && n >= 1500 && n <= 200_000) tryFloor = n
  }

  let minPrice = tryFloor
  let priceMeta = null
  if (minPrice == null && usdOk != null) {
    minPrice = Math.round(usdOk * TRY_PER_USD)
    priceMeta = {
      usdFloor: usdOk,
      rawUsdFloor: rawUsd,
      tryPerUsd: TRY_PER_USD,
      nightlyTry: minPrice,
      packageAdjusted: normalized.adjusted || false,
      ...(normalized.assumedNights ? { assumedNights: normalized.assumedNights, packageUsd: normalized.packageUsd } : {}),
    }
  } else if (minPrice != null) {
    priceMeta = { nightlyTry: minPrice, currency: 'TRY' }
  }

  const addressObj = hotelLd?.address || {}
  const address =
    [addressObj.streetAddress, addressObj.addressLocality, addressObj.addressRegion]
      .filter(Boolean)
      .join(', ') ||
    html.match(/Foça[^<,]{0,80}|Yanıklar[^<,]{0,80}|Ölüdeniz[^<,]{0,80}|Karaçulha[^<,]{0,80}|Kayaköy[^<,]{0,80}|Çalış[^<,]{0,80}|Tasyaka[^<,]{0,80}|Taşyaka[^<,]{0,80}/i)?.[0] ||
    ''

  const checkIn =
    String(hotelLd?.checkinTime || '').match(/(\d{1,2}:\d{2})/)?.[1] ||
    html.match(/Giriş[^0-9]{0,20}(\d{1,2}:\d{2})/i)?.[1] ||
    '14:00'
  const checkOut =
    String(hotelLd?.checkoutTime || '').match(/(\d{1,2}:\d{2})/)?.[1] ||
    html.match(/Çıkış[^0-9]{0,20}(\d{1,2}:\d{2})/i)?.[1] ||
    '12:00'
  const roomCount = Number(hotelLd?.numberOfRooms || html.match(/Oda sayısı:\s*(\d+)/i)?.[1] || '') || null
  const amenities = uniq(
    (hotelLd?.amenityFeature || [])
      .map((a) => String(a?.name || a?.value || '').trim())
      .filter((x) => x && x.length <= 80),
  ).slice(0, 40)

  return {
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    desc: String(desc).replace(/&amp;/g, '&').replace(/&#x27;/g, "'").trim(),
    title: String(title).replace(/\s+/g, ' ').trim(),
    minPrice,
    priceMeta,
    address: String(address).trim(),
    checkIn,
    checkOut,
    roomCount,
    rooms: extractRoomsFromJsonLd(blocks),
    amenities,
  }
}

function extractObiletImages(html) {
  return uniq(
    [...html.matchAll(/https:\/\/d3m404n3ahyqc3\.cloudfront\.net\/images\/product\/[^"' <>]+\.jpg/gi)].map(
      (m) => m[0],
    ),
  )
}

function extractObiletTryFloor(html) {
  const ms = [...html.matchAll(/(\d{1,3}(?:\.\d{3})+|\d{4,6})\s*TL/gi)].map((m) =>
    Number(String(m[1]).replace(/\./g, '')),
  )
  const ok = ms.filter((n) => n >= 1500 && n <= 200_000)
  return ok.length ? Math.min(...ok) : null
}

function extractBookederBigImages(html) {
  const paths = uniq(
    [...html.matchAll(/\/data\/Photos\/(?:Big|OriginalPhoto)\/\d+\/\d+\/\d+\/[^"' <>]+\.JPEG/gi)].map(
      (m) => m[0],
    ),
  )
  return paths.map((p) => `https://bookeder.com${p.replace('/OriginalPhoto/', '/Big/')}`)
}

function roomImagesFromGallery(images, roomName) {
  const token = slugify(roomName).split('-').filter((t) => t.length > 3).slice(0, 3)
  const roomish = images.filter((u) => {
    const f = u.toLowerCase()
    return (
      /room|beds|suite|oda|bedroom|interior|villa|penthouse/i.test(f) ||
      token.some((t) => f.includes(t))
    )
  })
  const pick = (roomish.length >= 3 ? roomish : images).slice(0, 8)
  return pick.length ? pick : images.slice(0, 4)
}

function editorialDescription(hotel, meta) {
  const adults = hotel.adultsOnly ? ' Yetişkinlere özel (16+) konsepti sunar.' : ''
  const loc = [hotel.district, hotel.city, hotel.provinceCity].filter(Boolean).join(', ')
  const bits = meta.desc
    ? `<p>${meta.desc.slice(0, 520)}</p>`
    : `<p>${hotel.name}, ${loc} bölgesinde ${hotel.boardType || 'her şey dahil'} konaklama sunan bir tesistir.${adults}</p>`
  const amenLis = (meta.amenities || []).slice(0, 12).map((a) => `<li>${a}</li>`).join('')
  const amenBlock = amenLis ? `<h2>Olanaklar</h2><ul>${amenLis}</ul>` : ''
  return `<section><h2>${hotel.name}</h2>${bits}<h2>Konum</h2><p>${loc}${meta.address ? ` — ${meta.address}` : ''}.</p><h2>Konaklama</h2><p>Konaklama ${hotel.boardType || 'Her Şey Dahil'} konseptiyle sunulur. Giriş ${meta.checkIn}, çıkış ${meta.checkOut}.${adults}</p>${amenBlock}</section>`
}

function amenitiesFor(hotel, metaAmenities) {
  const base = [
    hotel.boardType || 'Her Şey Dahil',
    'Açık yüzme havuzu',
    'Restoran',
    'Wi-Fi',
    'Ön büro',
    'Otopark',
  ]
  if (hotel.adultsOnly) base.push('Yetişkinlere özel (+16)')
  return uniq([...base, ...(metaAmenities || [])]).slice(0, 36)
}

function buildRooms(hotel, images, nightly, board, ldRooms) {
  const list = ldRooms.length
    ? ldRooms
    : [{ id: 'standart-oda', name: 'Standart Oda', capacity: 2, bedNote: null }]

  // Prefer a "standart / iki kişilik" room for the priced floor; others share gallery only.
  const pricedIdx = Math.max(
    0,
    list.findIndex((r) => /standart|iki kişilik|double|twin|elegant|deluxe beach|suite(?!.*aile)/i.test(r.name)),
  )

  return list.map((r, i) => {
    const imgs = roomImagesFromGallery(images, r.name)
    const features = ['Klima', 'Televizyon', 'Wi-Fi', 'Özel banyo', 'Duş']
    if (r.bedNote) features.unshift(r.bedNote)
    // Taban fiyat yalnızca referans odaya yazılır; diğer tiplere uydurma fiyat yok.
    const rates =
      nightly && i === pricedIdx
        ? [
            {
              validFrom: '2026-07-01',
              validTo: '2026-10-31',
              nightlyPrice: nightly,
              currency: 'TRY',
              boardType: board,
            },
          ]
        : []
    return {
      id: r.id || `oda-${i + 1}`,
      name: r.name,
      capacity: r.capacity || 2,
      boardType: board,
      image: imgs[0],
      images: imgs,
      features,
      rates,
    }
  })
}

async function harvestOne(hotel) {
  console.log(`[harvest] ${hotel.id}`)
  let images = []
  let meta = {
    lat: null,
    lng: null,
    desc: '',
    title: '',
    minPrice: null,
    priceMeta: null,
    address: '',
    checkIn: '14:00',
    checkOut: '12:00',
    roomCount: null,
    rooms: [],
    amenities: [],
  }

  if (hotel.aegean) {
    try {
      const html = await fetchText(hotel.aegean)
      images = extractAegeanImages(html, hotel.aegean)
      console.log(`  aegean images=${images.length}`)
    } catch (e) {
      console.warn(`  aegean FAIL ${e.message}`)
    }
  }

  if (hotel.bookeder) {
    try {
      const html = await fetchText(hotel.bookeder)
      meta = { ...meta, ...extractBookeder(html) }
      images = uniq([...images, ...extractBookederBigImages(html)])
      console.log(
        `  bookeder age rooms=${meta.rooms?.length || 0} lat=${meta.lat} lng=${meta.lng} minPrice=${meta.minPrice} images=${images.length}`,
      )
    } catch (e) {
      console.warn(`  bookeder FAIL ${e.message}`)
    }
  }

  if (hotel.obilet) {
    try {
      const html = await fetchText(hotel.obilet)
      const more = extractObiletImages(html)
      images = uniq([...images, ...more])
      const tryFloor = extractObiletTryFloor(html)
      if (tryFloor != null) {
        meta.minPrice = tryFloor
        meta.priceMeta = { nightlyTry: tryFloor, currency: 'TRY', source: 'obilet' }
      }
      console.log(`  obilet images=${images.length} tryFloor=${tryFloor}`)
    } catch (e) {
      console.warn(`  obilet FAIL ${e.message}`)
    }
  }

  // Manifest override (ör. Bookeder paket tutarını gecelik sanması)
  if (hotel.priceOverrideTry != null && Number(hotel.priceOverrideTry) > 0) {
    meta.minPrice = Math.round(Number(hotel.priceOverrideTry))
    meta.priceMeta = {
      nightlyTry: meta.minPrice,
      currency: 'TRY',
      source: 'manifest_override',
      note: hotel.priceOverrideNote || null,
    }
  } else if (hotel.priceOverrideUsd != null && Number(hotel.priceOverrideUsd) > 0) {
    const usd = Number(hotel.priceOverrideUsd)
    meta.minPrice = Math.round(usd * TRY_PER_USD)
    meta.priceMeta = {
      usdFloor: usd,
      tryPerUsd: TRY_PER_USD,
      nightlyTry: meta.minPrice,
      source: 'manifest_override',
      note: hotel.priceOverrideNote || null,
    }
  }

  if (images.length < 2) {
    throw new Error(`media_incomplete:${hotel.id}:images=${images.length}`)
  }

  // Cap gallery for feed size while keeping rich media
  images = images.slice(0, 120)

  const nightly = meta.minPrice && meta.minPrice >= 1000 ? meta.minPrice : null
  const board = hotel.boardType || 'Her Şey Dahil'
  const address =
    meta.address ||
    `${hotel.district || ''} ${hotel.city || ''}/${hotel.provinceCity || 'Muğla'}`.replace(/\s+/g, ' ').trim()

  const rooms = buildRooms(hotel, images, nightly, board, meta.rooms || [])

  return {
    id: hotel.id,
    name: hotel.name,
    slug: hotel.id,
    url: hotel.sourceUrl,
    officialUrl: hotel.aegean || hotel.bookeder || hotel.sourceUrl,
    countryCode: 'TR',
    city: hotel.city,
    district: hotel.district,
    provinceCity: hotel.provinceCity,
    address,
    lat: meta.lat,
    lng: meta.lng,
    currency: 'TRY',
    starRating: hotel.starRating || 5,
    checkIn: meta.checkIn,
    checkOut: meta.checkOut,
    description: editorialDescription(hotel, meta),
    amenities: amenitiesFor(hotel, meta.amenities),
    images,
    rooms,
    sourceFacts: {
      sourceUrl: hotel.sourceUrl,
      imageSource: hotel.aegean || hotel.obilet || hotel.bookeder,
      geoSource: hotel.bookeder,
      mealPlan: board,
      adultsOnly: Boolean(hotel.adultsOnly),
      roomCountApprox: meta.roomCount,
      priceSource: nightly
        ? meta.priceMeta?.source || 'bookeder_usd_floor'
        : 'pending',
      priceQuote: nightly
        ? {
            nightlyTry: nightly,
            boardType: board,
            ...(meta.priceMeta || {}),
            note:
              meta.priceMeta?.source === 'obilet'
                ? 'Obilet sayfasındaki TL taban fiyat; oda tipi ayrımı yok → taban fiyat tüm odalara yazıldı.'
                : meta.priceMeta?.source === 'manifest_override'
                  ? meta.priceMeta.note || 'Manifest fiyat override (Bookeder paket/hatalı taban).'
                  : meta.priceMeta?.packageAdjusted
                    ? `Bookeder paket tutarı (${meta.priceMeta.packageUsd} USD / ${meta.priceMeta.assumedNights} gece) geceliğe çevrildi × ${TRY_PER_USD} TRY.`
                    : `Bookeder USD taban × ${meta.priceMeta?.tryPerUsd || TRY_PER_USD} TRY (yaklaşık).`,
          }
        : {
            note: 'Canlı oda tipi fiyatı alınamadı (Etstur/TatilBudur Cloudflare). Panelden fiyat girilmeli.',
          },
      verifiedAt: new Date().toISOString().slice(0, 10),
    },
  }
}

async function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))
  const rows = manifest.hotels.slice(0, LIMIT)
  const hotels = []
  const failures = []
  for (const h of rows) {
    try {
      hotels.push(await harvestOne(h))
    } catch (e) {
      failures.push({ id: h.id, error: String(e.message || e) })
      console.error(`[FAIL] ${h.id}: ${e.message || e}`)
    }
  }
  const out = { hotels, harvestedAt: new Date().toISOString(), failures }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n')
  console.log(
    JSON.stringify(
      {
        out: OUT,
        ok: hotels.length,
        fail: failures.length,
        failures,
        summary: hotels.map((h) => ({
          id: h.id,
          images: h.images.length,
          rooms: h.rooms.length,
          price: h.rooms.find((r) => r.rates?.[0])?.rates?.[0]?.nightlyPrice ?? null,
          lat: h.lat,
          lng: h.lng,
          priceSource: h.sourceFacts.priceSource,
        })),
      },
      null,
      2,
    ),
  )
  if (!hotels.length) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
