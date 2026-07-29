#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const input = path.resolve(process.argv[2] || path.join(ROOT, 'backups', 'tatilbudur-ege-capture-2026-07-29.json'))
const output = path.resolve(process.argv[3] || path.join(ROOT, 'backups', 'tatilbudur-ege-feed-2026-07-29.json'))
const capture = JSON.parse(fs.readFileSync(input, 'utf8'))

const clean = (value) => String(value || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
const esc = (value) => clean(value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function slugFromUrl(value) {
  try { return new URL(value).pathname.replace(/^\/|\/$/g, '') } catch { return '' }
}

function uniqueImages(values) {
  const seen = new Set()
  const result = []
  for (const raw of values || []) {
    const url = String(raw || '').replace(/^\/\//, 'https://').replace(/[\"');]+$/, '')
    if (!/^https:\/\/(?:productcdn\.tatilbudur\.com|ucdn\.tatilbudur\.net)\/Otel\//i.test(url)) continue
    const key = url.replace(/[?#].*$/, '').toLocaleLowerCase('en')
    if (seen.has(key)) continue
    seen.add(key)
    result.push(url)
  }
  return result
}

function priceNumber(value) {
  const normalized = clean(value).replace(/\s*(?:TL|₺)\s*$/i, '').replace(/\./g, '').replace(',', '.')
  const number = Number(normalized.replace(/[^\d.]/g, ''))
  return Number.isFinite(number) && number > 0 ? number : null
}

function currentRates(room) {
  const text = clean(room.text)
  if (room.status !== 'available' || !/Toplam Fiyat/i.test(text) || !/Rezervasyon Yap/i.test(text)) return []
  const nights = Number((text.match(/(\d+)\s+Gece/i) || [])[1] || 0)
  const total = (room.price_texts || []).map(priceNumber).filter(Boolean).at(-1)
  if (!nights || !total) return []
  return [{
    validFrom: '2026-08-01',
    validTo: '2026-08-08',
    nightlyPrice: Math.round(total / nights * 100) / 100,
    totalPrice: total,
    stayNights: nights,
    adults: 2,
    currency: 'TRY',
    boardType: /Oda Kahvaltı/i.test(text) ? 'Oda Kahvaltı' : '',
  }]
}

function location(hotel) {
  const crumbs = (hotel.breadcrumbs || []).map((x) => clean(x).replace(/ Otelleri$/i, ''))
  const knownProvinces = ['İzmir', 'Muğla', 'Mersin', 'Aydın', 'Antalya']
  const provinceIndex = crumbs.findIndex((x) => knownProvinces.includes(x))
  const scoped = provinceIndex >= 0 ? crumbs.slice(provinceIndex, provinceIndex + 3) : crumbs
  const provinceCity = scoped[0]
    || knownProvinces.find((province) => clean(hotel.address).toLocaleLowerCase('tr-TR')
      .includes(province.toLocaleLowerCase('tr-TR'))) || ''
  return {
    provinceCity,
    city: scoped[1] || '',
    district: scoped[2] || '',
  }
}

function sectionData(hotel) {
  return (hotel.tabs || []).map((tab) => ({
    title: clean(tab.title || tab.text?.split('\n')[0]),
    items: [...new Set((tab.items || []).map(clean).filter(Boolean))],
    text: clean(tab.text),
  })).filter((section) => section.title && (section.items.length || section.text))
}

function trDescription(hotel, sections, rooms, loc) {
  const blocks = [
    `<h2>${esc(hotel.name)} Hakkında</h2>`,
    `<p><strong>${esc(hotel.name)}</strong>, ${esc(loc.provinceCity || 'Türkiye')} bölgesinde konaklama arayan misafirler için tesisin doğrulanmış güncel bilgileriyle sunulur.</p>`,
  ]
  for (const section of sections) {
    if (/giriş|çıkış|evcil|sigara/i.test(section.title)) continue
    blocks.push(`<h2>${esc(section.title)}</h2>`)
    if (section.items.length) blocks.push(`<ul>${section.items.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>`)
    else if (section.text && section.text !== section.title) blocks.push(`<p>${esc(section.text.replace(section.title, ''))}</p>`)
  }
  if (rooms.length) {
    blocks.push('<h2>Oda Tipleri</h2>')
    blocks.push(`<ul>${rooms.map((room) => `<li>${esc(room.name)}</li>`).join('')}</ul>`)
  }
  return blocks.join('\n')
}

const localeCopy = {
  en: { about: 'About', intro: 'is presented with verified, current property information for stays in Türkiye.', facilities: 'Facilities and Services', rooms: 'Room Types', location: 'Location', photo: 'The gallery contains provider-supplied property photographs.' },
  de: { about: 'Über', intro: 'wird mit geprüften, aktuellen Unterkunftsinformationen für Aufenthalte in der Türkei vorgestellt.', facilities: 'Ausstattung und Service', rooms: 'Zimmertypen', location: 'Lage', photo: 'Die Galerie enthält vom Anbieter bereitgestellte Objektfotos.' },
  ru: { about: 'Об отеле', intro: 'представлен с проверенной актуальной информацией для проживания в Турции.', facilities: 'Удобства и услуги', rooms: 'Типы номеров', location: 'Расположение', photo: 'В галерее размещены фотографии объекта, предоставленные поставщиком.' },
  zh: { about: '酒店简介', intro: '提供经核实的最新住宿信息，适合计划在土耳其入住的旅客参考。', facilities: '设施与服务', rooms: '房型', location: '位置', photo: '图库包含供应商提供的酒店实景照片。' },
  fr: { about: 'À propos de', intro: 'est présenté avec des informations vérifiées et à jour pour un séjour en Turquie.', facilities: 'Équipements et services', rooms: 'Types de chambres', location: 'Emplacement', photo: 'La galerie contient les photos de l’établissement fournies par le prestataire.' },
}

function localizedDescription(code, hotel, sections, rooms, loc, imageCount) {
  const copy = localeCopy[code]
  const facilityCount = new Set(sections.flatMap((section) => section.items)).size
  const roomList = rooms.map((room) => esc(room.name)).join(', ')
  return [
    `<h2>${esc(copy.about)} ${esc(hotel.name)}</h2>`,
    `<p><strong>${esc(hotel.name)}</strong> ${esc(copy.intro)}</p>`,
    `<h2>${esc(copy.location)}</h2>`,
    `<p>${esc([loc.district, loc.city, loc.provinceCity].filter(Boolean).join(', '))}</p>`,
    `<h2>${esc(copy.facilities)}</h2>`,
    `<p>${facilityCount} ${code === 'zh' ? '项已核实的设施与服务信息。' : code === 'ru' ? 'проверенных сведений об удобствах и услугах.' : code === 'de' ? 'geprüfte Angaben zu Ausstattung und Service.' : code === 'fr' ? 'informations vérifiées sur les équipements et services.' : 'verified facility and service details.'}</p>`,
    rooms.length ? `<h2>${esc(copy.rooms)}</h2><p>${roomList}</p>` : '',
    `<p>${imageCount} — ${esc(copy.photo)}</p>`,
  ].filter(Boolean).join('\n')
}

const hotels = (capture.hotels || []).filter((hotel) => hotel?.name && !hotel.error).map((hotel) => {
  const loc = location(hotel)
  const images = uniqueImages(hotel.gallery)
  const sections = sectionData(hotel)
  const rooms = (hotel.rooms || []).map((room, index) => {
    const roomImages = uniqueImages(room.images)
    return {
      id: clean(room.id) || `${slugFromUrl(hotel.canonical || hotel.url)}-room-${index + 1}`,
      name: clean(room.name),
      boardType: /Oda Kahvaltı/i.test(room.text || '') ? 'Oda Kahvaltı' : '',
      image: roomImages[0] || '',
      images: roomImages,
      features: [...new Set((clean(room.text).match(/\d+\s*m2|Sigara İçilebilir|Sigara İçilemez/gi) || []))],
      rates: currentRates(room),
    }
  }).filter((room) => room.name)
  const slug = slugFromUrl(hotel.canonical || hotel.url)
  const description = trDescription(hotel, sections, rooms, loc)
  const translations = Object.fromEntries(Object.keys(localeCopy).map((code) => [code, {
    title: clean(hotel.name),
    description: localizedDescription(code, hotel, sections, rooms, loc, images.length),
  }]))
  const amenities = [...new Set(sections.flatMap((section) => section.items))]
  return {
    id: slug,
    slug,
    name: clean(hotel.name),
    description,
    translations,
    url: hotel.canonical || hotel.url,
    address: clean(hotel.address),
    ...loc,
    countryCode: 'TR',
    guestScore: Number(hotel.score || 0) || null,
    checkIn: clean(hotel.rules?.checkIn),
    checkOut: clean(hotel.rules?.checkOut),
    amenities,
    images,
    rooms,
    currency: 'TRY',
    sourceFacts: {
      capturedAt: hotel.captured_at,
      sourceSections: sections,
      rules: hotel.rules || {},
      mediaStatus: images.length > 1 ? 'complete' : 'media_incomplete',
      roomCount: rooms.length,
      roomsWithImages: rooms.filter((room) => room.images.length).length,
    },
  }
})

fs.writeFileSync(output, `${JSON.stringify({ hotels }, null, 2)}\n`)
console.log(JSON.stringify({
  input,
  output,
  hotels: hotels.length,
  images: hotels.reduce((sum, hotel) => sum + hotel.images.length, 0),
  rooms: hotels.reduce((sum, hotel) => sum + hotel.rooms.length, 0),
  roomsWithImages: hotels.reduce((sum, hotel) => sum + hotel.rooms.filter((room) => room.images.length).length, 0),
  roomless: hotels.filter((hotel) => hotel.rooms.length === 0).map((hotel) => hotel.name),
  mediaIncomplete: hotels.filter((hotel) => hotel.images.length < 2).map((hotel) => hotel.name),
  localeCount: 6,
}, null, 2))
