/** Demo otel vitrin içeriği — Astan Hotel Galata (canlı API slug). */
import type { ListingReviewCriteriaSummary } from '@/lib/listing-review-criteria'
import type { HotelDistanceItem } from '@/components/travel/HotelListingDistancesSection'
import type { HotelFacilityAccordionSection } from '@/lib/hotel-facility-sections'
import type { ListingServicePois, NearbyPoi, HotelListingActivity } from '@/lib/travel-api'

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

  let historic = sortedNearby.slice(0, 3).map((poi) => ({
    name: poi.title,
    distanceKm: poi.distance_km ?? 0,
  }))

  let surroundings = sortedNearby.slice(3, 6).map((poi) => ({
    name: poi.title,
    distanceKm: poi.distance_km ?? 0,
  }))

  if (surroundings.length === 0 && input.servicePois.amenities.length > 0) {
    surroundings = input.servicePois.amenities.slice(0, 3).map((poi) => ({
      name: poi.label?.trim() || poi.type,
      distanceKm: poi.distance_km,
    }))
  }

  let transport = input.servicePois.transport.slice(0, 3).map((poi) => ({
    name: poi.label?.trim() || poi.type,
    distanceKm: poi.distance_km,
  }))

  if (input.useDemoFallback) {
    if (historic.length === 0) historic = [...HOTEL_DEMO_DISTANCES.historic]
    if (surroundings.length === 0) surroundings = [...HOTEL_DEMO_DISTANCES.surroundings]
    if (transport.length === 0) transport = [...HOTEL_DEMO_DISTANCES.transport]
  }

  return { historic, surroundings, transport }
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
