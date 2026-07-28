/**
 * Vitrin görselleri — AVIF-only yerel politika + harici CDN onarımı.
 *
 * Yerel `/uploads/**`: webp/jpg → bir kez `.avif` dene; AVIF 404'te raster
 * kardeşe düşme (iOS 15 AVIF göstermez — bilinçli).
 * Harici CDN: sahte `.avif` → gerçek jpg/png (rehost olmadan AVIF yok).
 */

const PATH_EXT_RE = /\.(avif|webp|jpe?g|png)$/i

/** Host → 379 sonrası yanlış `.avif` yerine gerçek uzantı */
const CDN_AVIF_REPAIR: Array<{ test: (host: string) => boolean; to: string }> = [
  {
    test: (h) => h === 'bookeder.com' || h.endsWith('.bookeder.com'),
    to: '.JPEG',
  },
  {
    test: (h) => h === 'productcdn.tatilbudur.com' || h.endsWith('.tatilbudur.com'),
    to: '.jpg',
  },
  {
    test: (h) => h === 'reserwation.com' || h.endsWith('.reserwation.com'),
    to: '.jpg',
  },
  {
    test: (h) => h === 'fairystonetravel.com' || h.endsWith('.fairystonetravel.com'),
    to: '.jpg',
  },
  {
    test: (h) => h === 'upload.wikimedia.org' || h.endsWith('.wikimedia.org'),
    to: '.jpg',
  },
  {
    test: (h) => h.includes('yolcu360.com'),
    to: '.png',
  },
  {
    // KPlus / Expedia travelapi: DB'ye .avif yazılmış olabilir; CDN yalnızca .jpg sunar.
    test: (h) => h === 'i.travelapi.com' || h.endsWith('.travelapi.com'),
    to: '.jpg',
  },
  {
    test: (h) => h === 'photos.hotelbeds.com' || h.endsWith('.hotelbeds.com'),
    to: '.jpg',
  },
]

export function repairExternalListingImageExt(src: string): string {
  const s = src.trim()
  if (!s || !/^https?:\/\//i.test(s)) return s
  try {
    const host = new URL(s).hostname.toLowerCase()
    const rule = CDN_AVIF_REPAIR.find((r) => r.test(host))
    if (!rule) return s
    let out = s
    if (/\.avif(\?|#|$)/i.test(out)) out = out.replace(/\.avif/i, rule.to)
    // Yanlış blanket .JPEG (TatilBudur / FairyStone / Reserwation / Wikimedia / Yolcu360)
    if (rule.to === '.jpg' && /\.JPEG(\?|#|$)/.test(out)) {
      out = out.replace(/\.JPEG(\?|#|$)/, '.jpg$1')
    }
    return out
  } catch {
    return s
  }
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

  const m = path.match(PATH_EXT_RE)
  if (!m) return null
  const currentExt = m[0]
  const stem = path.slice(0, path.length - currentExt.length)
  const isLocalUpload = /\/uploads\//i.test(path) || path.startsWith('/uploads/')

  // Yerel medya: yalnızca AVIF'e yükselt; AVIF'ten webp/jpg'ye düşme.
  if (isLocalUpload) {
    if (/\.avif$/i.test(currentExt)) return null
    const nextPath = stem + '.avif' + suffix
    const candidate = isProxy ? proxyPrefix + encodeURIComponent(nextPath) : nextPath
    return tried.has(candidate) ? null : candidate
  }

  // Harici: çalışan orijinal uzantılara düş (CDN AVIF sunmaz)
  const order = ['.avif', '.webp', '.jpg', '.jpeg', '.JPEG', '.png'] as const
  const start = Math.max(
    0,
    order.findIndex((e) => e.toLowerCase() === currentExt.toLowerCase()),
  )

  for (let step = 1; step <= order.length; step++) {
    const ext = order[(start + step) % order.length]!
    if (ext === currentExt) continue
    if (ext.toLowerCase() === currentExt.toLowerCase() && ext === currentExt) continue
    const nextPath = stem + ext + suffix
    const candidate = isProxy ? proxyPrefix + encodeURIComponent(nextPath) : nextPath
    if (!tried.has(candidate)) return candidate
  }
  return null
}
