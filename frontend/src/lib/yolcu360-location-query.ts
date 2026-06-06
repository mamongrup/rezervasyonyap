/** Yolcu360 konum API'si ASCII/Latin bekler; Türkçe İ/ş/ğ URL'de invalid_uri üretir. */
export function normalizeYolcu360PickupQuery(raw: string): string {
  const s = raw.trim()
  if (!s) return s
  return s
    .replace(/İ/g, 'I')
    .replace(/ı/g, 'i')
    .replace(/Ğ/g, 'G')
    .replace(/ğ/g, 'g')
    .replace(/Ü/g, 'U')
    .replace(/ü/g, 'u')
    .replace(/Ş/g, 'S')
    .replace(/ş/g, 's')
    .replace(/Ö/g, 'O')
    .replace(/ö/g, 'o')
    .replace(/Ç/g, 'C')
    .replace(/ç/g, 'c')
}
