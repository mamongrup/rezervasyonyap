/**
 * `public/region-places/{slug}.json` dosya adlarıyla uyumlu bölge slug'ı.
 * Sokak adresi kullanmayın — şehir / bölge adı kullanın.
 */

/** `location_pages.slug_path` (`tr/mugla/fethiye`) → bölge sayfası `slug.join('-')` ile aynı dosya anahtarı */
export function regionPlacesSlugFromSlugPath(slugPath: string | undefined | null): string {
  const t = String(slugPath ?? '')
    .trim()
    .replace(/^\/+|\/+$/g, '')
  if (!t) return ''
  return t
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean)
    .join('-')
}

export function regionPlacesSlugFromCity(city: string | undefined | null): string | undefined {
  if (!city?.trim()) return undefined
  const t = city
    .trim()
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i')
    .replace(/ı/g, 'i')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
  return t.length ? t : undefined
}
