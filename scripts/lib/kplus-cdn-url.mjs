/**
 * KPlus CDN proxy URL'lerini kaynak görsel URL'sine çevirir.
 * import (travelrobot / tatilbudur) ve DB migration ile uyumlu.
 */
export function unwrapKplusCdnUrl(raw) {
  const s = String(raw ?? '').trim()
  if (!s || !/cdn\.kplus\.com\.tr/i.test(s)) return s
  try {
    const u = new URL(s)
    const b64 = u.searchParams.get('url')
    if (!b64) return s
    const decoded = Buffer.from(b64, 'base64').toString('utf8').trim()
    if (!decoded) return s
    if (/^https?:\/\//i.test(decoded)) return decoded
    return `https://${decoded}`
  } catch {
    return s
  }
}

/** AegeanHotels CDN → Bookeder Photos/Big aynası. */
export function rewriteAegeanHotelsToBookeder(src) {
  const s = unwrapKplusCdnUrl(String(src ?? '').trim())
  if (!s || !/\.aegeanhotels\.net\/data\/Imgs\/(?:1920x1080w|OriginalPhoto)\//i.test(s)) {
    return s
  }
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

export function normalizeImportedListingImageUrl(raw) {
  return rewriteAegeanHotelsToBookeder(raw)
}
