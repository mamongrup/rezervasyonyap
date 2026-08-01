#!/usr/bin/env node
/**
 * Tarayıcıyla doğrulanmış TatilBudur otel yakalamasını izinli dosya feed'ine çevirir.
 *
 * Fiyat kuralı:
 * - Yalnızca oda bloğunda "Toplam Fiyat" ve "Rezervasyon Yap" birlikte varsa kullanılır.
 * - İndirimli/güncel toplam, görünen fiyatların sonuncusudur.
 * - Katalog gecelik fiyatı, toplam tutarın görünen gece sayısına bölünmesiyle hesaplanır.
 * - "Sizi Arayalım" veya müsait değil durumuna fiyat yazılmaz.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const input = path.resolve(process.argv[2] || path.join(ROOT, 'backups', 'tatilbudur-current-capture-2026-07-27.json'))
const output = path.resolve(process.argv[3] || path.join(ROOT, 'backups', 'tatilbudur-current-feed-2026-07-27.json'))

const capture = JSON.parse(fs.readFileSync(input, 'utf8'))

function clean(value) {
  return String(value || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
}

function slugFromUrl(value) {
  try { return new URL(value).pathname.replace(/^\/|\/$/g, '') } catch { return '' }
}

function uniqueImages(images) {
  const seen = new Set()
  const rows = []
  for (const raw of images || []) {
    const url = String(raw || '').replace(/^\/\//, 'https://')
    if (!/^https:\/\/productcdn\.tatilbudur\.com\/Otel\//i.test(url)) continue
    const key = url.replace(/[?#].*$/, '').toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    rows.push(url)
  }
  return rows
}

function priceNumber(value) {
  const raw = clean(value).replace(/\s*(?:TL|₺)\s*$/i, '')
  const normalized = raw.includes(',')
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw.replace(/\./g, '')
  const number = Number(normalized.replace(/[^\d.]/g, ''))
  return Number.isFinite(number) && number > 0 ? number : null
}

function boardType(text) {
  const options = [
    'Alkolsüz Her Şey Dahil', 'Ultra Her Şey Dahil', 'Her Şey Dahil',
    'Tam Pansiyon Plus', 'Tam Pansiyon', 'Yarım Pansiyon Plus',
    'Yarım Pansiyon', 'Oda Kahvaltı', 'Sadece Oda',
  ]
  return options.find((item) => clean(text).toLocaleLowerCase('tr-TR').includes(item.toLocaleLowerCase('tr-TR'))) || ''
}

function currentRate(room) {
  const text = clean(room.text)
  if (room.status !== 'available' || !/Toplam Fiyat/i.test(text) || !/Rezervasyon Yap/i.test(text)) return []
  const nights = Number((text.match(/(\d+)\s+Gece/i) || [])[1] || 0)
  const prices = (room.price_texts || []).map(priceNumber).filter(Boolean)
  const total = prices.at(-1)
  if (!total || !nights) return []
  return [{
    validFrom: '2026-07-27',
    validTo: '2026-08-01',
    nightlyPrice: Math.round((total / nights) * 100) / 100,
    totalPrice: total,
    stayNights: nights,
    adults: 2,
    currency: 'TRY',
    boardType: boardType(text),
  }]
}

function roomFeatures(text) {
  const result = []
  const size = clean(text).match(/(\d{1,3})\s*m2/i)
  if (size) result.push(`${size[1]} m²`)
  for (const name of ['Balkon', 'Banyo', 'Banyoda Telefon', 'Duşakabin', 'Ara Kapılı 2 Oda', '2 Ayrı Banyo', 'Çay - Kahve Seti']) {
    if (clean(text).toLocaleLowerCase('tr-TR').includes(name.toLocaleLowerCase('tr-TR'))) result.push(name)
  }
  return [...new Set(result)]
}

function paragraphs(text) {
  return String(text || '').split(/\n\s*\n+/).map(clean).filter((item) => item.length >= 15)
}

function escapeHtml(value) {
  return clean(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function editorialHtml(hotel) {
  const sections = hotel.feature_sections || []
  const labels = ['Genel Bakış', 'Aktiviteler', 'Havuz ve Plaj', 'Balayı Ayrıcalıkları', 'Yeme İçme Konsepti', 'Odalar']
  const blocks = [
    `<p><strong>${escapeHtml(hotel.name)}</strong>, TatilBudur tesis sayfasında yer alan güncel tesis bilgileri temel alınarak hazırlanmıştır. Aşağıdaki hizmetlerin tarih ve saatleri tesis koşullarına göre değişebilir.</p>`,
  ]
  sections.slice(0, 6).forEach((section, index) => {
    const items = paragraphs(section.text)
    if (!items.length) return
    blocks.push(`<h2>${labels[index]}</h2>`)
    blocks.push(...items.map((item) => `<p>${escapeHtml(item)}</p>`))
  })
  return blocks.join('\n')
}

function locationFrom(hotel) {
  const address = clean(hotel.address)
  const province = ['Antalya', 'Muğla', 'İzmir'].find((name) => new RegExp(name, 'i').test(address)) || ''
  const pathParts = (hotel.breadcrumbs || []).filter((x) => / Otelleri$/i.test(clean(x))).map((x) => clean(x).replace(/ Otelleri$/i, ''))
  const provinceIndex = pathParts.findIndex((x) => x === province)
  const scoped = provinceIndex >= 0 ? pathParts.slice(provinceIndex, provinceIndex + 3) : []
  return { provinceCity: province || scoped[0] || '', city: scoped[1] || '', district: scoped[2] || '' }
}

const hotels = (capture.hotels || []).filter((hotel) => hotel && !hotel.error && hotel.name).map((hotel) => {
  const slug = slugFromUrl(hotel.canonical || hotel.url)
  const location = locationFrom(hotel)
  const images = uniqueImages(hotel.gallery)
  const rooms = (hotel.rooms || []).map((room, index) => {
    const roomImages = uniqueImages(room.images)
    return {
      id: room.id || `${slug}-room-${index + 1}`,
      name: clean(room.name),
      boardType: boardType(room.text),
      image: roomImages[0] || '',
      images: roomImages,
      features: roomFeatures(room.text),
      rates: currentRate(room),
    }
  })
  return {
    id: slug,
    slug,
    name: clean(hotel.name),
    description: editorialHtml(hotel),
    url: hotel.canonical || hotel.url,
    address: clean(hotel.address),
    ...location,
    countryCode: 'TR',
    guestScore: Number(hotel.score || 0) || null,
    currency: 'TRY',
    adultsOnly: /\+16|Adults Only/i.test(hotel.name),
    amenities: [],
    images,
    rooms,
    sourceFacts: {
      capturedAt: hotel.captured_at,
      searchContext: hotel.search_context,
      currentPricePolicy: 'visible_discounted_total_divided_by_visible_nights',
      unavailableRooms: rooms.filter((room) => room.rates.length === 0).map((room) => room.name),
    },
  }
})

fs.writeFileSync(output, `${JSON.stringify({ hotels }, null, 2)}\n`)
console.log(JSON.stringify({
  input,
  output,
  hotels: hotels.length,
  rooms: hotels.reduce((sum, hotel) => sum + hotel.rooms.length, 0),
  pricedRooms: hotels.reduce((sum, hotel) => sum + hotel.rooms.filter((room) => room.rates.length).length, 0),
  hotelsWithCurrentPrice: hotels.filter((hotel) => hotel.rooms.some((room) => room.rates.length)).map((hotel) => hotel.name),
  roomlessHotels: hotels.filter((hotel) => hotel.rooms.length === 0).map((hotel) => hotel.name),
}, null, 2))
