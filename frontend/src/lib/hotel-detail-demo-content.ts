/** Demo otel vitrin içeriği — Astan Hotel Galata (canlı API slug). */
import type { ListingReviewCriteriaSummary } from '@/lib/listing-review-criteria'
import type { HotelDistanceItem } from '@/components/travel/HotelListingDistancesSection'
import type { HotelFacilityAccordionSection } from '@/lib/hotel-facility-sections'
import type {
  ListingServicePois,
  NearbyPoi,
  NearbyPoiCategory,
  HotelListingActivity,
} from '@/lib/travel-api'

export const HOTEL_DEMO_LISTING_HANDLE = 'astan-hotel-galata-tr-KTR137972'
export const HOTEL_DEMO_LISTING_ID = '2e9d326a-3cf4-40a8-9a30-bfde1efe5b0a'
export const HOTEL_DEMO_MINISTRY_LICENSE_REF = '4016'
export const HOTEL_DEMO_LOCATION_PIN = 'Galata, Beyoğlu, İstanbul'

/** Setur tarzı yorum kriter özeti — demo vitrin. */
export const HOTEL_DEMO_REVIEW_CRITERIA: ListingReviewCriteriaSummary = {
  overallScore: 4.6,
  overallLabel: 'Mükemmel',
  criteria: [
    { key: 'location', score: 4.8 },
    { key: 'sleep_quality', score: 4.5 },
    { key: 'rooms', score: 4.4 },
    { key: 'service', score: 4.6 },
    { key: 'value', score: 4.3 },
    { key: 'cleanliness', score: 4.7 },
  ],
  totalReviewCount: 128,
  travelerTypes: [
    { key: 'couple', count: 54 },
    { key: 'family', count: 31 },
    { key: 'solo', count: 18 },
    { key: 'friends', count: 15 },
    { key: 'business', count: 10 },
  ],
}

/** `ListingDescriptionExpandable` eşiğini (520) aşacak kadar uzun tanıtım metni. */
export const HOTEL_DEMO_INTRO_HTML = `<p>Astan Hotel Galata, İstanbul'un en karakteristik semtlerinden birinde, Galata Kulesi ve Tünel'e yürüme mesafesinde butik bir konaklama deneyimi sunar. Tarihi taş bina dokusunu modern konforla buluşturan tesisimiz, şehri keşfetmek isteyen çiftler ve küçük gruplar için ideal bir başlangıç noktasıdır.</p>
<p>Odalarımızda ücretsiz yüksek hızlı Wi‑Fi, klima, günlük temizlik ve 24 saat resepsiyon hizmeti standarttır. Sabahları taze kahvaltı seçenekleriyle güne keyifle başlayabilir; gün içinde İstiklal Caddesi, Karaköy sahil şeridi ve Sultanahmet'e kolay ulaşımın keyfini çıkarabilirsiniz.</p>
<p>Rezervasyonunuzu güvenle tamamlayın; esnek iptal koşulları ve şeffaf fiyatlandırma ile konaklamanız boyunca yanınızdayız. Galata'nın sokaklarındaki sanat galerileri, kahve dükkanları ve Boğaz manzaralı terasları keşfederken kendinizi evinizde hissedin.</p>`

export const HOTEL_DEMO_AMENITY_ROWS: ReadonlyArray<{
  group_code: string
  key: string
  value_json: string
}> = [
  { group_code: 'ic_konfor', key: 'fast_wifi', value_json: 'true' },
  { group_code: 'ic_konfor', key: 'air_conditioning', value_json: 'true' },
  { group_code: 'ic_banyo', key: 'hair_dryer', value_json: 'true' },
  { group_code: 'ic_banyo', key: 'shampoo', value_json: 'true' },
  { group_code: 'ic_banyo', key: 'body_soap', value_json: 'true' },
  { group_code: 'dis_hizmet', key: 'secure_parking', value_json: 'true' },
  { group_code: 'dis_hizmet', key: 'tv_smart', value_json: 'true' },
  { group_code: 'dis_hizmet', key: 'elevator', value_json: 'true' },
  { group_code: 'dis_hizmet', key: 'reception_24h', value_json: 'true' },
  { group_code: 'dis_hizmet', key: 'breakfast', value_json: 'true' },
]

/** Demo otel sözleşmesi — API sözleşmesi yoksa Kurallar bölümünde gösterilir. */
export const HOTEL_DEMO_CONTRACT = {
  title: 'Astan Hotel Galata Konaklama Sözleşmesi',
  body_text: `<p>Bu sözleşme, Astan Hotel Galata tesisinde konaklama hizmeti alan misafir ile tesis arasında geçerlidir.</p>
<ul>
<li>Check-in saati 14:00, check-out saati 11:00'dır.</li>
<li>Rezervasyon onayı ve ön ödeme koşulları checkout sırasında belirtilen tutarlara tabidir.</li>
<li>İptal ve değişiklik koşulları seçilen tarife göre uygulanır; detaylar rezervasyon onayında yer alır.</li>
<li>Tesis, güvenlik ve konfor kurallarına uymayan misafirlerin konaklamasını sonlandırma hakkını saklı tutar.</li>
<li>Minibar ve oda servisi gibi ek hizmetler ücretlidir.</li>
</ul>
<p>Rezervasyonu tamamlayarak bu sözleşme hükümlerini okuduğunuzu ve kabul ettiğinizi beyan etmiş olursunuz.</p>`,
} as const

/** Setur tarzı tesis detay accordion — demo otel (Astan). */
export const HOTEL_DEMO_FACILITY_SECTIONS: readonly HotelFacilityAccordionSection[] = [
  {
    id: 'child_services',
    title: 'Çocuk Hizmetleri',
    items: ['Bebek yatağı talep üzerine (sınırlı sayıda)', 'Aile odaları mevcuttur'],
  },
  {
    id: 'food_beverage',
    title: 'Yiyecek & İçecek',
    items: [
      'Açık büfe kahvaltı (07:30–10:30)',
      'Lobby kafe & lounge',
      'Oda servisi (ücretli)',
    ],
  },
  {
    id: 'pool_beach',
    title: 'Havuz & Plaj',
    bodyHtml:
      '<p>Şehir oteli konumunda denize sıfır veya havuz hizmeti bulunmamaktadır. Karaköy sahil yürüyüş yolu yürüme mesafesindedir.</p>',
  },
  {
    id: 'facility_services',
    title: 'Tesis Hizmetleri',
    items: [
      '24 saat resepsiyon',
      'Ücretsiz yüksek hızlı Wi-Fi',
      'Günlük oda temizliği',
      'Asansör',
      'Bagaj emanet',
    ],
  },
  {
    id: 'spa_health',
    title: 'Spa & Sağlık',
    items: ['Spa hizmeti bulunmamaktadır. Yakın çevrede fitness salonları mevcuttur.'],
  },
  {
    id: 'sports_fun',
    title: 'Spor & Eğlence',
    items: ['Tesis içi spor alanı yoktur. İstiklal Caddesi ve Galata çevresi yürüyüş rotaları idealdir.'],
  },
  {
    id: 'honeymoon',
    title: 'Balayı',
    items: ['Özel balayı paketi sunulmamaktadır; oda süsleme talep üzerine değerlendirilir.'],
  },
  {
    id: 'location',
    title: 'Konum',
    bodyHtml:
      '<p>Galata Kulesi, Tünel ve İstiklal Caddesi yürüme mesafesinde. Karaköy iskeleleri ve toplu taşıma hatlarına kolay erişim. Sabiha Gökçen Havalimanı yaklaşık 45 km, İstanbul Havalimanı yaklaşık 40 km mesafededir.</p>',
  },
  {
    id: 'awards',
    title: 'Ödüller ve Sertifikalar',
    items: ['Kültür ve Turizm Bakanlığı işletme belgeli butik otel.'],
  },
  {
    id: 'pets',
    title: 'Evcil Hayvan Kabul Şartları',
    items: ['Evcil hayvan kabul edilmemektedir.'],
  },
]

/** Harita altı mesafe kartları — API verisi yoksa demo otelde gösterilir. */
export const HOTEL_DEMO_DISTANCES: {
  historic: HotelDistanceItem[]
  surroundings: HotelDistanceItem[]
  transport: HotelDistanceItem[]
} = {
  historic: [
    { name: 'Galata Kulesi', distanceKm: 0.3 },
    { name: 'Tünel', distanceKm: 0.2 },
    { name: 'İstiklal Caddesi', distanceKm: 0.5 },
  ],
  surroundings: [
    { name: 'Karaköy', distanceKm: 0.8 },
    { name: 'Eminönü', distanceKm: 1.2 },
    { name: 'Sultanahmet', distanceKm: 2.8 },
  ],
  transport: [
    { name: 'İstanbul Havalimanı', distanceKm: 42.0 },
    { name: 'Sabiha Gökçen Havalimanı', distanceKm: 45.5 },
    { name: 'Sirkeci Marmaray', distanceKm: 1.5 },
  ],
}

type HotelDistanceColumns = {
  historic: HotelDistanceItem[]
  surroundings: HotelDistanceItem[]
  transport: HotelDistanceItem[]
}

const TRANSPORT_DISTANCE_PATTERN =
  /airport|havaliman|aeropuerto|aéroport|flughafen|аэропорт|机场|station|terminal|metro|subway|tram|train|railway|otogar|bus|ferry|port|harbour|harbor|marina|liman/i
const ESSENTIAL_DISTANCE_PATTERN =
  /hospital|hastane|pharmacy|eczane|clinic|medical|market|supermarket|grocery|shopping|mall|bazaar|çarşı|bank|atm|university|üniversite|commerce/i
const ATTRACTION_DISTANCE_PATTERN =
  /museum|müze|park|mosque|cami|church|kilise|stadium|stadyum|gallery|galeri|culture|kültür|congress|kongre|statue|heykel|sarcoph|lahit|beach|plaj|tower|kule|square|meydan|historic|tarih|castle|kale|palace|saray|theater|tiyatro/i

const DISTANCE_CATEGORY_COLUMN: Record<NearbyPoiCategory, keyof HotelDistanceColumns> = {
  beach: 'historic',
  ruins: 'historic',
  historic: 'historic',
  market: 'surroundings',
  restaurant: 'surroundings',
  hospital: 'surroundings',
  pharmacy: 'surroundings',
  airport: 'transport',
  bus_station: 'transport',
  port: 'transport',
  other: 'historic',
}

const VALID_DISTANCE_CATEGORIES = new Set<NearbyPoiCategory>(
  Object.keys(DISTANCE_CATEGORY_COLUMN) as NearbyPoiCategory[],
)

export function classifyDistanceItem(
  name: string,
  summary = '',
  explicitCategory?: string,
): { column: keyof HotelDistanceColumns; category: NearbyPoiCategory } {
  if (explicitCategory && VALID_DISTANCE_CATEGORIES.has(explicitCategory as NearbyPoiCategory)) {
    const category = explicitCategory as NearbyPoiCategory
    return { column: DISTANCE_CATEGORY_COLUMN[category], category }
  }

  const text = `${name} ${summary}`
  let category: NearbyPoiCategory
  // Belirgin türler önce: Limanağzı Plajı, "liman" içerdiği halde plajdır.
  if (/beach|plaj/i.test(text)) category = 'beach'
  else if (/archae|ören|antik kent|ancient city|ruins?|harabe|nekropol|sarkof|lahit/i.test(text)) category = 'ruins'
  else if (ATTRACTION_DISTANCE_PATTERN.test(text)) category = 'historic'
  else if (/restaurant|restoran|lokanta|meyhane|cafe|kafe/i.test(text)) category = 'restaurant'
  else if (/hospital|hastane|clinic|klinik|medical|sağlık/i.test(text)) category = 'hospital'
  else if (/pharmacy|eczane/i.test(text)) category = 'pharmacy'
  else if (/market|supermarket|grocery|alışveriş|\bbim\b|\ba101\b|migros|carrefour|\bdia\b|\bşok\b/i.test(text)) category = 'market'
  else if (/airport|havaliman|aeropuerto|aéroport|flughafen|аэропорт|机场/i.test(text)) category = 'airport'
  else if (/otogar|bus station|bus terminal|автовокзал|汽车站/i.test(text)) category = 'bus_station'
  else if (/ferry|port|harbour|harbor|marina|liman/i.test(text)) category = 'port'
  else if (TRANSPORT_DISTANCE_PATTERN.test(text)) category = 'port'
  else if (ESSENTIAL_DISTANCE_PATTERN.test(text)) category = 'market'
  else category = 'historic'

  return { column: DISTANCE_CATEGORY_COLUMN[category], category }
}

function parseProviderDistanceItem(raw: string): HotelDistanceItem | null {
  const match = String(raw ?? '').trim().match(/^(.+?):\s*(\d+(?:[.,]\d+)?)\s*(km|m)\s*$/i)
  if (!match) return null
  const value = Number(match[2].replace(',', '.'))
  if (!Number.isFinite(value)) return null
  return {
    name: match[1].trim(),
    distanceKm: match[3].toLowerCase() === 'm' ? value / 1000 : value,
  }
}

/** Sağlayıcının tek "Mesafeler" listesini anlamlı vitrin gruplarına ayırır. */
export function buildHotelDistanceColumnsFromFacilitySections(
  sections: readonly { items?: readonly string[] }[],
): HotelDistanceColumns {
  const result: HotelDistanceColumns = { historic: [], surroundings: [], transport: [] }
  const seen = new Set<string>()
  for (const section of sections) {
    for (const raw of section.items ?? []) {
      const item = parseProviderDistanceItem(raw)
      if (!item) continue
      const key = item.name.toLocaleLowerCase('tr').replace(/\s+/g, ' ')
      if (seen.has(key)) continue
      seen.add(key)
      const classified = classifyDistanceItem(item.name)
      result[classified.column].push({ ...item, category: classified.category })
    }
  }
  for (const items of Object.values(result)) items.sort((a, b) => a.distanceKm - b.distanceKm)
  return result
}

function distanceItemKey(name: string): string {
  return name.toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim()
}

function mergeDistanceItems(
  base: HotelDistanceItem[],
  extra: HotelDistanceItem[],
  limit: number,
): HotelDistanceItem[] {
  const seen = new Set(base.map((item) => distanceItemKey(item.name)).filter(Boolean))
  const out = [...base]
  for (const item of extra) {
    const key = distanceItemKey(item.name)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out.sort((a, b) => a.distanceKm - b.distanceKm).slice(0, limit)
}

/** Her alt türden 2–3 otomatik sonuç; yüksek popülerlikte en fazla 5. Manuel ekler daima korunur. */
export function limitDistanceItemsByCategory(
  items: HotelDistanceItem[],
  baseLimit = 3,
  popularLimit = 5,
): HotelDistanceItem[] {
  const byCategory = new Map<NearbyPoiCategory, HotelDistanceItem[]>()
  for (const item of items) {
    const category = item.category ?? 'other'
    byCategory.set(category, [...(byCategory.get(category) ?? []), item])
  }

  const selected: HotelDistanceItem[] = []
  for (const categoryItems of byCategory.values()) {
    const manual = categoryItems.filter((item) => item.manual)
    const automatic = categoryItems
      .filter((item) => !item.manual)
      .sort(
        (a, b) =>
          (b.popularity ?? 0) - (a.popularity ?? 0) ||
          a.distanceKm - b.distanceKm ||
          a.name.localeCompare(b.name, 'tr'),
      )
    const base = automatic.slice(0, baseLimit)
    const popularExtra = automatic
      .slice(baseLimit)
      .filter((item) => (item.popularity ?? 0) >= 90)
      .slice(0, Math.max(0, popularLimit - base.length))
    selected.push(...manual, ...base, ...popularExtra)
  }

  return selected.sort((a, b) => a.distanceKm - b.distanceKm)
}

export function buildHotelListingDistanceColumns(input: {
  nearbyPois: NearbyPoi[]
  servicePois: ListingServicePois
  useDemoFallback?: boolean
}): {
  historic: HotelDistanceItem[]
  surroundings: HotelDistanceItem[]
  transport: HotelDistanceItem[]
} {
  const sortedNearby = [...input.nearbyPois].sort(
    (a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0),
  )

  const nearbyColumns: HotelDistanceColumns = { historic: [], surroundings: [], transport: [] }
  for (const poi of sortedNearby.slice(0, 60)) {
    const name = String(poi.title ?? '').trim()
    if (!name) continue
    const classified = classifyDistanceItem(name, poi.summary, poi.category)
    nearbyColumns[classified.column].push({
      name,
      distanceKm: poi.distance_km ?? 0,
      category: classified.category,
      popularity: poi.popularity,
      manual: poi.manual,
    })
  }

  let historic = limitDistanceItemsByCategory(nearbyColumns.historic)
  let surroundings = limitDistanceItemsByCategory(nearbyColumns.surroundings)
  let transport = limitDistanceItemsByCategory(nearbyColumns.transport)

  if (input.servicePois.amenities.length > 0) {
    surroundings = mergeDistanceItems(
      surroundings,
      input.servicePois.amenities.map((poi) => {
        const name = poi.label?.trim() || poi.type
        return {
          name,
          distanceKm: poi.distance_km,
          category: classifyDistanceItem(name, poi.type).category,
        }
      }),
      16,
    )
    surroundings = limitDistanceItemsByCategory(surroundings)
  }

  if (input.servicePois.transport.length > 0) {
    transport = mergeDistanceItems(
      transport,
      input.servicePois.transport.map((poi) => {
        const name = poi.label?.trim() || poi.type
        return {
          name,
          distanceKm: poi.distance_km,
          category: classifyDistanceItem(name, poi.type).category,
        }
      }),
      16,
    )
    transport = limitDistanceItemsByCategory(transport)
  }

  if (input.useDemoFallback) {
    if (historic.length === 0) {
      historic = HOTEL_DEMO_DISTANCES.historic.map((item) => ({
        ...item,
        category: classifyDistanceItem(item.name).category,
      }))
    }
    if (surroundings.length === 0) {
      surroundings = HOTEL_DEMO_DISTANCES.surroundings.map((item) => ({
        ...item,
        category: classifyDistanceItem(item.name).category,
      }))
    }
    if (transport.length === 0) {
      transport = HOTEL_DEMO_DISTANCES.transport.map((item) => ({
        ...item,
        category: classifyDistanceItem(item.name).category,
      }))
    }
  }

  return { historic, surroundings, transport }
}

function classifyGoogleType(
  googleType: string,
  categoryId: string,
  name: string,
): { column: keyof HotelDistanceColumns; category: NearbyPoiCategory } {
  const gt = `${googleType} ${categoryId}`
  let explicit: NearbyPoiCategory | undefined
  if (/beach/.test(gt)) explicit = 'beach'
  else if (/archaeological|ruins|historic/.test(gt)) explicit = 'ruins'
  else if (/museum|tourist|landmark|castle/.test(gt)) explicit = 'historic'
  else if (/restaurant|cafe|yeme/.test(gt)) explicit = 'restaurant'
  else if (/hospital|clinic/.test(gt)) explicit = 'hospital'
  else if (/pharmacy/.test(gt)) explicit = 'pharmacy'
  else if (/supermarket|convenience|grocery|shopping_mall|store|market/.test(gt)) explicit = 'market'
  else if (/airport/.test(gt)) explicit = 'airport'
  else if (/bus_station|transit|train|subway|light_rail|otogar/.test(gt)) explicit = 'bus_station'
  else if (/ferry|port|marina|liman/.test(gt)) explicit = 'port'
  return classifyDistanceItem(name, gt, explicit)
}

/**
 * Bölge mekan verisinden (ilan koordinatına göre mesafe güncellenmiş)
 * otel/villa mesafe cetveli kolonları üretir — AI metni yok, yalnızca gerçek ad + km.
 */
export function buildDistanceColumnsFromRegionPlaces(
  data: {
    categories: {
      id: string
      types: {
        googleType: string
        places: { name: string; distanceKm: number; lat?: number; lng?: number }[]
      }[]
    }[]
  } | null | undefined,
  options?: { maxPerColumn?: number; maxKm?: number },
): HotelDistanceColumns {
  const empty: HotelDistanceColumns = { historic: [], surroundings: [], transport: [] }
  if (!data?.categories?.length) return empty

  const maxPer = options?.maxPerColumn ?? 8
  const maxKm = options?.maxKm ?? 80
  const buckets: HotelDistanceColumns = { historic: [], surroundings: [], transport: [] }
  const seen = new Set<string>()

  for (const cat of data.categories) {
    for (const tp of cat.types) {
      for (const place of tp.places) {
        const name = String(place.name ?? '').trim()
        const km = Number(place.distanceKm)
        if (!name || !Number.isFinite(km) || km <= 0 || km > maxKm) continue
        const key = distanceItemKey(name)
        if (!key || seen.has(key)) continue
        seen.add(key)
        const classified = classifyGoogleType(tp.googleType, cat.id, name)
        buckets[classified.column].push({ name, distanceKm: km, category: classified.category })
      }
    }
  }

  return {
    historic: limitDistanceItemsByCategory(buckets.historic).slice(0, maxPer),
    surroundings: limitDistanceItemsByCategory(buckets.surroundings).slice(0, maxPer),
    transport: limitDistanceItemsByCategory(buckets.transport).slice(0, maxPer),
  }
}

export function mergeHotelDistanceColumns(
  primary: HotelDistanceColumns,
  fallback: HotelDistanceColumns,
  limit = 30,
): HotelDistanceColumns {
  return {
    historic: limitDistanceItemsByCategory(
      mergeDistanceItems(primary.historic, fallback.historic, limit),
    ),
    surroundings: limitDistanceItemsByCategory(
      mergeDistanceItems(primary.surroundings, fallback.surroundings, limit),
    ),
    transport: limitDistanceItemsByCategory(
      mergeDistanceItems(primary.transport, fallback.transport, limit),
    ),
  }
}

export function hotelDistanceColumnsHaveItems(cols: HotelDistanceColumns | null | undefined): boolean {
  if (!cols) return false
  return cols.historic.length > 0 || cols.surroundings.length > 0 || cols.transport.length > 0
}

export const HOTEL_DEMO_GENERAL_TERMS_HTML = `<p>Check-in 14:00, check-out 11:00'dır. Erken giriş ve geç çıkış müsaitliğe bağlıdır ve ek ücrete tabi olabilir.</p>
<p>Rezervasyon onayında belirtilen iptal koşulları geçerlidir. Erken ayrılışlarda kalan gece bedeli tahsil edilebilir.</p>
<p>Tesis, güvenlik ve konfor kurallarına aykırı davranışlarda konaklamayı sonlandırma hakkını saklı tutar.</p>
<p>Minibar, oda servisi ve transfer gibi ek hizmetler ücretlidir.</p>`

function demoActivityDate(daysFromNow: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function demoNewYearDate(): string {
  const now = new Date()
  let year = now.getFullYear()
  const dec31 = new Date(year, 11, 31)
  dec31.setHours(0, 0, 0, 0)
  if (now > dec31) year += 1
  return `${year}-12-31`
}

/** Demo otel etkinlikleri — kampanya altı banner vitrin. */
export function buildHotelDemoActivities(): HotelListingActivity[] {
  return [
    {
      id: 'demo-hotel-activity-1',
      title: 'Yılbaşı Gala Konseri',
      title_en: 'New Year Gala Concert',
      description:
        'Canlı orkestra, gala yemeği ve gece yarısı kutlaması. O gece konaklayan misafirler için özel program.',
      description_en:
        'Live orchestra, gala dinner and midnight celebration. Special program for guests staying that night.',
      image_url: '',
      activity_date: demoNewYearDate(),
      stay_surcharge_amount: 2500,
      currency_code: 'TRY',
      sort_order: 0,
      is_active: true,
    },
    {
      id: 'demo-hotel-activity-2',
      title: 'Canlı Türk Gecesi',
      title_en: 'Live Turkish Night',
      description: 'Geleneksel gösteriler, meze tabağı ve sınırsız içecek.',
      description_en: 'Traditional show, meze platter and unlimited drinks.',
      image_url: '',
      activity_date: demoActivityDate(10),
      stay_surcharge_amount: 750,
      currency_code: 'TRY',
      sort_order: 1,
      is_active: true,
    },
    {
      id: 'demo-hotel-activity-3',
      title: 'Ücretsiz Açık Hava Konseri',
      title_en: 'Free Open-Air Concert',
      description: 'Otel avlusunda akustik konser — konaklama fiyatını etkilemez.',
      description_en: 'Acoustic concert in the hotel courtyard — does not affect room rates.',
      image_url: '',
      activity_date: demoActivityDate(14),
      stay_surcharge_amount: 0,
      currency_code: 'TRY',
      sort_order: 2,
      is_active: true,
    },
  ]
}
