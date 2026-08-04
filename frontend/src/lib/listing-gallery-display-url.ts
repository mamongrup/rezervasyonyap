/**
 * İlan galerisi için tam çözünürlük URL'i.
 * Yükleme API'si `*-thumb.avif` üretir; yanlışlıkla DB'de thumb ana görsel olarak
 * kalırsa vitrin detayı/lightbox çok bulanık olur — bilinen thumb ekleri tam dosyaya çevrilir.
 *
 * AegeanHotels CDN (`*.aegeanhotels.net/data/Imgs/...`) tarayıcıdan sık 403 verir;
 * aynı path Bookeder `Photos/Big` aynasında açık — galeri URL'lerini oraya çeviririz.
 */

import { repairExternalListingImageExt } from '@/lib/listing-image-url-fallbacks'
import { preferUploadsAvifUrl } from '@/lib/prefer-hero-avif'

const AEGEAN_IMGS_RE =
  /^https:\/\/[^/]+\.aegeanhotels\.net\/data\/Imgs\/(?:1920x1080w|OriginalPhoto)\//i

export function unwrapKplusCdnUrl(src: string): string {
  const s = src.trim()
  if (!s || !/cdn\.kplus\.com\.tr/i.test(s)) return s
  try {
    const u = new URL(s)
    const rawUrlParam = u.searchParams.get('url')
    if (!rawUrlParam) return s
    let decoded = ''
    try {
      if (typeof window !== 'undefined' && typeof window.atob === 'function') {
        decoded = window.atob(rawUrlParam)
      } else if (typeof Buffer !== 'undefined') {
        decoded = Buffer.from(rawUrlParam, 'base64').toString('utf-8')
      }
    } catch {
      return s
    }
    decoded = decoded.trim()
    if (!decoded) return s
    if (/^https?:\/\//i.test(decoded)) return decoded
    return `https://${decoded}`
  } catch {
    return s
  }
}

export function rewriteAegeanHotelsImageToBookeder(src: string): string {
  const s = unwrapKplusCdnUrl(src.trim())
  if (!s || !AEGEAN_IMGS_RE.test(s)) return s
  try {
    const u = new URL(s)
    const m = u.pathname.match(
      /^\/data\/Imgs\/(?:1920x1080w|OriginalPhoto)\/(\d+\/\d+\/\d+\/[^/]+\.jpe?g)$/i,
    )
    if (!m) return s
    return `https://bookeder.com/data/Photos/Big/${m[1]}`
  } catch {
    return s
  }
}

export function preferListingGalleryFullAsset(src: string): string {
  let s = rewriteAegeanHotelsImageToBookeder(src.trim())
  if (!s) return s

  // Harici CDN + TatilBudur kırık yerel rehost → productcdn
  s = repairExternalListingImageExt(s)

  // Reserwation: kapak çoğu zaman -thumbnail; mümkünse tam boy dene (404 → onError fallback)
  if (/^https?:\/\/([^/]+\.)?reserwation\.com\//i.test(s) && /-thumbnail\./i.test(s)) {
    s = s.replace(/-thumbnail\./i, '.')
  }

  const qIdx = s.indexOf('?')
  const hIdx = s.indexOf('#')
  const pathEnd = Math.min(
    qIdx === -1 ? s.length : qIdx,
    hIdx === -1 ? s.length : hIdx,
  )
  const path = s.slice(0, pathEnd)
  const suffix = s.slice(pathEnd)

  // CDN'e çevrildiyse yerel AVIF yükseltmesine girme
  if (!path.toLowerCase().includes('/uploads/')) return s

  let upgraded = path
  // Thumb → full; webp/jpg thumb de AVIF full'a (AVIF-only politika)
  if (/-thumb\.(avif|webp|jpe?g|png)$/i.test(upgraded)) {
    upgraded = upgraded.replace(/-thumb\.(avif|webp|jpe?g|png)$/i, '.avif')
  } else if (/_thumb\.(avif|webp|jpe?g|png)$/i.test(upgraded)) {
    upgraded = upgraded.replace(/_thumb\.(avif|webp|jpe?g|png)$/i, '.avif')
  } else {
    upgraded = preferUploadsAvifUrl(upgraded)
  }

  return upgraded + suffix
}
