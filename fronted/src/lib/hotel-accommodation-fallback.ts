/**
 * Public facet `accommodation` — API yokken select / filtre yedek listesi.
 * Kodlar backend facet seed ile uyumlu tutulmaya calisilir.
 */
export const HOTEL_ACCOMMODATION_FILTER_FALLBACK: { code: string; label: string }[] = [
  { code: 'room_only', label: 'Oda kahvaltısı dışında' },
  { code: 'bed_breakfast', label: 'Oda + kahvaltı' },
  { code: 'half_board', label: 'Yarım pansiyon' },
  { code: 'full_board', label: 'Tam pansiyon' },
  { code: 'all_inclusive', label: 'Her şey dahil' },
  { code: 'ultra_all_inclusive', label: 'Ultra her şey dahil' },
]
