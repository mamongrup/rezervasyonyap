/**
 * Vitrin görselleri: DB `.avif` derken diskte `.webp` veya harici CDN gerçek uzantısı farklı olabilir.
 * 404/403 sonrası kardeş uzantıyı dene — gri/kırık ikon yerine gerçek foto.
 */

const PATH_EXT_RE = /\.(avif|webp|jpe?g|png)$/i

/**
 * Migration 379 tüm URL'leri `.avif` yaptı; CDN gerçek uzantıları farklı:
 * - Bookeder → `.JPEG` (case-sensitive)
 * - TatilBudur productcdn → `.jpg` (`.avif` 403, `.JPEG` 500)
 */
export function repairExternalListingImageExt(src: string): string {
  const s = src.trim()
  if (!s || !/^https?:\/\//i.test(s)) return s
  try {
    const host = new URL(s).hostname.toLowerCase()
    if (host === 'bookeder.com' || host.endsWith('.bookeder.com')) {
      if (/\.avif(\?|#|$)/i.test(s)) return s.replace(/\.avif/i, '.JPEG')
      return s
    }
    if (host === 'productcdn.tatilbudur.com' || host.endsWith('.tatilbudur.com')) {
      if (/\.avif(\?|#|$)/i.test(s)) return s.replace(/\.avif/i, '.jpg')
      // 382 blanket JPEG düzeltmesi TatilBudur'da 500 verir
      if (/\.JPEG(\?|#|$)/.test(s)) return s.replace(/\.JPEG(\?|#|$)/, '.jpg$1')
      return s
    }
  } catch {
    return s
  }
  return s
}

/** @deprecated use repairExternalListingImageExt */
export function repairBookederImageExt(src: string): string {
  return repairExternalListingImageExt(src)
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

  const repaired = repairExternalListingImageExt(working)
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
  if (!PATH_EXT_RE.test(path)) return null

  const order = ['.avif', '.webp', '.jpg', '.jpeg', '.JPEG', '.png'] as const
  const m = path.match(PATH_EXT_RE)
  if (!m) return null
  const currentExt = m[0]
  const stem = path.slice(0, path.length - currentExt.length)
  const start = Math.max(
    0,
    order.findIndex((e) => e.toLowerCase() === currentExt.toLowerCase()),
  )

  for (let step = 1; step <= order.length; step++) {
    const ext = order[(start + step) % order.length]!
    if (ext === currentExt) continue
    // Aynı harf duyarsız eşleşme (jpeg/JPEG) — yine de case farkı için dene
    if (ext.toLowerCase() === currentExt.toLowerCase() && ext === currentExt) continue
    const nextPath = stem + ext + suffix
    const candidate = isProxy ? proxyPrefix + encodeURIComponent(nextPath) : nextPath
    if (!tried.has(candidate)) return candidate
  }
  return null
}
