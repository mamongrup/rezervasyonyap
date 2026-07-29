/**
 * Yerel `/uploads/**` URL'lerini AVIF'e çevir (jpg/png/webp → .avif).
 * Harici CDN'e dokunmaz. Dosya yoksa kart `onError` kardeş uzantıya düşer
 * (`listing-image-url-fallbacks`); kalıcı onarım: convert + repair script.
 */
export function preferUploadsAvifUrl(url: string): string {
  const raw = url.trim()
  if (!raw) return raw
  if (!/\/uploads\//i.test(raw)) return raw
  if (/^https?:\/\//i.test(raw) && !/\/uploads\//i.test(raw)) return raw
  if (/\.avif(?:$|\?|#)/i.test(raw)) return raw
  return raw.replace(/\.(jpe?g|png|webp)(\?[^#]*)?(#.*)?$/i, '.avif$2$3')
}

/** @deprecated alias — hero dahil tüm uploads AVIF */
export function preferHeroAvifUrl(url: string): string {
  return preferUploadsAvifUrl(url)
}

export function preferHeroAvifTriple(
  urls: readonly [string, string, string],
): [string, string, string] {
  return [
    preferHeroAvifUrl(urls[0]),
    preferHeroAvifUrl(urls[1]),
    preferHeroAvifUrl(urls[2]),
  ]
}
