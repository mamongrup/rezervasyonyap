/**
 * Vitrin hero kolajı — panel hâlâ `.jpg` URL tutsa bile aynı basename `.avif`
 * varsa onu kullan (LCP + "modern image formats" PSI). Dosya sunucuda
 * `scripts/optimize-hero-uploads.mjs` ile üretilir; yoksa orijinal URL kalır
 * (404 riski yok — rewrite yalnızca bilinen hero upload yolu için).
 *
 * Not: AVIF dosyasının varlığı runtime'da kontrol edilmez (RSC kenarında fs
 * yok). Optimize script deploy sonrası çalıştırılmalıdır.
 */
export function preferHeroAvifUrl(url: string): string {
  const raw = url.trim()
  if (!raw) return raw
  // Yalnızca kendi hero upload'larımız — harici CDN'e dokunma.
  if (!/\/uploads\/general\/hero\//i.test(raw)) return raw
  if (/\.avif(?:$|\?)/i.test(raw)) return raw
  return raw.replace(/\.(jpe?g|png|webp)(\?[^#]*)?(#.*)?$/i, '.avif$2$3')
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
