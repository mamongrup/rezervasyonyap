/**
 * Vitrin kartı görselleri: DB `.avif` derken diskte hâlâ `.webp` (veya tersi) olabilir.
 * 404 sonrası kardeş uzantıyı dene — gri placeholder yerine gerçek foto.
 */

const UPLOAD_EXT_RE = /\.(avif|webp|jpe?g|png)$/i
const BOOKEDER_AVIF_RE = /\.avif(\?|#|$)/i

/** Bookeder orijinali `.JPEG`; migration 379 yanlışlıkla `.avif` yazdı. */
export function repairBookederImageExt(src: string): string {
  const s = src.trim()
  if (!s || !/bookeder\.com/i.test(s)) return s
  if (!BOOKEDER_AVIF_RE.test(s)) return s
  return s.replace(/\.avif/i, '.JPEG')
}

/**
 * Aynı path için sıradaki alternatif uzantı.
 * Proxy URL (`/api/listing-ext-image?u=...`) içindeki upstream de düzeltilir.
 */
export function nextListingImageUrlFallback(
  currentUrl: string,
  tried: ReadonlySet<string>,
): string | null {
  const current = currentUrl.trim()
  if (!current) return null

  const isProxy = current.startsWith('/api/listing-ext-image?')
  let working = current
  let proxyPrefix = ''
  if (isProxy) {
    try {
      const u = new URL(current, 'http://local.invalid')
      const upstream = u.searchParams.get('u')
      if (!upstream) return null
      proxyPrefix = '/api/listing-ext-image?u='
      working = upstream
    } catch {
      return null
    }
  }

  const repaired = repairBookederImageExt(working)
  if (repaired !== working) {
    const candidate = isProxy ? proxyPrefix + encodeURIComponent(repaired) : repaired
    if (!tried.has(candidate)) return candidate
  }

  const qIdx = working.indexOf('?')
  const hIdx = working.indexOf('#')
  const pathEnd = Math.min(
    qIdx === -1 ? working.length : qIdx,
    hIdx === -1 ? working.length : hIdx,
  )
  const path = working.slice(0, pathEnd)
  const suffix = working.slice(pathEnd)
  if (!UPLOAD_EXT_RE.test(path) && !/\.avif$/i.test(path)) return null

  // Yerel uploads veya aynı stem'li harici dosyalar.
  const order = ['.avif', '.webp', '.jpg', '.jpeg', '.JPEG', '.png'] as const
  const m = path.match(UPLOAD_EXT_RE) || path.match(/(\.avif)$/i)
  if (!m) return null
  const currentExt = m[0]
  const stem = path.slice(0, path.length - currentExt.length)
  const start = Math.max(
    0,
    order.findIndex((e) => e.toLowerCase() === currentExt.toLowerCase()),
  )

  for (let step = 1; step <= order.length; step++) {
    const ext = order[(start + step) % order.length]!
    if (ext.toLowerCase() === currentExt.toLowerCase()) continue
    const nextPath = stem + ext + suffix
    const candidate = isProxy ? proxyPrefix + encodeURIComponent(nextPath) : nextPath
    if (!tried.has(candidate)) return candidate
  }
  return null
}
