#!/usr/bin/env node
/**
 * Tarayıcıda doğrulanan TatilBudur tekliflerini mevcut public-page feed'iyle birleştirir.
 *
 * Yalnız `totalPrice` kullanılır; WorldCard/kampanya fiyatı bu dosyaya girmemelidir.
 * Kaynak sorgu mutlaka 10–13 Ağustos / 2 yetişkin olmalıdır. Kullanıcının açık
 * talebi varsa `validFrom`/`validTo` ile hesaplanan gecelik fiyat daha geniş
 * sezona (örn. Ağustos–Eylül) uygulanabilir; kaynak sorgu snapshot'ta korunur.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const argv = process.argv.slice(2)
const valueAfter = (flag) => {
  const i = argv.indexOf(flag)
  return i >= 0 ? String(argv[i + 1] || '').trim() : ''
}
const feedPath = path.resolve(ROOT, valueAfter('--feed'))
const offersPath = path.resolve(ROOT, valueAfter('--offers'))
if (!valueAfter('--feed') || !valueAfter('--offers')) throw new Error('--feed ve --offers gerekli')

const feed = JSON.parse(fs.readFileSync(feedPath, 'utf8'))
const capture = JSON.parse(fs.readFileSync(offersPath, 'utf8'))
const search = capture.search || {}
if (
  search.checkIn !== '2026-08-10' ||
  search.checkOut !== '2026-08-13' ||
  Number(search.nights) !== 3 ||
  Number(search.adults) !== 2 ||
  ![0, 1].includes(Number(search.children)) ||
  search.currency !== 'TRY'
) {
  throw new Error('Teklif arama bağlamı 10–13 Ağustos 2026 / 2 yetişkin / 0 veya 1 çocuk / TRY olmalı')
}
const validFrom = String(search.validFrom || search.checkIn)
const validTo = String(search.validTo || search.checkOut)
if (!/^\d{4}-\d{2}-\d{2}$/.test(validFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(validTo)) {
  throw new Error('validFrom/validTo YYYY-MM-DD olmalı')
}

const slugify = (value) =>
  String(value || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const byUrl = new Map((feed.hotels || []).map((hotel) => [String(hotel.url || '').trim(), hotel]))
let applied = 0
const missing = []
for (const offerHotel of capture.hotels || []) {
  const hotel = byUrl.get(String(offerHotel.sourceUrl || '').trim())
  if (!hotel) {
    missing.push(offerHotel.sourceUrl)
    continue
  }
  const rooms = []
  for (const [index, room] of (offerHotel.rooms || []).entries()) {
    const total = Number(room.totalPrice)
    if (!Number.isFinite(total) || total <= 0) continue
    const nightly = Math.round((total / search.nights) * 100) / 100
    const boardType = String(room.boardType || '').trim()
    rooms.push({
      id: `${slugify(room.name)}-${slugify(boardType)}-${index + 1}`,
      name: String(room.name || '').trim(),
      capacity: Number(search.adults) + Number(search.children),
      unitCount: 1,
      boardType,
      image: '',
      images: [],
      features: [
        ...(Array.isArray(room.features) ? room.features : []),
        ...(room.size ? [room.size] : []),
        ...(room.childAdvantage ? [room.childAdvantage] : []),
      ].filter(Boolean),
      rates: [{
        validFrom,
        validTo,
        nightlyPrice: nightly,
        totalPrice: total,
        stayNights: search.nights,
        adults: search.adults,
        children: search.children,
        currency: search.currency,
        boardType,
        priceSource: 'visible_total',
        ...(room.availabilityNote ? { availabilityNote: room.availabilityNote } : {}),
      }],
    })
  }
  if (!rooms.length) continue
  hotel.rooms = rooms
  hotel.currency = search.currency
  hotel.minPrice = Math.min(...rooms.map((room) => room.rates[0].nightlyPrice))
  hotel.sourceFacts = {
    ...(hotel.sourceFacts || {}),
    priceQuery: { ...search, status: 'verified_visible_total' },
    priceCapture: {
      source: offerHotel.sourceUrl,
      hotelName: offerHotel.name,
      capturedAt: new Date().toISOString(),
      policy: search.pricePolicy,
    },
  }
  applied += 1
}

fs.writeFileSync(feedPath, `${JSON.stringify(feed, null, 2)}\n`)
console.log(JSON.stringify({
  feed: feedPath,
  offers: offersPath,
  applied,
  missing,
  unpriced: (feed.hotels || []).filter((hotel) => !(hotel.rooms || []).some((room) => (room.rates || []).length)).map((hotel) => hotel.slug),
}, null, 2))
