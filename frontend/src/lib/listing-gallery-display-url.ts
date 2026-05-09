/**
 * İlan galerisi için tam çözünürlük URL'i.
 * Yükleme API'si `*-thumb.avif` üretir; yanlışlıkla DB'de thumb ana görsel olarak
 * kalırsa vitrin detayı/lightbox çok bulanık olur — `-thumb` eki yalnızca bu dosya adı
 * kalıbında (`...-thumb.avif`) kaldırılır.
 */
export function preferListingGalleryFullAsset(src: string): string {
  const s = src.trim()
  if (!s) return s
  if (!s.includes('/uploads/listings/')) return s
  if (!/-thumb\.avif$/i.test(s)) return s
  return s.replace(/-thumb\.avif$/i, '.avif')
}
