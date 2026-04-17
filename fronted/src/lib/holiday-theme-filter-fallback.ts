/**
 * API (`listPublicThemeItems`) yokken tatil evi tema filtresi — DB `239_category_theme_items` ile aynı kodlar.
 * Etiketler TR; API gelince yerel dil kullanılır.
 */
export const HOLIDAY_THEME_FILTER_FALLBACK: { code: string; label: string }[] = [
  { code: 'sea_view', label: 'Deniz manzaralı' },
  { code: 'beachfront', label: 'Denize sıfır' },
  { code: 'conservative', label: 'Muhafazakar' },
  { code: 'luxury', label: 'Lüks' },
  { code: 'honeymoon', label: 'Balayı' },
  { code: 'honeymoon_villa', label: 'Balayı villası' },
  { code: 'family', label: 'Aile' },
  { code: 'nature', label: 'Doğa içinde' },
  { code: 'historic', label: 'Tarihi / butik' },
]
