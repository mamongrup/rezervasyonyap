/**
 * Medya yükleme alt yolları — /api/upload-image ile uyumlu güvenli segmentler.
 */

/** Ürün kategorisi kodu → medya klasör adı (ilanlar/… altı). */
export function categoryCodeToMediaFolder(code: string): string {
  const k = code.trim().toLowerCase()
  const map: Record<string, string> = {
    hotel: 'otel',
    holiday_home: 'tatil-evi',
    yacht_charter: 'yat',
    car_rental: 'arac',
    tour: 'tur',
    activity: 'aktivite',
    flight: 'ucus',
    transfer: 'transfer',
    ferry: 'feribot',
    cruise: 'gemi-turu',
    visa: 'vize',
    cinema_ticket: 'sinema',
    beach_lounger: 'plaj-sezlong',
  }
  return map[k] ?? k.replace(/_/g, '-')
}

export function slugifyMediaSegment(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 96) || 'item'
}

/**
 * İlan görselleri — `public/uploads/listings/` altındaki relatif alt yol (API’de `subPath`).
 * Villa (tatil evi): `ilanlar/tatil-evleri/{ilan-slug}` — diğer kategoriler: `{kategori-klasoru}/{ilan-slug}`.
 */
export function listingImageSubPath(categoryCode: string, listingSlug: string): string {
  const b = slugifyMediaSegment(listingSlug)
  const k = categoryCode.trim().toLowerCase()
  if (k === 'holiday_home') {
    return `ilanlar/tatil-evleri/${b}`
  }
  const a = categoryCodeToMediaFolder(categoryCode)
  return `${a}/${b}`
}

/** Blog: blog/{yazi-slug} */
export function blogImageSubPath(postSlug: string): string {
  return slugifyMediaSegment(postSlug)
}
