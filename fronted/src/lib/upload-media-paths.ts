/**
 * Medya yükleme alt yolları — /api/upload-image ile uyumlu güvenli segmentler.
 */

/** Ürün kategorisi kodu → `ilanlar/{klasör}/…` içindeki klasör adı */
export function listingCategoryFolder(code: string): string {
  const k = code.trim().toLowerCase()
  const map: Record<string, string> = {
    hotel: 'oteller',
    holiday_home: 'tatil-evleri',
    yacht_charter: 'yatlar',
    car_rental: 'arac-kiralama',
    tour: 'turlar',
    activity: 'aktiviteler',
    flight: 'ucuslar',
    transfer: 'transferler',
    ferry: 'feribotlar',
    cruise: 'gemi-turlari',
    visa: 'vizeler',
    cinema_ticket: 'sinema',
    beach_lounger: 'plaj-sezlong',
  }
  return map[k] ?? k.replace(/_/g, '-')
}

/** Ürün kategorisi kodu → medya klasör adı (eski API uyumu; tercih `listingCategoryFolder`). */
export function categoryCodeToMediaFolder(code: string): string {
  return listingCategoryFolder(code)
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
 * Örnek: `ilanlar/oteller/ahmet-otel` → dosyalar `ahmet-otel-1.avif`, …
 */
export function listingImageSubPath(categoryCode: string, listingSlug: string): string {
  const b = slugifyMediaSegment(listingSlug)
  const cat = listingCategoryFolder(categoryCode)
  return `ilanlar/${cat}/${b}`
}

/** Blog yazısı görselleri — `icerik/blog/{slug}` */
export function blogPostMediaSubPath(postSlug: string): string {
  return `blog/${slugifyMediaSegment(postSlug)}`
}

/** @deprecated Kullanın: `blogPostMediaSubPath` */
export function blogImageSubPath(postSlug: string): string {
  return blogPostMediaSubPath(postSlug)
}

/** CMS sayfa görselleri — `icerik/sayfalar/{slug}` */
export function cmsPageMediaSubPath(pageSlug: string): string {
  return `sayfalar/${slugifyMediaSegment(pageSlug)}`
}

/** Blog kategori görseli — `icerik/blog-kategori/{slug}` */
export function blogCategoryMediaSubPath(categorySlug: string): string {
  return `blog-kategori/${slugifyMediaSegment(categorySlug)}`
}
