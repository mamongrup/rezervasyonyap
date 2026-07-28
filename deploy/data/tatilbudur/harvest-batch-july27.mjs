#!/usr/bin/env node
/**
 * Harvest TatilBudur hotel pages via r.jina.ai (WAF blocks direct curl).
 * Writes batch-july27-hotels.raw.json + summary.txt
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = __dirname
const RAW_DIR = join(OUT_DIR, 'raw-pages-july27')
mkdirSync(RAW_DIR, { recursive: true })

const HOTELS = [
  { slug: 'seamelia-beach-resort-hotel-spa', expectedName: 'Seamelia Beach Resort Hotel & Spa' },
  { slug: 'tui-blue-xanthe', expectedName: 'Tui Blue Xanthe' },
  { slug: 'lucida-beach-hotel', expectedName: 'Lucida Beach Hotel' },
  { slug: 'royal-atlantis-beach', expectedName: 'Royal Atlantis Spa & Resort' },
  { slug: 'susesi-luxury-resort', expectedName: 'Susesi Luxury Resort' },
  { slug: 'michell-hotel-spa-16', expectedName: 'Michell Hotel & Spa (+16)' },
  { slug: 'queens-park-goynuk', expectedName: 'Queens Park Göynük' },
  { slug: 'crystal-admiral-aqua-collection', expectedName: 'Crystal Admiral Aqua Collection', altSlugs: ['crystal-admiral-resort-suites-spa'] },
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
  { slug: 'bera-alanya-otel', expectedName: 'Bera Alanya Otel', altSlugs: ['bera-hotel-alanya'] },
  { slug: 'la-kumsal-hotel', expectedName: 'La Kumsal Hotel' },
  { slug: 'lures-hotel-adults-only-16', expectedName: 'Lures Hotel' },
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchPage(slug, attempt = 1) {
  const url = `https://r.jina.ai/https://www.tatilbudur.com/${slug}`
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 90_000)
  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'text/plain',
        'User-Agent': 'Mozilla/5.0 (compatible; rezervasyonyap-harvest/1.0)',
      },
      signal: ctrl.signal,
    })
    clearTimeout(t)
    const text = await res.text()
    if (!res.ok) {
      if (attempt < 3) {
        await sleep(1500 * attempt)
        return fetchPage(slug, attempt + 1)
      }
      return { ok: false, status: res.status, text }
    }
    if (/Access Denied|404 Not Found|page not found/i.test(text) && !/#\s/.test(text)) {
      if (attempt < 2) {
        await sleep(2000)
        return fetchPage(slug, attempt + 1)
      }
    }
    return { ok: true, status: res.status, text }
  } catch (e) {
    clearTimeout(t)
    if (attempt < 3) {
      await sleep(2000 * attempt)
      return fetchPage(slug, attempt + 1)
    }
    return { ok: false, status: 0, text: String(e) }
  }
}

function uniq(arr) {
  return [...new Set(arr.filter(Boolean))]
}

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function extractImages(text) {
  const gallery = [...text.matchAll(/https:\/\/productcdn\.tatilbudur\.com\/Otel\/gallery\/[^\s)\]"']+/g)].map((m) => m[0].replace(/[),.]+$/, ''))
  const ucdn = [...text.matchAll(/https:\/\/ucdn\.tatilbudur\.net\/Otel\/855x426\/[^\s)\]"']+/g)].map((m) => m[0].replace(/[),.]+$/, ''))
  const thumbs = [...text.matchAll(/https:\/\/productcdn\.tatilbudur\.com\/Otel\/298x149\/[^\s)\]"']+/g)].map((m) =>
    m[0].replace('/298x149/', '/gallery/').replace(/[),.]+$/, ''),
  )
  // Prefer gallery, then ucdn, then upgraded thumbs
  const preferred = uniq([...gallery, ...ucdn, ...thumbs])
  return preferred.slice(0, 40)
}

function sectionBetween(text, startRe, endRes) {
  const m = text.match(startRe)
  if (!m) return ''
  const start = m.index + m[0].length
  let end = text.length
  for (const er of endRes) {
    const em = text.slice(start).match(er)
    if (em && start + em.index < end) end = start + em.index
  }
  return text.slice(start, end).trim()
}

function bulletItems(block) {
  const items = []
  for (const line of block.split('\n')) {
    const m = line.match(/^\s*[-*]\s+(.+?)\s*$/)
    if (!m) continue
    let t = m[1].replace(/\s*\*$/, '').replace(/\*+$/, '').trim()
    t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim()
    if (!t || t.length < 2) continue
    if (/^ile işaretli/i.test(t)) continue
    if (/Daha Fazla|Tümünü|Kampanya|Popüler/i.test(t)) continue
    items.push(t)
  }
  return uniq(items)
}

function detectBoardType(text) {
  const patterns = [
    /Ultimate Her [Şş]ey Dahil/i,
    /Ultra Her [Şş]ey Dahil/i,
    /Her [Şş]ey Dahil/i,
    /Alkolsüz Her [Şş]ey Dahil/i,
    /Oda Kahvalt[ıi]/i,
    /Yarım Pansiyon/i,
    /Tam Pansiyon/i,
  ]
  for (const p of patterns) {
    const m = text.match(p)
    if (m) {
      // Normalize casing from known phrases
      const raw = m[0]
      if (/ultimate/i.test(raw)) return 'Ultimate Her Şey Dahil'
      if (/ultra/i.test(raw)) return 'Ultra Her Şey Dahil'
      if (/alkolsüz/i.test(raw)) return 'Alkolsüz Her Şey Dahil'
      if (/oda kahvalt/i.test(raw)) return 'Oda Kahvaltı'
      if (/yarım/i.test(raw)) return 'Yarım Pansiyon'
      if (/tam/i.test(raw)) return 'Tam Pansiyon'
      return 'Her Şey Dahil'
    }
  }
  return null
}

function detectAdultsOnly(text, slug) {
  if (/\+16|\+18|Adults?\s*Only|Yetişkin Oteli|yetişkinlere özel|yalnızca \+16/i.test(text)) return true
  if (/(adults-only|adult-only|-16$|-18$)/i.test(slug)) return true
  return false
}

function extractH1(text) {
  const m = text.match(/^#\s+(.+)$/m)
  return m ? m[1].trim() : null
}

function extractAddress(text) {
  // After "Konum Bilgileri" / Haritada Göster, address line before Mevkii
  const block = sectionBetween(
    text,
    /######\s*Konum Bilgileri|Konum Bilgileri/i,
    [/######\s*Kampanyalar/i, /\nGenel Özellikler/i, /\nTesis Aktiviteleri/i],
  )
  const mevkii = (block.match(/\*?\*?Mevkii:?\*?\*?\s*(.+)/i) || [])[1]?.trim() || null
  // Address: line containing hotel name + street, or first substantial line with Antalya/Mah
  const lines = block
    .split('\n')
    .map((l) => l.replace(/!\[.*?\]\(.*?\)/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').trim())
    .filter((l) => l && !/^Haritada|^Mevkii|^Denize|^Tümünü|^######/i.test(l) && l.length > 12)
  let address = null
  for (const l of lines) {
    if (/Antalya|Mah\.|Mahallesi|Cad\.|Sok|Mevkii|Alanya|Kemer|Belek|Side|Kaş|Manavgat/i.test(l)) {
      address = l.replace(/\*\*/g, '').trim()
      break
    }
  }
  return { address, mevkii, block }
}

function inferCityDistrict(address, mevkii, titleLine, text) {
  // Breadcrumb-ish: Alanya Otelleri / Kemer etc.
  let city = null
  let district = mevkii || null
  let provinceCity = 'Antalya'
  if (/Kaş/i.test(address || '') || /Kaş/i.test(titleLine || '')) {
    city = 'Kaş'
    provinceCity = 'Antalya'
  }
  const locHints = [
    [/Belek/i, 'Belek'],
    [/Alanya/i, 'Alanya'],
    [/Kemer/i, 'Kemer'],
    [/Side/i, 'Side'],
    [/Manavgat/i, 'Manavgat'],
    [/Kumluca|Olympos/i, 'Kumluca'],
  ]
  for (const [re, name] of locHints) {
    if (re.test(address || '') || re.test(titleLine || '') || re.test(text.slice(0, 800))) {
      city = city || name
      break
    }
  }
  if (!city && /Serik/i.test(address || '')) city = 'Belek'
  if (mevkii && !district) district = mevkii
  // Clean address-prefixed hotel name duplication
  return { city, district, provinceCity }
}

function extractAmenities(text) {
  const genel = sectionBetween(text, /\nGenel Özellikler\s*\n/, [/\nTesis Aktiviteleri/, /\nHavuz ve Plaj/, /\nBalayı/, /\nKonsept/])
  const akt = sectionBetween(text, /\nTesis Aktiviteleri\s*\n/, [/\nHavuz ve Plaj/, /\nBalayı/, /\nKonsept/])
  const havuz = sectionBetween(text, /\nHavuz ve Plaj\s*\n/, [/\nBalayı/, /\nKonsept/, /\nÖnemli Notlar/])
  const items = [...bulletItems(genel), ...bulletItems(akt), ...bulletItems(havuz)]
  return items.slice(0, 80)
}

function extractConceptNotes(text) {
  const concept = sectionBetween(text, /\nKonsept Özellikleri\s*\n/, [/\nÖnemli Notlar/, /\n#### Kullanıcı/, /\n### Popüler/])
  return concept
    .replace(/\[Daha Fazla Göster\]\([^)]*\)/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 8000)
}

function htmlParagraphs(parts) {
  const paras = parts
    .filter((p) => p && p.trim())
    .map((p) => {
      const clean = p
        .replace(/\[Daha Fazla Göster\]\([^)]*\)/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/\*\*/g, '')
        .replace(/\n{2,}/g, '\n')
        .trim()
      if (!clean) return ''
      // Split into paragraphs on blank-ish lines / long blocks
      const chunks = clean
        .split(/\n(?=[A-ZÇĞİÖŞÜa-zçğıöşü])/)
        .map((c) => c.trim())
        .filter((c) => c.length > 20)
      if (chunks.length <= 1) return `<p>${clean.replace(/\n/g, ' ')}</p>`
      return chunks.map((c) => `<p>${c.replace(/\n/g, ' ')}</p>`).join('\n')
    })
    .filter(Boolean)
  return paras.join('\n')
}

function buildDescription(text, boardType) {
  const genelNotes = sectionBetween(text, /\nGenel Özellikler\s*\n/, [/\nTesis Aktiviteleri/, /\nHavuz/])
    .split('\n')
    .filter((l) => l.trim() && !/^\s*[-*]/.test(l) && !/^\s*\*/.test(l.trim()) && !/Daha Fazla|ile işaretli/i.test(l))
    .join('\n')
    .trim()
  const concept = extractConceptNotes(text)
  const onemli = sectionBetween(text, /\nÖnemli Notlar\s*\n/, [
    /\n####?\s*Kullanıcı/,
    /\n###\s*Popüler/,
    /\n\s*×\s*#{0,6}\s*Fiyat\s+Tablosu/i,
    /\n#{1,6}\s*Fiyat\s+Tablosu/i,
    /\nOda\s+Müsaitlik/i,
    /\nMichell|\nSeamelia|\nCrystal|\nSunthalia/,
  ])
    .replace(/\[Daha Fazla[^\]]*\]\([^)]*\)/g, '')
    .trim()
  const parts = []
  if (boardType) parts.push(`<p><strong>Konsept:</strong> ${boardType}</p>`)
  if (concept) {
    const shortConcept = concept.slice(0, 3500)
    parts.push(`<h3>Konsept Özellikleri</h3>\n${htmlParagraphs([shortConcept])}`)
  }
  if (genelNotes) parts.push(`<h3>Genel</h3>\n${htmlParagraphs([genelNotes.slice(0, 2000)])}`)
  if (onemli && onemli.length > 30) parts.push(`<h3>Önemli Notlar</h3>\n${htmlParagraphs([onemli.slice(0, 2000)])}`)
  return parts.join('\n') || null
}

function extractRooms(text, boardType) {
  // Try Odalar section for named room types (often empty / JS-loaded)
  const odalar = sectionBetween(text, /\n##?\s*Odalar\s*\n|\*?\s*\[Odalar\]/, [/\nTesis Aktiviteleri/, /\nHavuz ve Plaj/, /\nGenel Özellikler/])
  const rooms = []
  // Headings like ### Standart Oda or **Standart Oda**
  const nameMatches = [
    ...odalar.matchAll(/(?:^|\n)#{2,4}\s+([^\n]+Oda[^\n]*|[^\n]+Suit[^\n]*|[^\n]+Suite[^\n]*|[^\n]+Room[^\n]*)/gi),
    ...odalar.matchAll(/\*\*([^*]+(?:Oda|Suit|Suite|Room)[^*]*)\*\*/gi),
  ]
  for (const m of nameMatches) {
    const name = m[1].trim()
    if (/Odalar|Yorum|Kampanya|Popüler/i.test(name)) continue
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
    notes.push('Fiyat tablosu başlığı mevcut; canlı oda fiyatları statik HTML’de yok (JS ile yükleniyor).')
  }
  if (/Afişe edilen tüm fiyatlar/i.test(text)) {
    notes.push('Afişe edilen tüm fiyatlar kontenjan olması durumunda geçerli olup döneme göre değişkenlik gösterebilir.')
  }
  const tl = text.match(/(\d{1,3}(?:[.\s]\d{3})*(?:,\d+)?\s*TL)/)
  // Avoid campaign TL amounts like 7.500 TL Worldpuan
  if (tl && !/Worldpuan|7\.500|7500/i.test(text.slice(Math.max(0, tl.index - 40), tl.index + 40))) {
    notes.push(`Sayfada görülen tutar metni: ${tl[1]}`)
  }
  return notes.length ? notes.join(' ') : 'Canlı oda fiyatları sayfada JS ile yükleniyor; statik içerikte gecelik fiyat yok.'
}

function extractLatLng(text) {
  const m =
    text.match(/["']?(?:lat|latitude)["']?\s*[:=]\s*([0-9]+\.[0-9]+)/i) ||
    text.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) ||
    text.match(/center=(-?\d+\.\d+)%2C(-?\d+\.\d+)/i)
  if (m && m[2]) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }
  if (m && !m[2]) {
    const lng = text.match(/["']?(?:lng|lon|longitude)["']?\s*[:=]\s*([0-9]+\.[0-9]+)/i)
    if (lng) return { lat: parseFloat(m[1]), lng: parseFloat(lng[1]) }
  }
  return { lat: null, lng: null }
}

function extractStarRating(text) {
  const m = text.match(/(\d)\s*yıldız/i) || text.match(/(\d)\s*star/i)
  if (m) return parseInt(m[1], 10)
  return null
}

function parseHotel(meta, text) {
  const title = extractH1(text) || meta.expectedName
  const boardType = detectBoardType(text)
  const adultsOnly = detectAdultsOnly(text, meta.slug)
  const { address, mevkii } = extractAddress(text)
  const { city, district, provinceCity } = inferCityDistrict(address, mevkii, title, text)
  const images = extractImages(text)
  const amenities = extractAmenities(text)
  const conceptNotes = extractConceptNotes(text)
  const description = buildDescription(text, boardType)
  const rooms = extractRooms(text, boardType)
  const { lat, lng } = extractLatLng(text)
  const starRating = extractStarRating(text)
  const priceNote = extractPriceNote(text)
  const found = /#\s+/.test(text) && !/Access Denied/i.test(text.slice(0, 500)) && images.length + amenities.length > 0

  return {
    id: meta.slug,
    name: title,
    slug: meta.slug,
    url: `https://www.tatilbudur.com/${meta.slug}`,
    city,
    district: district || mevkii,
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
      expectedName: meta.expectedName,
      imageCount: images.length,
      roomCount: rooms.length,
      rateCount: rooms.reduce((n, r) => n + (r.rates?.length || 0), 0),
      fetchedAt: new Date().toISOString(),
    },
  }
}

async function mapPool(items, concurrency, fn) {
  const results = new Array(items.length)
  let i = 0
  async function worker() {
    while (i < items.length) {
      const idx = i++
      results[idx] = await fn(items[idx], idx)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()))
  return results
}

async function main() {
  console.log(`Harvesting ${HOTELS.length} hotels via r.jina.ai ...`)
  const pages = await mapPool(HOTELS, 4, async (h) => {
    console.log(`  fetch ${h.slug}`)
    let result = await fetchPage(h.slug)
    if ((!result.ok || /Access Denied|404/i.test(result.text.slice(0, 800))) && h.altSlugs) {
      for (const alt of h.altSlugs) {
        console.log(`  retry alt ${alt}`)
        const r2 = await fetchPage(alt)
        if (r2.ok && !/Access Denied/i.test(r2.text.slice(0, 400))) {
          result = r2
          h.slug = alt
          break
        }
      }
    }
    writeFileSync(join(RAW_DIR, `${h.slug}.md`), result.text || '', 'utf8')
    console.log(`  done ${h.slug} ok=${result.ok} bytes=${(result.text || '').length}`)
    return { meta: h, result }
  })

  const hotels = []
  const missing = []
  for (const { meta, result } of pages) {
    if (!result.ok || !result.text || /Access Denied/i.test(result.text.slice(0, 400))) {
      missing.push(meta.slug)
      hotels.push({
        id: meta.slug,
        name: meta.expectedName,
        slug: meta.slug,
        url: `https://www.tatilbudur.com/${meta.slug}`,
        city: null,
        district: null,
        provinceCity: null,
        address: null,
        boardType: null,
        starRating: null,
        adultsOnly: /\+16|adults-only|16$/.test(meta.slug),
        description: null,
        conceptNotes: '',
        images: [],
        rooms: [],
        amenities: [],
        lat: null,
        lng: null,
        priceNote: 'Sayfa alınamadı',
        _meta: { found: false, expectedName: meta.expectedName, imageCount: 0, roomCount: 0, rateCount: 0 },
      })
      continue
    }
    const hotel = parseHotel(meta, result.text)
    if (!hotel._meta.found) missing.push(meta.slug)
    hotels.push(hotel)
  }

  // Strip internal _meta for raw export but keep stats
  const stats = hotels.map((h) => h._meta)
  const exportHotels = hotels.map(({ _meta, ...rest }) => rest)

  const outPath = join(OUT_DIR, 'batch-july27-hotels.raw.json')
  writeFileSync(outPath, JSON.stringify(exportHotels, null, 2), 'utf8')

  const foundCount = stats.filter((s) => s.found).length
  const withImages = stats.filter((s) => s.imageCount > 0).length
  const withRooms = stats.filter((s) => s.roomCount > 0).length
  const withRates = stats.filter((s) => s.rateCount > 0).length
  const missingSlugs = hotels.filter((_, i) => !stats[i].found).map((h) => h.slug)

  const summary = [
    `TatilBudur batch-july27 harvest summary`,
    `Date: ${new Date().toISOString()}`,
    ``,
    `found count: ${foundCount} / ${HOTELS.length}`,
    `missing slugs: ${missingSlugs.length ? missingSlugs.join(', ') : '(none)'}`,
    `hotels with images>0: ${withImages}`,
    `hotels with rooms>0: ${withRooms}`,
    `hotels with any rates: ${withRates}`,
    ``,
    `Per hotel:`,
    ...hotels.map((h, i) => {
      const s = stats[i]
      return `- ${h.slug}: found=${s.found} images=${s.imageCount} rooms=${s.roomCount} rates=${s.rateCount} board=${h.boardType || '-'} adultsOnly=${h.adultsOnly}`
    }),
    ``,
    `Notes:`,
    `- Live room rates are JS-loaded on TatilBudur; rates[] left empty when not in static HTML.`,
    `- Odalar room-type names often absent from static HTML; rooms[] empty unless headings found.`,
    `- Images prefer productcdn .../Otel/gallery/ then ucdn .../855x426/; deduped, max 40.`,
    `- Crystal Admiral resolved to crystal-admiral-aqua-collection (resort-suites-spa Access Denied).`,
  ].join('\n')

  writeFileSync(join(OUT_DIR, 'batch-july27-hotels.summary.txt'), summary, 'utf8')
  console.log(summary)
  console.log(`\nWrote ${outPath}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
