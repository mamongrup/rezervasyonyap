/** Gezinomi TourDetail API — tur kodu (productId), galeri ve dönemler */

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

/** Tam TourDetail yanıtı — galeri ve dönem karşılaştırması için */
export async function fetchGezinomiTourDetail(match) {
  const m = await enrichMatchWithProductId(match)
  if (!m?.productId) {
    return { match: m, model: null, pagePath: null, pageUrl: null, error: 'product_id_yok' }
  }

  let pagePath = m.pagePath || null
  if (!pagePath) {
    pagePath = await resolveGezinomiTourPagePath(m)
  }
  if (!pagePath) {
    return {
      match: m,
      model: null,
      pagePath: null,
      pageUrl: null,
      error: 'sayfa_yolu_bulunamadi',
      tourCode: String(m.productId),
    }
  }

  const detail = await postTourDetail({
    link: m.link,
    productId: m.productId,
    path: pagePath,
    tourTypeId: m.typeId ?? m.tourTypeId ?? 4,
  })

  return {
    match: m,
    model: detail.data?.tourDetailModel || null,
    pagePath,
    pageUrl: `https://www.gezinomi.com${pagePath}`,
    tourCode: String(m.productId),
    error: null,
  }
}

function isoDateOnly(raw) {
  if (!raw) return ''
  const s = String(raw).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const m = s.match(/(\d{2})\.(\d{2})\.(\d{4})/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  return s.slice(0, 10)
}

/** Gezinomi tourPeriods → normalize edilmiş dönem listesi */
export function summarizeGezinomiPeriods(model) {
  const rows = Array.isArray(model?.tourPeriods) ? model.tourPeriods : []
  return rows.map((p) => ({
    id: p.tourPeriodId ?? p.id ?? null,
    start: isoDateOnly(p.startDate),
    end: isoDateOnly(p.endDate),
    label: p.periodDate || `${isoDateOnly(p.startDate)} - ${isoDateOnly(p.endDate)}`,
    isAvailable: p.isAvailable !== false,
    source: 'gezinomi',
  }))
}

export async function fetchGezinomiGalleryViaApi(match) {
  const detail = await fetchGezinomiTourDetail(match)
  const m = detail.match
  if (!m?.productId || !detail.model) {
    return {
      tourCode: detail.tourCode || null,
      urls: [],
      pageUrl: detail.pageUrl,
      error: detail.error || 'detay_yok',
      mode: 'api',
    }
  }

  const model = detail.model
  const pics = (model.tourPictures || []).filter((p) => !p.isCampaignPicture && !p.isDeckPlan)
  const names = pics.map((p) => String(p.name || '').trim()).filter(Boolean)
  const urlCandidates = names.flatMap((name) => gezinomiPictureDownloadUrls(name))
  const urls = filterTourGalleryUrls(urlCandidates, m.productId)

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
    pageUrl: detail.pageUrl,
    pagePath: detail.pagePath,
    imageCount: orderedUrls.length || urls.length,
    periods: summarizeGezinomiPeriods(model),
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
