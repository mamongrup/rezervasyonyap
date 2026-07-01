/**
 * Gezinomi otel public API denemesi.
 *
 * DB'ye yazmaz; autocomplete ile otel adaylarini bulur, HotelDetail'dan
 * zengin icerik alanlarini okuyup kisa rapor basar.
 *
 *   node scripts/probe-gezinomi-hotels.mjs --queries alanya,belek,bodrum --limit 5
 *   node scripts/probe-gezinomi-hotels.mjs --query rixos --json
 */

import { gezinomiPictureDownloadUrls } from './lib/gezinomi-gallery.mjs'

const AUTOCOMPLETE_API = 'https://apigezinomi.gezinomi.com/api/Hotel/SearchAutoComplete'
const DETAIL_API = 'https://apigezinomi.gezinomi.com/api/Hotel/GetHotelDetail'

const args = process.argv.slice(2)
const JSON_OUT = args.includes('--json')

function argValue(name, fallback = '') {
  const idx = args.indexOf(name)
  return idx >= 0 ? String(args[idx + 1] || '') : fallback
}

const queryArg = argValue('--query') || argValue('--queries')
const QUERIES = queryArg
  ? queryArg.split(',').map((x) => x.trim()).filter(Boolean)
  : ['alanya', 'belek', 'side', 'kemer', 'bodrum', 'marmaris', 'istanbul', 'kibris', 'limak', 'rixos']
const LIMIT = Number(argValue('--limit', '20')) || 20
const DETAIL_LIMIT = Number(argValue('--detail-limit', String(LIMIT))) || LIMIT

const HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
  Referer: 'https://www.gezinomi.com/',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36',
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    // Keep the original response text for diagnostics.
  }
  if (!res.ok) {
    throw new Error(`${url} HTTP ${res.status}: ${text.slice(0, 160)}`)
  }
  return json
}

function hotelPath(row) {
  const slug = String(row.url || '').replace(/^\/+/, '').trim()
  const route = String(row.routeLink || '').replace(/^\/+|\/+$/g, '').trim()
  if (!slug) return ''
  if (!route) return `/${slug}`
  return `/${route}/${slug}`.replace(/\/+/g, '/')
}

async function searchHotels(query) {
  const data = await postJson(AUTOCOMPLETE_API, { Query: query })
  const rows = Array.isArray(data?.data) ? data.data : []
  return rows.filter((row) => row.resultType === 'Otel' && row.id && row.url)
}

async function fetchHotelDetail(row) {
  const path = hotelPath(row)
  const data = await postJson(DETAIL_API, {
    HotelId: row.id,
    Link: String(row.url || '').replace(/^\/+/, ''),
    Path: path,
  })
  return data?.data || null
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

function summarizeDetail(row, detail) {
  const pictures = Array.isArray(detail?.pictures) ? detail.pictures : []
  const descriptions = Array.isArray(detail?.descriptions) ? detail.descriptions : []
  const properties = Array.isArray(detail?.propertyList) ? detail.propertyList : []
  const prominent = Array.isArray(detail?.hotelPropertyProminentCacheModels)
    ? detail.hotelPropertyProminentCacheModels
    : []
  const rooms = Array.isArray(detail?.hotelRoomCacheModels) ? detail.hotelRoomCacheModels : []
  const categories = Array.isArray(detail?.hotelCategories) ? detail.hotelCategories : []
  const firstPictureName = pictures.find((p) => p?.name)?.name || ''
  const firstDescription = stripHtml(descriptions.find((d) => d?.text)?.text || '')

  return {
    id: row.id,
    name: detail?.hotelName || row.text,
    slug: String(row.url || '').replace(/^\/+/, ''),
    path: hotelPath(row),
    location: row.location || detail?.hotelLocation || '',
    lat: detail?.latitude || null,
    lon: detail?.longitude || null,
    productId: detail?.productId || null,
    pictures: pictures.length,
    firstImage: firstPictureName ? gezinomiPictureDownloadUrls(firstPictureName)[0] : '',
    descriptions: descriptions.length,
    descriptionSample: firstDescription.slice(0, 220),
    properties: properties.length,
    prominent: prominent.map((x) => x.description).filter(Boolean).slice(0, 8),
    categories: categories.map((x) => x.hotelCategoryName).filter(Boolean).slice(0, 8),
    rooms: rooms.length,
    roomSamples: rooms.map((x) => x.roomName).filter(Boolean).slice(0, 5),
    metaTitle: detail?.metaTitle || '',
    documentNo: detail?.documentNo || '',
  }
}

function uniqueById(rows) {
  const seen = new Set()
  const out = []
  for (const row of rows) {
    const key = String(row.id)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(row)
  }
  return out
}

async function main() {
  const candidates = []
  const queryStats = []

  for (const query of QUERIES) {
    const hotels = await searchHotels(query)
    queryStats.push({ query, hotels: hotels.length })
    candidates.push(...hotels)
    await sleep(150)
  }

  const hotels = uniqueById(candidates).slice(0, LIMIT)
  const summaries = []
  const errors = []

  for (const row of hotels.slice(0, DETAIL_LIMIT)) {
    try {
      const detail = await fetchHotelDetail(row)
      summaries.push(summarizeDetail(row, detail))
    } catch (e) {
      errors.push({ id: row.id, name: row.text, error: e.message })
    }
    await sleep(250)
  }

  const report = {
    queries: queryStats,
    uniqueHotelsFound: uniqueById(candidates).length,
    detailFetched: summaries.length,
    withPictures: summaries.filter((x) => x.pictures > 0).length,
    withDescriptions: summaries.filter((x) => x.descriptions > 0).length,
    withRooms: summaries.filter((x) => x.rooms > 0).length,
    withCoordinates: summaries.filter((x) => x.lat && x.lon).length,
    errors,
    samples: summaries,
  }

  if (JSON_OUT) {
    console.log(JSON.stringify(report, null, 2))
    return
  }

  console.log(`Gezinomi hotel probe — queries=${QUERIES.join(', ')} limit=${LIMIT}`)
  console.log('Query hits:')
  for (const stat of queryStats) console.log(`  ${stat.query}: ${stat.hotels} otel`)
  console.log('')
  console.log(`Unique hotel candidates: ${report.uniqueHotelsFound}`)
  console.log(`Details fetched: ${report.detailFetched}`)
  console.log(`With pictures/descriptions/rooms/coords: ${report.withPictures}/${report.withDescriptions}/${report.withRooms}/${report.withCoordinates}`)
  if (errors.length) console.log(`Errors: ${errors.length}`)
  console.log('')

  for (const sample of summaries.slice(0, 8)) {
    console.log(`- ${sample.name} (#${sample.id})`)
    console.log(`  path: ${sample.path}`)
    console.log(`  location: ${sample.location}${sample.lat && sample.lon ? ` (${sample.lat}, ${sample.lon})` : ''}`)
    console.log(`  pictures=${sample.pictures}, descriptions=${sample.descriptions}, rooms=${sample.rooms}, properties=${sample.properties}`)
    if (sample.categories.length) console.log(`  categories: ${sample.categories.join(', ')}`)
    if (sample.prominent.length) console.log(`  prominent: ${sample.prominent.join(', ')}`)
    if (sample.roomSamples.length) console.log(`  rooms: ${sample.roomSamples.join(', ')}`)
    if (sample.firstImage) console.log(`  first image: ${sample.firstImage}`)
    if (sample.descriptionSample) console.log(`  desc: ${sample.descriptionSample}`)
    console.log('')
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

main().catch((e) => {
  console.error(e.stack || e.message)
  process.exit(1)
})
