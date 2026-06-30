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

/** Gezinomi link karşılaştırması — uçuş/route sayıları (ör. `-16486-21164`) temizlenir */
export function wtatilSlugForMatch(slug) {
  let base = wtatilSlugBase(slug)
  if (base.startsWith('kosoval-')) base = `kosovali-${base.slice(8)}`
  base = base.replace(/(?:-\d{4,6})+$/g, '')
  return base
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

/** API `name` alanı uzantısız; CDN'de `-b0.jpg` (bazen `-b1.jpg`) kullanılır */
export function gezinomiPictureBaseName(name) {
  return String(name || '')
    .trim()
    .replace(/-b[01]\.(jpe?g|webp)$/i, '')
    .replace(/\.(jpe?g|webp)$/i, '')
}

/** TourDetail tourPictures[].name → indirme URL adayları */
export function gezinomiPictureDownloadUrls(name) {
  const n = gezinomiPictureBaseName(name)
  if (!n) return []
  const direct = [
    `${GEIZINOMI_CDN}/assets/${n}-b0.jpg`,
    `${GEIZINOMI_CDN}/assets/${n}-b1.jpg`,
  ]
  const fit = [
    `${GEIZINOMI_CDN}/fit-in/1600x900/filters:quality(90)/assets/${n}-b0.jpg`,
    `${GEIZINOMI_CDN}/fit-in/1200x800/assets/${n}-b0.jpg`,
  ]
  return [...direct, ...fit]
}
