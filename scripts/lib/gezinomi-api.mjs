/** Gezinomi TourDetail API — tur kodu (productId) + galeri (Playwright gerekmez) */

import { filterTourGalleryUrls, gezinomiPictureDownloadUrls } from './gezinomi-gallery.mjs'
import { searchGezinomiTours } from './gezinomi-match.mjs'

const TOUR_DETAIL_API = 'https://apigezinomi.gezinomi.com/api/Tour/TourDetail'

async function postTourDetail(body) {
  const r = await fetch(TOUR_DETAIL_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'TravelGezinomiImport/1.0',
    },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`TourDetail HTTP ${r.status}`)
  return r.json()
}

function tourPagePathFromCrumbs(crumbs, link) {
  if (!Array.isArray(crumbs) || !crumbs.length) return null
  const exact = crumbs.find((c) => c.path && String(c.path).includes(`/${link}`))
  if (exact?.path) return exact.path
  const detail = [...crumbs].reverse().find((c) => c.path && c.isListing === false)
  if (detail?.path) return detail.path
  const category = crumbs.find((c) => c.isListing === true && c.path && c.path !== '/')
  if (category?.path && link) return `${category.path}/${link}`.replace(/\/+/g, '/')
  return null
}

export async function enrichMatchWithProductId(match) {
  if (!match) return match
  if (match.productId && match.apiRow) return match
  if (match.productId && !match.apiRow) {
    const results = await searchGezinomiTours(match.link).catch(() => [])
    const exact = results.find((r) => r.link === match.link)
    if (exact) return { ...match, apiRow: exact, typeId: exact.typeId ?? match.typeId }
    return match
  }
  const queries = [match.link, match.link.replace(/-/g, ' '), match.name].filter(Boolean)
  for (const q of queries) {
    let results
    try {
      results = await searchGezinomiTours(q)
    } catch {
      continue
    }
    const exact = results.find((r) => r.link === match.link)
    if (exact?.productId) {
      return {
        ...match,
        productId: exact.productId,
        picture: exact.picture || match.picture,
        typeId: exact.typeId ?? match.typeId,
        tourTypeId: exact.typeId ?? match.tourTypeId,
        apiRow: exact,
      }
    }
  }
  return match
}

export async function resolveGezinomiTourPagePath(match) {
  if (match.pagePath) return match.pagePath
  const link = match.link
  const typeId = match.typeId ?? match.tourTypeId ?? 4
  const probePaths = [
    match.apiRow?.path ? `/${String(match.apiRow.path).replace(/^\/+/, '')}` : null,
    `/${link}`,
    `/yurtdisi-turlari/${link}`,
    `/kapadokya-turlari/${link}`,
  ].filter(Boolean)
  for (const path of probePaths) {
    const probe = await postTourDetail({ link, productId: match.productId, path, tourTypeId: typeId })
    const pagePath = tourPagePathFromCrumbs(probe.data?.breadCrumbs, link)
    if (pagePath) return pagePath
  }
  return null
}

export async function fetchGezinomiGalleryViaApi(match) {
  let m = await enrichMatchWithProductId(match)
  if (!m?.productId) {
    return { tourCode: null, urls: [], pageUrl: null, error: 'product_id_yok', mode: 'api' }
  }

  let pagePath = m.pagePath || null
  if (!pagePath) {
    pagePath = await resolveGezinomiTourPagePath(m)
  }
  if (!pagePath) {
    return {
      tourCode: String(m.productId),
      urls: [],
      pageUrl: null,
      error: 'sayfa_yolu_bulunamadi',
      mode: 'api',
    }
  }

  const detail = await postTourDetail({
    link: m.link,
    productId: m.productId,
    path: pagePath,
    tourTypeId: m.typeId ?? m.tourTypeId ?? 4,
  })

  const model = detail.data?.tourDetailModel
  const pics = (model?.tourPictures || []).filter((p) => !p.isCampaignPicture && !p.isDeckPlan)
  const names = pics.map((p) => String(p.name || '').trim()).filter(Boolean)
  const urlCandidates = names.flatMap((name) => gezinomiPictureDownloadUrls(name))
  const urls = filterTourGalleryUrls(urlCandidates, m.productId)

  // Tek URL / isim — indirmede ilk çalışan uzantı denenecek
  const byName = new Map()
  for (const pic of pics) {
    const name = String(pic.name || '').trim()
    if (!name) continue
    byName.set(name, gezinomiPictureDownloadUrls(name)[0])
  }
  const orderedUrls = [...byName.values()].filter(Boolean)

  return {
    tourCode: String(m.productId),
    urls: orderedUrls.length ? orderedUrls : urls,
    pageUrl: `https://www.gezinomi.com${pagePath}`,
    pagePath,
    imageCount: orderedUrls.length || urls.length,
    mode: 'api',
  }
}

export function gezinomiRefererHeaders() {
  return {
    Referer: 'https://www.gezinomi.com/',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
  }
}
