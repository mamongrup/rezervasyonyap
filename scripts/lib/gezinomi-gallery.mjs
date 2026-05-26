/** Gezinomi galeri URL normalizasyonu ve reklam filtresi */

export const GEIZINOMI_CDN = 'https://images.gezinomi.com'

const PROMO_PATH_RE =
  /(?:^|\/)assets\/(?:kampanya-gorselleri|countryinfo|tourdestinations)\/|(?:^|\/)assets\/(?:sal12|firsat-|promo-|banner-|axess|erken-new)/i

/** Wtatil slug sonundaki `-wt-{id}` ekini kaldırır */
export function wtatilSlugBase(slug) {
  return String(slug || '')
    .trim()
    .replace(/-wt-\d+$/, '')
}

export function normalizeGezinomiAssetUrl(url) {
  let u = String(url || '').trim()
  if (!u) return ''
  u = u.replace(/fit-in\/\d+x\d+\//, '')
  u = u.replace(/filters:[^/]+\//g, '')
  if (u.startsWith('http://')) u = `https://${u.slice(7)}`
  return u
}

export function isGezinomiPromoAsset(url) {
  const u = normalizeGezinomiAssetUrl(url).toLowerCase()
  if (!u.includes('images.gezinomi.com/assets/')) return true
  return PROMO_PATH_RE.test(u)
}

/** Tur kodu dosya adında `-29398--` olarak geçer */
export function isGezinomiTourPhoto(url, tourCode) {
  const code = String(tourCode || '').trim()
  if (!code) return false
  const u = normalizeGezinomiAssetUrl(url)
  if (isGezinomiPromoAsset(u)) return false
  return u.includes(`-${code}--`)
}

export function filterTourGalleryUrls(urls, tourCode) {
  const code = String(tourCode || '').trim()
  const seen = new Set()
  const out = []
  for (const raw of urls || []) {
    const u = normalizeGezinomiAssetUrl(raw)
    if (!u || !isGezinomiTourPhoto(u, code)) continue
    if (seen.has(u)) continue
    seen.add(u)
    out.push(u)
  }
  out.sort((a, b) => photoIndex(a) - photoIndex(b))
  return out
}

function photoIndex(url) {
  const m = String(url).match(/--(\d+)-\d{2}\.\d{2}\.\d{4}/)
  return m ? Number(m[1]) : 999
}

export function toFullSizeAssetUrl(url) {
  const u = normalizeGezinomiAssetUrl(url)
  if (!u) return ''
  if (u.startsWith('http')) return u
  return `${GEIZINOMI_CDN}/${u.replace(/^\//, '')}`
}
