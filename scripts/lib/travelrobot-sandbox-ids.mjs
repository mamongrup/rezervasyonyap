/**
 * KPlus / Travelrobot sandbox — resmi test destinasyon ve otel kodları.
 * Kaynak: KPlus test ortamı dokümantasyonu (channel sağlayıcı).
 */

/** @type {Record<string, { id: string, name: string }>} */
export const TRAVELROBOT_SANDBOX_DESTINATIONS = {
  prague: { id: '531096', name: 'Prague' },
  berlin: { id: '587926', name: 'Berlin' },
  istanbul: { id: '10033097', name: 'Istanbul' },
}

/**
 * @type {Array<{ code: string, name: string, destinationId: string | null }>}
 */
export const TRAVELROBOT_SANDBOX_HOTELS = [
  { code: 'KCZ466838', name: 'Cosmopolitan Hotel Prague', destinationId: '531096' },
  { code: 'KCZ639147', name: 'Hilton Prague', destinationId: '531096' },
  { code: 'KDE646930', name: 'Pullman Berlin Schweizerhof', destinationId: '587926' },
  { code: 'KDE393226', name: 'Sheraton Berlin Grand Hotel Esplanade', destinationId: '587926' },
  { code: 'KTR431805', name: 'Radisson Blu Hotel', destinationId: '10033097' },
  { code: 'KTR672265', name: 'Hilton Istanbul Bomonti Hotel & Conference Center', destinationId: '10033097' },
  { code: 'KTR3284005', name: 'Ibis Izmir Alsancak Test', destinationId: null },
]

/** Senaryo testi: destinasyon → birincil sertifikasyon oteli */
export const CERT_HOTEL_BY_DESTINATION = {
  10033097: 'KTR431805',
  531096: 'KCZ466838',
  587926: 'KDE646930',
}

/** Senaryo testi: destinasyon → yedek otel kodları */
export const CERT_HOTEL_FALLBACKS = {
  10033097: ['KTR672265'],
  531096: ['KCZ639147'],
  587926: ['KDE393226'],
}

export const DEFAULT_HOTEL_DESTINATION_ID = TRAVELROBOT_SANDBOX_DESTINATIONS.istanbul.id
