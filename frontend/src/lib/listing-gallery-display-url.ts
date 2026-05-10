/**
 * İlan galerisi için tam çözünürlük URL'i.
 * Yükleme API'si `*-thumb.avif` üretir; yanlışlıkla DB'de thumb ana görsel olarak
 * kalırsa vitrin detayı/lightbox çok bulanık olur — bilinen thumb ekleri tam dosyaya çevrilir.
 */
export function preferListingGalleryFullAsset(src: string): string {
  const s = src.trim()
  if (!s) return s

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

  return upgraded + suffix
}
