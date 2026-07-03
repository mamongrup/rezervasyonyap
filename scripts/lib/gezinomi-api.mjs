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
    match.apiRow?.pathLink ? `/${String(match.apiRow.pathLink).replace(/^\/+/, '')}` : null,
    `/${link}`,
    typeId === 2 ? `/cruise-turlari/${link}` : null,
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
  const today = new Date().toISOString().slice(0, 10)
  return rows.map((p) => {
    const end = isoDateOnly(p.endDate)
    const future = end ? end >= today : true
    return {
      id: p.tourPeriodId ?? p.id ?? null,
      start: isoDateOnly(p.startDate),
      end,
      label: p.periodDate || `${isoDateOnly(p.startDate)} - ${end}`,
      // B2B TourDetail API çoğu kültür turda isAvailable=false döner; vitrin fiyatı ayrı endpoint.
      // Gelecek dönem = planlı kalkış (Gezinomi/Tatilsepeti vitrininde görünür).
      isAvailable: future,
      gezinomiApiAvailable: p.isAvailable === true,
      source: 'gezinomi',
    }
  })
}

/** Gezinomi tourDepartures → kalkış noktaları */
export function summarizeGezinomiDepartures(model) {
  const rows = Array.isArray(model?.tourDepartures) ? model.tourDepartures : []
  return rows
    .map((d) => ({
      id: d.tourDepartureId ?? d.id ?? null,
      city: String(d.cityName || '').trim(),
      name: String(d.name || '').trim(),
    }))
    .filter((d) => d.city || d.name)
}

/** Gezinomi tourPeriodTimes → ay/dönem grupları (fiyat tablosu başlıkları) */
export function summarizeGezinomiPeriodTimes(model) {
  const rows = Array.isArray(model?.tourPeriodTimes) ? model.tourPeriodTimes : []
  return rows
    .map((p) => ({
      id: p.tourPeriodTimeId ?? p.id ?? null,
      label: String(p.tourPeriodTimeName || '').trim(),
    }))
    .filter((p) => p.label)
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

const GEIZINOMI_INFO_SECTIONS = [
  ['Fiyatlarımıza Dahil Olan Servislerimiz', 'cruise-section-included', 'Fiyata dahil olanlar'],
  ['Fiyatlarımıza Dahil Olmayan Servislerimiz', 'cruise-section-excluded', 'Fiyata dahil olmayanlar'],
  ['Önemli Bilgiler', 'cruise-section-important', 'Önemli bilgiler'],
  ['Ulaşım Detayı', 'cruise-section-transport', 'Ulaşım'],
  ['Konaklama Detayı', 'tour-section-accommodation', 'Konaklama'],
  ['Yeme – İçme Konsepti ', 'cruise-section-meals', 'Yeme içme'],
  ['Yeme - İçme Konsepti ', 'cruise-section-meals', 'Yeme içme'],
  ['Kabin Bilgileri', 'cruise-section-cabin', 'Kabin bilgileri'],
  ['Ekstra Turlar', 'cruise-section-extras', 'Ekstra turlar'],
  ['Vize Bilgileri', 'cruise-section-visa', 'Vize bilgileri'],
]

function gezinomiText(raw) {
  const s = String(raw ?? '').trim()
  if (!s || s === 'null') return ''
  return s
}

function stripGezinomiPlainText(html) {
  return String(html ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Gezinomi TourDetail → vitrin açıklama + program + bilgi bölümleri */
export function buildGezinomiTourContentPackage(model) {
  if (!model || typeof model !== 'object') return null

  const descriptions = Array.isArray(model.tourDescriptions) ? model.tourDescriptions : []
  const infoSections = []
  const seenIds = new Set()

  for (const [typeName, id, title] of GEIZINOMI_INFO_SECTIONS) {
    if (seenIds.has(id)) continue
    const row = descriptions.find((d) => {
      const name = String(d.descriptionTypeName || '').trim()
      return name === typeName || name.includes(typeName.replace(/\s+$/, ''))
    })
    const html = gezinomiText(row?.text)
    if (!html || html === '<P>&nbsp;</P>') continue
    seenIds.add(id)
    infoSections.push({ id, title, html })
  }

  const programDays = (Array.isArray(model.tourPrograms) ? model.tourPrograms : [])
    .map((p) => {
      const day = Number(p.day ?? p.daySorting ?? 0)
      const text = gezinomiText(p.text)
      if (!day || !text) return null
      const plain = stripGezinomiPlainText(text)
      const titleMatch = plain.match(/^([^.:]{4,120})/)
      return {
        day,
        title: titleMatch ? titleMatch[1].trim() : `Gün ${day}`,
        description: text,
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.day - b.day)

  const detailText = gezinomiText(model.tourDetailText)
  const programHtml = programDays.length
    ? programDays.map((d) => `<p><strong>${d.title}</strong></p><p>${d.description}</p>`).join('\n')
    : ''

  const descriptionHtml =
    [programHtml, ...infoSections.map((s) => `<h3>${s.title}</h3>${s.html}`)].filter(Boolean).join('\n') ||
    detailText

  return {
    descriptionHtml,
    detailText,
    infoSections,
    programDays,
    conceptName: gezinomiText(model.tourHotelTypeName || model.conceptName),
    tourDeparture: gezinomiText(model.tourDeparture),
    numberOfNights: model.numberOfNights ?? null,
  }
}
