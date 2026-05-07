/**
 * Türkçe harfleri Latin harflere çevirir (ASCII URL slug).
 * JS'te `İ`.toLowerCase() bazen birleşik nokta üretir — normalize ile temizlenir.
 */
export function transliterateTurkishForSlug(s: string): string {
  let t = s
    .replace(/Ğ/g, 'g')
    .replace(/Ü/g, 'u')
    .replace(/Ş/g, 's')
    .replace(/İ/g, 'i')
    .replace(/Ö/g, 'o')
    .replace(/Ç/g, 'c')
    .replace(/I/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .toLowerCase()
  t = t.normalize('NFD').replace(/\u0307/g, '').normalize('NFC')
  return t
}

/** İlan yayın adresi: boşluk → tire; yalnız `a-z0-9-` (backend `slug_ok` ile uyumlu). */
export function slugifyListingSlug(s: string, maxLength = 120): string {
  return transliterateTurkishForSlug(s)
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
}

/** Blog / koleksiyon / ülke kodu vb.: kelime ayırıcılar tire olur. */
export function slugifyAsciiHyphenSlug(s: string, maxLength = 200): string {
  return transliterateTurkishForSlug(s)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
}

/** `location_pages.slug_path` düzenlemesi — `/` korunur. */
export function slugifyRegionSlugPathInput(raw: string): string {
  return transliterateTurkishForSlug(raw)
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9/-]/g, '')
}

/** Bölge adından tek segment (path birleştirmesi için). */
export function slugifyRegionSlugTail(text: string): string {
  return transliterateTurkishForSlug(text)
    .replace(/[^a-z0-9/\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}
