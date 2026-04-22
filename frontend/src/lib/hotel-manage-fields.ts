/**
 * Otel `hotel_type` ve `theme` facet — API yokken yönetim / ilan formları yedek seçenekleri.
 */
export const HOTEL_TYPE_OPTIONS: { code: string; label: string }[] = [
  { code: 'resort', label: 'Tatil köyü' },
  { code: 'hotel', label: 'Otel' },
  { code: 'boutique', label: 'Butik otel' },
  { code: 'motel', label: 'Motel' },
  { code: 'pension', label: 'Pansiyon' },
  { code: 'apart_hotel', label: 'Apart otel' },
]

export const HOTEL_THEME_OPTIONS: { code: string; label: string }[] = [
  { code: 'sea_view', label: 'Deniz manzaralı' },
  { code: 'beachfront', label: 'Denize sıfır' },
  { code: 'family', label: 'Aile' },
  { code: 'honeymoon', label: 'Balayı' },
  { code: 'luxury', label: 'Lüks' },
  { code: 'nature', label: 'Doğa içinde' },
  { code: 'ski', label: 'Kayak' },
  { code: 'spa', label: 'Spa & wellness' },
]
