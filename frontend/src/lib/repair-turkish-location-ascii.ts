/**
 * Aktarımda Türkçe harfler ASCII `?` olmuş adres/konum metinlerini onarır.
 * Sunucu migration 410 ile aynı kalıpların panel tarafı (yükleme anı).
 */
const LOCATION_ASCII_PAIRS: [string, string][] = [
  ['?l?deniz', 'Ölüdeniz'],
  ['Kayak?y', 'Kayaköy'],
  ['Ovac?k', 'Ovacık'],
  ['T?rkiye', 'Türkiye'],
  ['Mu?la', 'Muğla'],
  ['Kaputa?', 'Kaputaş'],
  ['?slamlar', 'İslamlar'],
  ['Ka?', 'Kaş'],
  ['Fo?a', 'Foça'],
  ['Dat?a', 'Datça'],
  ['?e?me', 'Çeşme'],
  ['Cal??', 'Çalış'],
  ['?al??', 'Çalış'],
]

export function repairTurkishLocationAscii(input: string | null | undefined): string {
  if (input == null) return ''
  let out = String(input)
  for (const [from, to] of LOCATION_ASCII_PAIRS) {
    if (out.includes(from)) out = out.split(from).join(to)
  }
  return out
}
