/**
 * Vitrin görselleri — yerel AVIF tercihi + harici CDN onarımı.
 *
 * Yerel `/uploads/**`: önce `.avif` dene; dosya yoksa (yarım kalan dönüşüm)
 * aynı stem’de `.webp` / `.jpg` / `.png` kardeşine düş. Gri kart yerine foto.
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
  {
    // Gezinomi CDN .avif isteminde HTTP 400 (RequestTypeError); gerçek dosya .jpg.
    test: (h) => h === 'images.gezinomi.com' || h.includes('gezinomi.com'),
    to: '.jpg',
  },
]

/**
 * TatilBudur rehost: diskte olmayan `/uploads/listings/ilanlar/oteller/…`
 * → productcdn aynı stem `.jpg` (HTTP 200). Sıra öneki `00-` vb. düşülür.
 */
export function restoreTatilbudurLocalUploadToCdn(src: string): string {
  const raw = src.trim()
  if (!raw) return raw

  let path = raw
  try {
    if (/^https?:\/\//i.test(raw)) {
      const u = new URL(raw)
      // Yalnız kendi origin /uploads yollarını CDN'e çevir
      if (!/\/uploads\/listings\/ilanlar\/oteller\//i.test(u.pathname)) return raw
      path = u.pathname
    }
  } catch {
    return raw
  }

  const m = path.match(
    /\/uploads\/listings\/ilanlar\/oteller\/[^/]+\/(?:\d+-)?([^/?#]+)\.(?:avif|webp|jpe?g|png)$/i,
  )
  if (!m?.[1]) return raw
  return `https://productcdn.tatilbudur.com/Otel/855x426/${m[1]}.jpg`
}

export function repairExternalListingImageExt(src: string): string {
  const restored = restoreTatilbudurLocalUploadToCdn(src.trim())
  const s = restored
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

  // Reserwation bulanık -thumbnail → tam boy (yoksa sonraki kardeş uzantı)
  if (/-thumbnail\.(jpe?g|png|webp|avif)(\?|#|$)/i.test(working)) {
    const full = working.replace(/-thumbnail\./i, '.')
    const candidate = isProxy ? proxyPrefix + encodeURIComponent(full) : full
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

  // Yerel raster: önce AVIF yükselt (dosya varsa). AVIF 404 → kardeş raster.
  // Harici: dairesel kardeş listesi (CDN sahte .avif onarımı yukarıda).
  const order = ['.avif', '.webp', '.jpg', '.jpeg', '.JPEG', '.png'] as const

  if (isLocalUpload && !/\.avif$/i.test(currentExt)) {
    const avifPath = stem + '.avif' + suffix
    const avifCandidate = isProxy ? proxyPrefix + encodeURIComponent(avifPath) : avifPath
    if (!tried.has(avifCandidate)) return avifCandidate
  }

  const start = Math.max(
    0,
    order.findIndex((e) => e.toLowerCase() === currentExt.toLowerCase()),
  )

  for (let step = 1; step <= order.length; step++) {
    const ext = order[(start + step) % order.length]!
    if (ext === currentExt) continue
    if (ext.toLowerCase() === currentExt.toLowerCase() && ext === currentExt) continue
    if (isLocalUpload && /\.avif$/i.test(ext)) continue // yerelde avif yukarıda denendi
    const nextPath = stem + ext + suffix
    const candidate = isProxy ? proxyPrefix + encodeURIComponent(nextPath) : nextPath
    if (!tried.has(candidate)) return candidate
  }
  return null
}
