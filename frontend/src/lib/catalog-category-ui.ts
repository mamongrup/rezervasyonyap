/** Panel sırası (API sort_order ile hizalı). */
export const ORDERED_PRODUCT_CATEGORY_CODES = [
  'hotel',
  'holiday_home',
  'yacht_charter',
  'tour',
  'flight',
  'activity',
  'transfer',
  'ferry',
  'car_rental',
  'cruise',
  'hajj',
  'visa',
  'beach_lounger',
  'cinema_ticket',
  'event',
  'restaurant_table',
] as const

/**
 * product_categories.code ↔ panel etiketi + vertical tablo adı (dokümantasyon).
 * API’den gelen kodlar burada yoksa code ham gösterilir.
 */
export const CATEGORY_LABEL_TR: Record<string, string> = {
  hotel: 'Otel',
  holiday_home: 'Villa',
  yacht_charter: 'Yat',
  tour: 'Tur',
  flight: 'Uçak / otobüs',
  activity: 'Aktivite',
  transfer: 'Transfer',
  ferry: 'Feribot',
  car_rental: 'Araç',
  cruise: 'Gemi turları',
  hajj: 'Hac',
  visa: 'Vize',
  event: 'Etkinlik (konser, festival, tiyatro)',
  beach_lounger: 'Plajda şezlong',
  cinema_ticket: 'Sinema bileti',
  restaurant_table: 'Restoranda masa',
}

/**
 * DB vertical tablosu (listing_*_details) — geliştirici / iç dokümantasyon.
 * Arayüzde `verticalTableLabelTr` kullanın.
 */
export const CATEGORY_VERTICAL_TABLE: Record<string, string> = {
  hotel: 'listing_hotel_details (+ hotel_rooms)',
  holiday_home: 'listing_holiday_home_details',
  yacht_charter: 'listing_yacht_details',
  tour: 'listing_tour_details',
  flight: 'listing_flight_details (+ flight_legs)',
  activity: 'listing_activity_details',
  transfer: 'listing_transfer_details (+ transfer_zones)',
  ferry: 'listing_ferry_details',
  car_rental: 'listing_car_rental_details',
  cruise: 'listing_cruise_details',
  hajj: 'listing_hajj_details',
  visa: 'listing_visa_details',
  event: 'listing_event_details',
  beach_lounger: 'listing_beach_lounger_details',
  cinema_ticket: 'listing_cinema_details',
  restaurant_table: 'listing_restaurant_table_details',
}

/** Panelde gösterilecek kısa açıklama — ham tablo adı yerine. */
export const CATEGORY_VERTICAL_TABLE_LABEL_TR: Record<string, string> = {
  hotel: 'Otel bilgileri ve oda tipleri (yıldız, bağlantılar, odalar)',
  holiday_home: 'Villa / tatil evi özellikleri (tema, kurallar, takvim)',
  yacht_charter: 'Yat bilgileri (boy, kabin, liman)',
  tour: 'Tur paketi ve program detayları',
  flight: 'Uçuş veya otobüs hatları ve segmentler',
  activity: 'Aktivite oturumu ve süre bilgileri',
  transfer: 'Transfer bölgeleri ve araç sınıfı',
  ferry: 'Feribot hat ve tarife bilgileri',
  car_rental: 'Araç sınıfı ve kiralama özellikleri',
  cruise: 'Gemi turu ve kabin bilgileri',
  hajj: 'Hac / umre paket bilgileri',
  visa: 'Vize hedef ülkesi ve başvuru',
  event: 'Mekân, bilet ve etkinlik bilgileri',
  beach_lounger: 'Plaj ve şezlong düzeni',
  cinema_ticket: 'Sinema bileti ve seanslar',
  restaurant_table: 'Restoran masa ve rezervasyon',
}

/** Kullanıcıya gösterilecek “detay tablosu” açıklaması. */
export function verticalTableLabelTr(code: string): string {
  return CATEGORY_VERTICAL_TABLE_LABEL_TR[code] ?? 'Bu kategori için ek alanlar'
}

/** `listings` çekirdek kolonları — tüm kategoriler (panel rehberi). */
export const LISTING_CORE_FIELD_LINES = [
  'organization_id, category_id, slug, status, currency_code',
  'commission_percent, prepayment_*, first_charge_amount',
  'share_to_social, allow_ai_caption, min_stay_nights, cleaning_fee_amount, pool_size_label',
  'listing_translations: title, description (locale başına)',
] as const

/**
 * Kategori detay tablosu alanları (salt okunur rehber) — backend 180_verticals ile hizalı.
 */
export const CATEGORY_VERTICAL_FIELD_LINES: Record<string, readonly string[]> = {
  holiday_home: ['theme_codes[]', 'rule_codes[]', 'ical_managed'],
  yacht_charter: ['length_meters', 'cabin_count', 'port_lat', 'port_lng'],
  car_rental: ['vehicle_class', 'transmission', 'fuel_type', 'yolcu360_product_ref'],
  transfer: ['(çekirdek boş) + transfer_zones: zone_role, location_label, merkez lat/lng, price_per_vehicle_class'],
  hotel: ['star_rating', 'etstur_property_ref', 'tatilcom_property_ref', 'hotel_rooms: name, capacity, board_type'],
  flight: ['turna_route_ref', 'flight_legs: mode (flight|bus), from_stop, to_stop'],
  tour: ['wtatil_package_ref', 'is_manual', 'program_days_json'],
  activity: ['session_based', 'full_day'],
  ferry: ['route_code', 'timetable_url'],
  visa: ['destination_country (ISO-2)'],
  cinema_ticket: ['cinema_chain', 'showtimes_json'],
  beach_lounger: ['beach_name', 'grid_json'],
  cruise: ['cruise_line', 'ship_name', 'route_summary', 'cabin_category', 'external_cruise_ref', 'meta_json'],
  hajj: ['package_type', 'departure_city', 'duration_days', 'meta_json'],
  event: ['venue_name', 'venue_address', 'starts_at', 'ends_at', 'ticket_tiers_json', 'meta_json'],
  restaurant_table: [
    'restaurant_name',
    'external_pos_venue_ref',
    'party_size_min / max',
    'slot_duration_minutes',
    'meta_json',
  ],
}

export function categoryLabelTr(code: string): string {
  return CATEGORY_LABEL_TR[code] ?? code.replace(/_/g, ' ')
}

/** URL `[code]` segmenti — `product_categories.code` ile uyumlu. */
export const CATALOG_CATEGORY_CODE_RE = /^[a-z][a-z0-9_]*$/

/** Geçersiz segment için `null` (404’e yönlendirmek için). */
export function parseCatalogCategoryCodeParam(raw: string): string | null {
  const normalized = decodeURIComponent(raw).trim().toLowerCase()
  return CATALOG_CATEGORY_CODE_RE.test(normalized) ? normalized : null
}

export type CatalogCategoryRow = {
  id: number
  code: string
  name_key: string
  parent_id: number | null
  sort_order: number
  is_active: boolean
  allows_manual_source: boolean
  allows_api_source: boolean
}

/** API kapalıyken veya hata — sidebar yedek listesi. */
export function fallbackProductCategories(): CatalogCategoryRow[] {
  return ORDERED_PRODUCT_CATEGORY_CODES.map((code, i) => ({
    id: i + 1,
    code,
    name_key: `cat.${code}`,
    parent_id: null,
    sort_order: (i + 1) * 10,
    is_active: true,
    allows_manual_source: true,
    allows_api_source: true,
  }))
}
