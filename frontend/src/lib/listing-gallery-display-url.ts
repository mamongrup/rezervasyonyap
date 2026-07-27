/**
 * İlan galerisi için tam çözünürlük URL'i.
 * Yükleme API'si `*-thumb.avif` üretir; yanlışlıkla DB'de thumb ana görsel olarak
 * kalırsa vitrin detayı/lightbox çok bulanık olur — bilinen thumb ekleri tam dosyaya çevrilir.
 *
 * AegeanHotels CDN (`*.aegeanhotels.net/data/Imgs/...`) tarayıcıdan sık 403 verir;
 * aynı path Bookeder `Photos/Big` aynasında açık — galeri URL'lerini oraya çeviririz.
 */

import { repairExternalListingImageExt } from '@/lib/listing-image-url-fallbacks'

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

  // Harici CDN: 379 sonrası yanlış .avif (ve 382 blanket .JPEG) onarımı
  s = repairExternalListingImageExt(s)

  const qIdx = s.indexOf('?')
  const hIdx = s.indexOf('#')
  const pathEnd = Math.min(
    qIdx === -1 ? s.length : qIdx,
    hIdx === -1 ? s.length : hIdx,
  )
  const path = s.slice(0, pathEnd)
  const suffix = s.slice(pathEnd)

  if (!path.toLowerCase().includes('/uploads/listings/')) return s

  let upgraded = path
  if (/-thumb\.avif$/i.test(upgraded)) upgraded = upgraded.replace(/-thumb\.avif$/i, '.avif')
  else if (/_thumb\.avif$/i.test(upgraded)) upgraded = upgraded.replace(/_thumb\.avif$/i, '.avif')
  else if (/-thumb\.webp$/i.test(upgraded)) upgraded = upgraded.replace(/-thumb\.webp$/i, '.webp')
  else if (/_thumb\.webp$/i.test(upgraded)) upgraded = upgraded.replace(/_thumb\.webp$/i, '.webp')
  // Not: diskte hâlâ .webp varken DB/önceki rewrite .avif yazmış olabilir.
  // Kör .webp→.avif dönüşümü gri kart üretir; kardeş uzantı `listing-image-url-fallbacks` ile denenir.

  return upgraded + suffix
}
