/**
 * `public/region-places/{slug}.json` dosya adlarıyla uyumlu bölge slug'ı.
 * Sokak adresi kullanmayın — şehir / bölge adı kullanın.
 */

import { slugifyAsciiHyphenSlug } from '@/lib/slug-latin-tr'

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
  const t = slugifyAsciiHyphenSlug(city.trim(), 120)
  return t.length ? t : undefined
}

/** Adres / konum satırından breadcrumb için kısa okunur etiket (ilk iki virgül segmenti). */
export function shortRegionLabelFromLocationPin(pin: string | undefined | null): string {
  const raw = pin?.trim()
  if (!raw) return ''
  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean)
  if (!parts.length) return ''
  return parts.slice(0, 2).join(', ')
}

/**
 * `tatil-evleri/[slug]` ile uyumlu slug — önce posta kodlu şehir segmenti, yoksa ülke adını atlayarak geriye doğru.
 */
export function regionBrowseSlugFromLocationPin(pin: string | undefined | null): string | undefined {
  const raw = pin?.trim()
  if (!raw) return undefined

  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean)
  if (!parts.length) return undefined

  const trySlug = (segment: string): string | undefined => {
    let s = segment.trim()
    if (!s || !/[a-zA-ZğüşıöçĞÜŞİÖÇ]/.test(s)) return undefined
    s = s.replace(/^\d{4,6}\s+/, '').trim()
    const cityPart = s.split('/')[0]?.trim() ?? s
    if (!cityPart || !/[a-zA-ZğüşıöçĞÜŞİÖÇ]/.test(cityPart)) return undefined
    const slug = slugifyAsciiHyphenSlug(cityPart, 80)
    return slug.length ? slug : undefined
  }

  const skipCountry = /^(türkiye|turkey|türkiye cumhuriyeti)$/i

  for (const segment of parts) {
    const postalCity = segment.match(/\b(\d{4,6})\s+(.+)/)
    if (postalCity?.[2]) {
      const slug = trySlug(postalCity[2])
      if (slug) return slug
    }
  }

  for (let i = parts.length - 1; i >= 0; i--) {
    if (skipCountry.test(parts[i])) continue
    const slug = trySlug(parts[i])
    if (slug) return slug
  }

  return undefined
}
