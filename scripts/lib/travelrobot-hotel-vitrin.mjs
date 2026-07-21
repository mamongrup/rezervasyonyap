/**
 * Travelrobot / KPlus GetHotelDetails → vitrin alanları (facet, olanak, kurallar).
 */

function slugifyKey(text, fallback = 'item') {
  let base = String(text || fallback)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ı/g, 'i')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return (base || fallback).slice(0, 80)
}

function stripHtml(html) {
  return String(html ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function looksLikeEnglishHotelText(raw) {
  const text = stripHtml(raw)
  if (text.length < 80) return false
  if (/[çğıöşüÇĞİÖŞÜ]/.test(text)) return false

  const lower = text.toLowerCase()
  const trSignals = [
    ' ve ',
    ' ile ',
    ' için ',
    ' otel',
    ' tesis',
    ' misafir',
    ' konaklama',
    ' kahvalt',
    ' ücretsiz',
    ' odalar',
    ' bulunur',
    ' sunar',
  ]
  if (trSignals.some((s) => lower.includes(s))) return false

  const enSignals = [
    ' the ',
    ' and ',
    ' with ',
    ' guests ',
    ' rooms ',
    ' property ',
    ' located ',
    ' offers ',
    ' features ',
    ' breakfast ',
    ' check-in ',
    ' airport ',
    ' accommodation ',
  ]
  return enSignals.filter((s) => lower.includes(s)).length >= 2
}

/** SearchHotel / snapshot / GetHotelDetails birleşik otel düğümü. */
export function extractHotelDetailsNode(hotel) {
  if (!hotel || typeof hotel !== 'object') return {}
  const nested = hotel?.Hotel ?? hotel?.hotel ?? {}
  const result = hotel?.Result ?? hotel?.result ?? {}
  const base = { ...nested, ...hotel }
  if (result && typeof result === 'object') Object.assign(base, result)
  return base
}

const BOARD_TO_ACCOMMODATION = [
  { codes: ['UAI', 'ULTRA', 'ULTRA ALL INCLUSIVE'], accommodation: 'ultra_all_inclusive' },
  { codes: ['AI', 'ALL INCLUSIVE', 'ALL_INCLUSIVE'], accommodation: 'all_inclusive' },
  { codes: ['FB', 'FULL BOARD', 'FULL_BOARD'], accommodation: 'full_board' },
  { codes: ['HB', 'HALF BOARD', 'HALF_BOARD'], accommodation: 'half_board' },
  { codes: ['BB', 'BED AND BREAKFAST', 'BED_BREAKFAST'], accommodation: 'bed_breakfast' },
  { codes: ['RO', 'ROOM ONLY', 'ROOM_ONLY', 'SC'], accommodation: 'room_only' },
]

const ACCOMMODATION_PRIORITY = {
  ultra_all_inclusive: 6,
  all_inclusive: 5,
  full_board: 4,
  half_board: 3,
  bed_breakfast: 2,
  room_only: 1,
}

const THEME_RULES = [
  { code: 'adults_only', patterns: [/adults?\s*only/i, /adult\s*only/i, /yeti[sş]kin/i, /\b16\+\b/i] },
  { code: 'conservative', patterns: [/halal/i, /helal/i, /muhafaza/i, /conservative/i, /islamic/i] },
  { code: 'beachfront', patterns: [/beachfront/i, /denize\s*s[iı]f[iı]r/i, /private beach/i, /plaj/i] },
  { code: 'sea_view', patterns: [/sea view/i, /ocean view/i, /water view/i, /deniz manzara/i] },
  { code: 'spa', patterns: [/\bspa\b/i, /wellness/i, /sauna/i, /hamam/i, /massage/i] },
  { code: 'luxury', patterns: [/luxury/i, /l[üu]ks/i, /premium/i] },
  { code: 'boutique', patterns: [/boutique/i, /butik/i] },
  { code: 'family', patterns: [/family/i, /aile/i, /kids club/i, /children/i, /cocuk/i] },
  { code: 'honeymoon', patterns: [/honeymoon/i, /balay/i, /romantic/i] },
  { code: 'ski', patterns: [/\bski\b/i, /kayak/i, /snow/i] },
  { code: 'nature', patterns: [/nature/i, /do[gğ]a/i, /mountain/i, /forest/i] },
]

const HOTEL_TYPE_RULES = [
  { code: 'resort', patterns: [/resort/i, /tatil k[öo]y/i] },
  { code: 'boutique', patterns: [/boutique/i, /butik/i] },
  { code: 'apart_hotel', patterns: [/apart hotel/i, /apart otel/i, /suites/i, /residence/i] },
  { code: 'motel', patterns: [/\bmotel\b/i] },
  { code: 'pension', patterns: [/pension/i, /pansiyon/i, /guesthouse/i] },
  { code: 'hotel', patterns: [/hotel/i, /otel/i] },
]

function matchRules(text, rules) {
  const hay = String(text ?? '')
  if (!hay.trim()) return null
  for (const rule of rules) {
    if (rule.patterns.some((re) => re.test(hay))) return rule.code
  }
  return null
}

function boardCodeFromAlt(alt) {
  const raw = String(
    alt?.BoardCode ?? alt?.boardCode ?? alt?.BoardName ?? alt?.boardName ?? alt?.MealType ?? '',
  ).trim()
  return raw.toUpperCase()
}

/** Oda tekliflerinden en kapsamlı pansiyon tipi. */
export function inferAccommodationCodeFromRooms(hotel) {
  const rooms = hotel?.Rooms ?? hotel?.rooms ?? []
  let best = null
  let bestScore = 0
  for (const room of rooms) {
    const alts = room?.RoomAlternatives ?? room?.roomAlternatives ?? []
    for (const alt of alts) {
      const code = boardCodeFromAlt(alt)
      if (!code) continue
      for (const row of BOARD_TO_ACCOMMODATION) {
        if (!row.codes.some((c) => code.includes(c))) continue
        const score = ACCOMMODATION_PRIORITY[row.accommodation] ?? 0
        if (score > bestScore) {
          bestScore = score
          best = row.accommodation
        }
      }
    }
  }
  return best
}

export function inferHotelFacets(hotel) {
  const node = extractHotelDetailsNode(hotel)
  const facilities = collectFacilityNames(node)
  const corpus = [
    node?.HotelName,
    node?.Name,
    node?.SummaryText,
    node?.Description,
    facilities.join(' '),
    ...(node?.HotelCategories ?? []).map((c) => c?.Name ?? c?.name ?? c?.Code ?? ''),
  ]
    .filter(Boolean)
    .join(' ')

  let theme_code = matchRules(corpus, THEME_RULES)
  let hotel_type_code = matchRules(corpus, HOTEL_TYPE_RULES)
  const accommodation_code = inferAccommodationCodeFromRooms(hotel)

  const categories = node?.HotelCategories ?? []
  for (const cat of categories) {
    const name = String(cat?.Name ?? cat?.name ?? cat?.Code ?? cat?.code ?? '').toLowerCase()
    if (!name) continue
    if (!theme_code) theme_code = matchRules(name, THEME_RULES)
    if (!hotel_type_code) hotel_type_code = matchRules(name, HOTEL_TYPE_RULES)
  }

  if (!hotel_type_code) hotel_type_code = 'hotel'

  return {
    hotel_type_code,
    theme_code: theme_code || null,
    accommodation_code: accommodation_code || null,
  }
}

function collectFacilityNames(node) {
  const facilities = node?.HotelFacilities ?? node?.hotelFacilities ?? []
  if (!Array.isArray(facilities)) return []
  return facilities
    .map((f) => String(f?.Name ?? f?.name ?? '').trim())
    .filter(Boolean)
}

/** KPlus Facility → otel_kplus amenity satırları. */
export function mapHotelFacilitiesToAmenities(hotel) {
  const node = extractHotelDetailsNode(hotel)
  const facilities = node?.HotelFacilities ?? node?.hotelFacilities ?? []
  if (!Array.isArray(facilities)) return []

  const out = []
  const seen = new Set()
  for (const f of facilities) {
    const label = String(f?.Name ?? f?.name ?? '').trim()
    if (!label) continue
    const code = String(f?.Code ?? f?.code ?? '').trim()
    const key = slugifyKey(code ? `k${code}-${label}` : label)
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      group_code: 'otel_kplus',
      key,
      value_json: { label, enabled: true, source: 'travelrobot', kplus_code: code || null },
    })
  }
  return out
}

function parseSummaryFaq(summaryHtml) {
  const text = stripHtml(summaryHtml)
  if (!text) return []
  const faq = []

  const checkIn =
    text.match(/check[\s-]?in time[:\s]+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i) ??
    text.match(/giri[sş][:\s]+(\d{1,2}(?::\d{2})?)/i)
  const checkOut =
    text.match(/check[\s-]?out time[:\s]+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i) ??
    text.match(/[çc][iı]k[iı][sş][:\s]+(\d{1,2}(?::\d{2})?)/i)

  if (checkIn?.[1]) faq.push({ q: 'Giriş saati', a: checkIn[1].trim() })
  if (checkOut?.[1]) faq.push({ q: 'Çıkış saati', a: checkOut[1].trim() })

  const pet = text.match(/pet[^.]{0,120}\./i)
  if (pet?.[0]) faq.push({ q: 'Evcil hayvan politikası', a: pet[0].trim() })

  return faq
}

function formatDistance(d) {
  const dist = Number(d?.Distance ?? d?.distance)
  if (!Number.isFinite(dist)) return ''
  const unit = Number(d?.UnitType ?? d?.unitType) === 1 ? 'km' : 'm'
  return `${dist} ${unit}`
}

function buildDistanceSection(node) {
  const distances = node?.HotelDistances ?? node?.hotelDistances ?? []
  if (!Array.isArray(distances) || !distances.length) return null
  const items = distances
    .map((d) => {
      const name = String(d?.Description ?? d?.description ?? d?.Name ?? '').trim()
      const dist = formatDistance(d)
      if (!name || !dist) return null
      return `${name}: ${dist}`
    })
    .filter(Boolean)
  if (!items.length) return null
  return { id: 'distances', title: 'Mesafeler', items: items.slice(0, 20) }
}

function buildAdditionalTabSections(node) {
  const tabs = node?.AdditionalTabs ?? node?.additionalTabs ?? []
  if (!Array.isArray(tabs)) return []
  const sections = []
  for (const tab of tabs) {
    const title = String(tab?.Title ?? tab?.title ?? '').trim()
    const bodyHtml = String(tab?.Subject ?? tab?.subject ?? tab?.Content ?? '').trim()
    if (!title || !bodyHtml) continue
    sections.push({
      id: slugifyKey(title, 'tab'),
      title,
      bodyHtml,
    })
  }
  return sections
}

/** GetHotelDetails → vertical_hotel meta + açıklama özeti. */
export function buildTravelrobotHotelVitrinMeta(hotel) {
  const node = extractHotelDetailsNode(hotel)
  const summaryHtml = String(node?.SummaryText ?? node?.summaryText ?? '').trim()
  const useSummary = summaryHtml && !looksLikeEnglishHotelText(summaryHtml)
  const facilitySections = [
    buildDistanceSection(node),
    ...buildAdditionalTabSections(node),
  ].filter(Boolean)

  const faqItems = useSummary ? parseSummaryFaq(summaryHtml) : []

  return {
    general_terms_html: useSummary ? summaryHtml : null,
    facility_sections: facilitySections.length ? facilitySections : null,
    faq_items: faqItems.length ? faqItems : null,
    descriptionPlain: useSummary ? stripHtml(summaryHtml).slice(0, 4000) : null,
  }
}

export function buildTravelrobotHotelVitrinPackage(hotel) {
  return {
    facets: inferHotelFacets(hotel),
    amenities: mapHotelFacilitiesToAmenities(hotel),
    verticalHotel: buildTravelrobotHotelVitrinMeta(hotel),
  }
}

/** vertical_hotel JSON — panel PUT ile aynı zarf. */
export function wrapVerticalHotelMeta(meta) {
  return {
    category: 'hotel',
    data: {
      general_terms_html: meta.general_terms_html?.trim() || null,
      facility_sections: meta.facility_sections?.length ? meta.facility_sections : null,
      faq_items: meta.faq_items?.length ? meta.faq_items : null,
    },
  }
}
