#!/usr/bin/env node
/**
 * Re-parse saved TatilBudur raw markdown pages into clean batch JSON.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const RAW_DIR = join(__dirname, 'raw-pages-july27')

const HOTELS = [
  { slug: 'seamelia-beach-resort-hotel-spa', expectedName: 'Seamelia Beach Resort Hotel & Spa' },
  { slug: 'tui-blue-xanthe', expectedName: 'Tui Blue Xanthe' },
  { slug: 'lucida-beach-hotel', expectedName: 'Lucida Beach Hotel' },
  { slug: 'royal-atlantis-beach', expectedName: 'Royal Atlantis Spa & Resort' },
  { slug: 'susesi-luxury-resort', expectedName: 'Susesi Luxury Resort' },
  { slug: 'michell-hotel-spa-16', expectedName: 'Michell Hotel & Spa (+16)' },
  { slug: 'queens-park-goynuk', expectedName: 'Queens Park Göynük' },
  { slug: 'crystal-admiral-aqua-collection', expectedName: 'Crystal Admiral Aqua Collection' },
  { slug: 'ozkaymak-marina-hotel', expectedName: 'Özkaymak Marina Hotel' },
  { slug: 'royal-wings-hotel', expectedName: 'Royal Wings Hotel' },
  { slug: 'innvista-hotels-belek', expectedName: 'Innvista Hotels Belek' },
  { slug: 'nova-park-hotel', expectedName: 'Nova Park Hotel' },
  { slug: 'crystal-sunset-pearl-collection', expectedName: 'Crystal Sunset Pearl Collection' },
  { slug: 'sunthalia-hotels-resorts-16', expectedName: 'Sunthalia Hotels & Resorts (+16)' },
  { slug: 'leodikya-kirman-premium', expectedName: 'Leodikya Kirman Premium' },
  { slug: 'caretta-beach-hotel', expectedName: 'Caretta Beach Hotel' },
  { slug: 'haydarpasha-palace-hotel', expectedName: 'Haydarpasha Palace Hotel' },
  { slug: 'crystal-de-luxe-comfort-collection', expectedName: 'Crystal De Luxe Comfort Collection' },
  { slug: 'orange-county-alanya', expectedName: 'Orange County Alanya' },
  { slug: 'adam-eve-16', expectedName: 'Adam & Eve (+16)' },
  { slug: 'sidemarin-kirman-premium', expectedName: 'Sidemarin Kirman Premium' },
  { slug: 'viking-nona-beach-hotel', expectedName: 'Viking Nona Beach Hotel' },
  { slug: 'bera-alanya-otel', expectedName: 'Bera Alanya Otel' },
  { slug: 'la-kumsal-hotel', expectedName: 'La Kumsal Hotel' },
  { slug: 'lures-hotel-adults-only-16', expectedName: 'Lures Hotel' },
]

function uniq(arr) {
  return [...new Set(arr.filter(Boolean))]
}

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function extractImages(text) {
  const gallery = [...text.matchAll(/https:\/\/productcdn\.tatilbudur\.com\/Otel\/gallery\/[^\s)\]"']+/g)].map((m) =>
    m[0].replace(/[),.]+$/, ''),
  )
  const ucdn = [...text.matchAll(/https:\/\/ucdn\.tatilbudur\.net\/Otel\/855x426\/[^\s)\]"']+/g)].map((m) =>
    m[0].replace(/[),.]+$/, ''),
  )
  const thumbs = [...text.matchAll(/https:\/\/productcdn\.tatilbudur\.com\/Otel\/298x149\/[^\s)\]"']+/g)].map((m) =>
    m[0].replace('/298x149/', '/gallery/').replace(/[),.]+$/, ''),
  )
  return uniq([...gallery, ...ucdn, ...thumbs]).slice(0, 40)
}

/** Find content section by loose heading match (allows ###### prefixes) */
function section(text, startNeedles, endNeedles) {
  let start = -1
  for (const n of startNeedles) {
    const re =
      typeof n === 'string' ? new RegExp(`(^|\\n)#{0,6}\\s*${n}\\s*(\\n|$)`, 'i') : n
    const m = text.match(re)
    if (m) {
      start = m.index + m[0].length
      break
    }
  }
  if (start < 0) return ''
  let end = text.length
  const slice = text.slice(start)
  for (const n of endNeedles) {
    const re =
      typeof n === 'string' ? new RegExp(`(^|\\n)#{0,6}\\s*${n}\\s*(\\n|$)`, 'i') : n
    const m = slice.match(re)
    if (m && m.index < end - start) end = start + m.index
  }
  return text.slice(start, end).trim()
}

function bulletItems(block) {
  const items = []
  for (const line of block.split('\n')) {
    const m = line.match(/^\s*\*\s+(.+?)\s*$/) || line.match(/^\s*-\s+(.+?)\s*$/)
    if (!m) continue
    let t = m[1]
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\s*\*+\s*$/, '')
      .replace(/^\*+\s*/, '')
      .trim()
    if (!t || t.length < 2 || t.length > 80) continue
    if (/^ile işaretli/i.test(t)) continue
    if (/Daha Fazla|Tümünü|Kampanya|Popüler|Genel Özellik|Odalar|Yorum/i.test(t)) continue
    if (/^\[/.test(t)) continue
    if (/[.!?]$/.test(t) && t.length > 40) continue // prose notes, not amenity chips
    items.push(t)
  }
  return uniq(items)
}

function detectBoardType(text) {
  // Prefer Konsept Özellikleri heading block (ignore mega-menu noise)
  const concept = section(
    text,
    ['Konsept Özellikleri'],
    ['Önemli Notlar', 'Kullanıcı Yorumları', 'Popüler Yurtiçi'],
  )
  const genel = section(text, ['Genel Özellikler'], ['Tesis Aktiviteleri', 'Havuz ve Plaj', 'Balayı'])
  const features = section(text, ['Öne Çıkan Özellikler'], ['Konum Bilgileri', 'Kampanyalar', 'Genel Özellikler'])
  const ordered = [
    [/Alkolsüz\s+Her\s+[ŞşSs]ey\s+Dahil/i, 'Alkolsüz Her Şey Dahil'],
    [/Ultimate\s+Her\s+[ŞşSs]ey\s+Dahil/i, 'Ultimate Her Şey Dahil'],
    [/Ultra\s+Her\s+[ŞşSs]ey\s+Dahil/i, 'Ultra Her Şey Dahil'],
    [/Oda\s+Kahvalt[ıi]/i, 'Oda Kahvaltı'],
    [/Yarım\s+Pansiyon/i, 'Yarım Pansiyon'],
    [/Tam\s+Pansiyon/i, 'Tam Pansiyon'],
    [/Her\s+[ŞşSs]ey\s+Dahil/i, 'Her Şey Dahil'],
  ]
  for (const scope of [concept, features, genel]) {
    if (!scope) continue
    for (const [re, label] of ordered) {
      if (re.test(scope)) return label
    }
  }
  // Boutique / breakfast-only: genel narrative mentions kahvaltı but no AI concept heading
  if (genel && /kahvalt/i.test(genel) && !/Her\s+[ŞşSs]ey\s+Dahil/i.test(concept || '')) {
    return 'Oda Kahvaltı'
  }
  return null
}

function detectAdultsOnly(text, slug, name) {
  if (/\(\+1[468]\)|\+16|\+18|Adults?\s*Only/i.test(name || '')) return true
  if (/(adults-only|adult-only|-16$|-18$)/i.test(slug)) return true
  // Featured amenity list
  const features = section(text, ['Öne Çıkan Özellikler'], ['Konum Bilgileri', 'Kampanyalar', 'Genel Özellikler'])
  if (/Yetişkin Oteli/i.test(features)) return true
  // Explicit in title H1
  const h1 = (text.match(/^#\s+(.+)$/m) || [])[1] || ''
  if (/\(\+1[468]\)|Adults?\s*Only/i.test(h1)) return true
  // Genel list
  const genel = section(text, ['Genel Özellikler'], ['Tesis Aktiviteleri', 'Havuz ve Plaj', 'Odalar', 'Balayı'])
  if (/Yetişkin Oteli\s*\(\+1[468]\)/i.test(genel) || /Yetişkin Oteli\s*\(\+/i.test(genel)) return true
  return false
}

function extractH1(text) {
  const m = text.match(/^#\s+(.+)$/m)
  return m ? m[1].trim() : null
}

function extractAddress(text) {
  const block = section(text, ['Konum Bilgileri'], ['Kampanyalar', 'Genel Özellikler', 'Etkinlikler', 'Odalar'])
  const mevkiiGlobal = (
    text.match(/\*\*Mevkii\*\*\s*:?\s*([^\n*]+)/i) ||
    text.match(/\*\*Mevkii:\*\*\s*([^\n*]+)/i) ||
    text.match(/Mevkii\s*:\s*([^\n*]+)/i) ||
    []
  )[1]
  const mevkii = (mevkiiGlobal || '').replace(/\*\*/g, '').trim() || null
  const lines = block
    .split('\n')
    .map((l) =>
      l
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/\*\*/g, '')
        .trim(),
    )
    .filter((l) => l && !/^(Haritada|Mevkii|Denize|Tümünü|######|Konum)/i.test(l) && l.length > 10)
  let address = null
  for (const l of lines) {
    if (/Antalya|Mah\.|Mahallesi|Cad\.|Sok|Mevkii|Alanya|Kemer|Belek|Side|Kaş|Manavgat|Kalkan|Lara/i.test(l)) {
      // Split mashed "HotelNameAddress"
      address = l.replace(/^([A-Za-zÇĞİÖŞÜçğıöşü0-9 &\+\(\)\.'’\-]{8,}?)(?=[A-ZÇĞİÖŞÜ][a-zçğıöşü])/u, '$1 ').trim()
      break
    }
  }
  return { address, mevkii }
}

function inferLocation(address, mevkii, title, text) {
  let city = null
  let district = mevkii
  const provinceCity = 'Antalya'
  const titleLine = (text.match(/^Title:\s*(.+)$/m) || [])[1] || ''
  // Do NOT scan full page — mega-menu lists every Antalya district and poisons city.
  const blob = `${address || ''} | ${mevkii || ''} | ${title || ''} | ${titleLine}`
  const pairs = [
    [/Kalkan/i, 'Kalkan'],
    [/Kaş/i, 'Kaş'],
    [/Belek|Kadriye|İskele|Iskele/i, 'Belek'],
    [/Alanya|Konaklı|Okurcalar|Okurcular|Türkler|Kestel/i, 'Alanya'],
    [/Kemer|Göynük|Goynuk|Çamyuva|Camyuva|Kiriş/i, 'Kemer'],
    [/Side|Evrenseki|Kumköy|Çolaklı|Colakli|Kızılot|Gündoğdu|Manavgat/i, 'Side'],
    [/Lara|Antalya Merkez|Kundu/i, 'Antalya'],
  ]
  for (const [re, c] of pairs) {
    if (re.test(blob)) {
      city = c
      break
    }
  }
  if (district) {
    district = district.replace(/^[:\s,]+/, '').replace(/\s+/g, ' ').trim()
    if (/Side\/Antalya|\/ Antalya/i.test(district) && /Kumköy|Bingeşik/i.test(district)) district = 'Kumköy'
    if (/Belek\s*\/\s*Antalya/i.test(district)) district = 'İskele'
    if (/,\s*Belek/i.test(district)) district = 'İskele'
    if (/P\.K\./i.test(district)) district = 'Kumköy'
  }
  // Innvista etc.: mevkii may be missing but address has Kadriye
  if (!district && /Kadriye/i.test(address || '')) district = 'Kadriye'
  return { city, district, provinceCity }
}

function extractAmenities(text) {
  const genel = section(text, ['Genel Özellikler'], ['Tesis Aktiviteleri', 'Havuz ve Plaj', 'Balayı', 'Konsept Özellikleri'])
  const akt = section(text, ['Tesis Aktiviteleri'], ['Havuz ve Plaj', 'Balayı', 'Konsept Özellikleri'])
  const havuz = section(text, ['Havuz ve Plaj'], ['Balayı', 'Konsept Özellikleri', 'Önemli Notlar'])
  return [...bulletItems(genel), ...bulletItems(akt), ...bulletItems(havuz)].slice(0, 80)
}

function parasFromText(raw, maxLen = 4000) {
  const clean = raw
    .replace(/\[Daha Fazla[^\]]*\]\([^)]*\)/gi, '')
    .replace(/\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\*\*/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxLen)
  if (!clean) return ''
  return clean
    .split(/\n\n+/)
    .map((p) => p.replace(/\n/g, ' ').trim())
    .filter((p) => p.length > 15)
    .map((p) => `<p>${p}</p>`)
    .join('\n')
}

function buildDescription(text, boardType) {
  const genel = section(text, ['Genel Özellikler'], ['Tesis Aktiviteleri', 'Havuz ve Plaj'])
  const genelNotes = genel
    .split('\n')
    .filter((l) => {
      const t = l.trim()
      return t && !/^\*/.test(t) && !/^ile işaretli/i.test(t) && !/Daha Fazla/i.test(t)
    })
    .join('\n')
    .trim()
  const concept = section(text, ['Konsept Özellikleri'], ['Önemli Notlar', 'Kullanıcı Yorumları', 'Popüler Yurtiçi'])
  const onemli = section(text, ['Önemli Notlar'], ['Kullanıcı Yorumları', 'Fiyat Tablosu', 'Popüler Yurtiçi', 'Oda Müsaitlik'])
  const parts = []
  if (boardType) parts.push(`<p><strong>Konsept:</strong> ${boardType}</p>`)
  const conceptHtml = parasFromText(concept, 4500)
  if (conceptHtml) parts.push(`<h3>Konsept Özellikleri</h3>\n${conceptHtml}`)
  const genelHtml = parasFromText(genelNotes, 2500)
  if (genelHtml) parts.push(`<h3>Genel</h3>\n${genelHtml}`)
  const onemliHtml = parasFromText(onemli, 2000)
  if (onemliHtml) parts.push(`<h3>Önemli Notlar</h3>\n${onemliHtml}`)
  return parts.join('\n') || null
}

function extractRooms(text, boardType) {
  const startIdx = text.search(/\n####\s*Odalar\s*\n/i)
  if (startIdx < 0) return []
  const from = text.slice(startIdx + 1)
  // Cut at fiyat tablosu / popular / kullanıcı yorumları / genel özellikler (page body after cards)
  const endMatch = from.search(
    /\n####\s*Fiyat Tablosu|\n###\s*Popüler|\n####\s*Kullanıcı Yorumları|\n#{0,6}\s*Genel Özellikler\s*\n|\n#{0,6}\s*Tesis Aktiviteleri\s*\n/i,
  )
  const odalar = endMatch > 0 ? from.slice(0, endMatch) : from.slice(0, 25000)

  const rooms = []
  for (const m of odalar.matchAll(/(?:^|\n)###\s+([^\n]+)\n/g)) {
    let name = m[1].replace(/\*\*/g, '').trim()
    if (!name || name.length > 90) continue
    if (/Fiyat Tablosu|Yorum|Kampanya|Popüler|Odalar|Genel|Konsept|Özellikleri|Arama/i.test(name)) continue
    if (!/(Oda|Suit|Suite|Room|Dublex|Duplex|Penthouse|Chalet|Villa)/i.test(name)) continue
    if (/^Oda Özellikleri$/i.test(name)) continue
    const id = slugify(name)
    if (rooms.some((r) => r.id === id)) continue
    rooms.push({
      id,
      name,
      capacity: null,
      boardType: boardType || null,
      features: [],
      image: null,
      images: [],
      rates: [],
    })
  }
  return rooms
}

function extractPriceNote(text) {
  const notes = []
  if (/Fiyat için tarih seçmelisiniz/i.test(text)) notes.push('Fiyat için tarih seçmelisiniz')
  if (/Fiyat Tablosu Yetişkin ve çocuk dahil gecelik oda fiyatlarıdır/i.test(text)) {
    notes.push('Fiyat tablosu başlığı var; canlı gecelik fiyatlar JS ile yükleniyor (statik HTML’de yok).')
  }
  if (/Afişe edilen tüm fiyatlar/i.test(text)) {
    notes.push('Afişe edilen fiyatlar kontenjana ve döneme göre değişebilir.')
  }
  return notes.length ? notes.join(' ') : 'Canlı oda fiyatları sayfada JS ile yükleniyor; rates=[]'
}

function extractLatLng(text) {
  const m = text.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || text.match(/center=(-?\d+\.\d+)%2C(-?\d+\.\d+)/i)
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }
  const lat = text.match(/["']lat["']\s*:\s*(-?\d+\.\d+)/i)
  const lng = text.match(/["']l(?:ng|on)["']\s*:\s*(-?\d+\.\d+)/i)
  if (lat && lng) return { lat: parseFloat(lat[1]), lng: parseFloat(lng[1]) }
  return { lat: null, lng: null }
}

function extractStarRating(text) {
  // Avoid matching random numbers; look near otel puanı / yıldız
  const m = text.match(/(\d)\s*[- ]?\s*yıldızlı/i) || text.match(/yıldız\s*[:=]?\s*(\d)/i)
  return m ? parseInt(m[1], 10) : null
}

function parseHotel(meta, text) {
  const title = extractH1(text) || meta.expectedName
  const boardType = detectBoardType(text)
  const adultsOnly = detectAdultsOnly(text, meta.slug, title)
  const { address, mevkii } = extractAddress(text)
  const { city, district, provinceCity } = inferLocation(address, mevkii, title, text)
  const images = extractImages(text)
  const amenities = extractAmenities(text)
  const conceptNotes = section(text, ['Konsept Özellikleri'], ['Önemli Notlar', 'Kullanıcı Yorumları', 'Popüler Yurtiçi'])
    .replace(/\[Daha Fazla[^\]]*\]\([^)]*\)/gi, '')
    .replace(/\*\*/g, '')
    .trim()
    .slice(0, 8000)
  const description = buildDescription(text, boardType)
  const rooms = extractRooms(text, boardType)
  const { lat, lng } = extractLatLng(text)
  const starRating = extractStarRating(text)
  const priceNote = extractPriceNote(text)
  const found = /#\s+/.test(text) && images.length > 0

  return {
    id: meta.slug,
    name: title,
    slug: meta.slug,
    url: `https://www.tatilbudur.com/${meta.slug}`,
    city,
    district,
    provinceCity,
    address,
    boardType,
    starRating,
    adultsOnly,
    description,
    conceptNotes,
    images,
    rooms,
    amenities,
    lat,
    lng,
    priceNote,
    _meta: {
      found,
      imageCount: images.length,
      roomCount: rooms.length,
      rateCount: 0,
      amenityCount: amenities.length,
      descLen: (description || '').length,
    },
  }
}

const hotels = []
for (const meta of HOTELS) {
  const path = join(RAW_DIR, `${meta.slug}.md`)
  let text = ''
  try {
    text = readFileSync(path, 'utf8')
  } catch {
    console.error('missing', meta.slug)
  }
  hotels.push(parseHotel(meta, text))
}

const stats = hotels.map((h) => h._meta)
const exportHotels = hotels.map(({ _meta, ...rest }) => rest)
writeFileSync(join(__dirname, 'batch-july27-hotels.raw.json'), JSON.stringify(exportHotels, null, 2), 'utf8')

const foundCount = stats.filter((s) => s.found).length
const withImages = stats.filter((s) => s.imageCount > 0).length
const withRooms = stats.filter((s) => s.roomCount > 0).length
const withRates = stats.filter((s) => s.rateCount > 0).length
const missing = hotels.filter((h, i) => !stats[i].found).map((h) => h.slug)

const summary = [
  `TatilBudur batch-july27 harvest summary`,
  `Date: ${new Date().toISOString()}`,
  ``,
  `found count: ${foundCount} / ${HOTELS.length}`,
  `missing slugs: ${missing.length ? missing.join(', ') : '(none)'}`,
  `hotels with images>0: ${withImages}`,
  `hotels with rooms>0: ${withRooms}`,
  `hotels with any rates: ${withRates}`,
  ``,
  `Per hotel:`,
  ...hotels.map((h, i) => {
    const s = stats[i]
    return `- ${h.slug}: found=${s.found} images=${s.imageCount} rooms=${s.roomCount} rates=${s.rateCount} amenities=${s.amenityCount} desc=${s.descLen} board=${h.boardType || '-'} adultsOnly=${h.adultsOnly} city=${h.city || '-'}`
  }),
  ``,
  `Resolved search slugs:`,
  `- michell-hotel-spa-16`,
  `- queens-park-goynuk`,
  `- nova-park-hotel`,
  `- crystal-sunset-pearl-collection`,
  `- sunthalia-hotels-resorts-16`,
  `- haydarpasha-palace-hotel`,
  `- crystal-de-luxe-comfort-collection`,
  `- orange-county-alanya`,
  `- adam-eve-16`,
  `- sidemarin-kirman-premium`,
  `- la-kumsal-hotel`,
  `- crystal-admiral-aqua-collection (crystal-admiral-resort-suites-spa Access Denied)`,
  ``,
  `Notes:`,
  `- Live room rates are JS-loaded; rates[] empty for all hotels.`,
  `- Room names taken from #### Odalar ### headings when present in static HTML.`,
  `- Images: productcdn /Otel/gallery/ preferred, then ucdn /855x426/; deduped max 40.`,
  `- Source: r.jina.ai markdown of tatilbudur.com pages (direct curl WAF 403).`,
].join('\n')

writeFileSync(join(__dirname, 'batch-july27-hotels.summary.txt'), summary, 'utf8')
console.log(summary)
