/** Tatilsepeti gemi/cruise katalog + detay sayfası parse */

const BASE_LIST = 'https://www.tatilsepeti.com/gemi-cruise-turlari?liste=hepsi'
export const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 TravelTatilsepetiImport/1.0'

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

export function decodeHtml(s) {
  return String(s || '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim()
}

function slugFromHref(href) {
  const m = String(href).match(/^\/([^?]+)/)
  return m ? m[1] : String(href || '').replace(/^https?:\/\/[^/]+/, '').replace(/^\//, '').split('?')[0]
}

export function parseCatalogPage(html, pageUrl) {
  const tours = []
  const articleRe = /<article>([\s\S]*?)<\/article>/gi
  let m
  while ((m = articleRe.exec(html))) {
    const block = m[1]
    const idM = block.match(/data-tourid="(\d+)"/)
    const nameM = block.match(/data-tourname="([^"]+)"/)
    const hrefM = block.match(/panel-heading-inside[\s\S]*?href="([^"]+)"/)
    const startM = block.match(/data-startdate="([^"]+)"/)
    const endM = block.match(/data-enddate="([^"]+)"/)
    const routeM = block.match(/data-original-title="([^"]+)"/)
    const visitM = block.match(/visit-cities[\s\S]*?substring">\s*([\s\S]*?)<\/span>/)
    const priceM = block.match(/discount-price">(\d+),<small class='price-currency'>(\s*\w+)/)
    if (!idM || !nameM) continue
    const href = hrefM ? hrefM[1] : ''
    const slug = slugFromHref(href)
    tours.push({
      tourId: idM[1],
      title: decodeHtml(nameM[1]),
      slug,
      url: href.startsWith('http') ? href.split('?')[0] : `https://www.tatilsepeti.com${href.split('?')[0]}`,
      listUrl: pageUrl,
      startDate: startM ? startM[1].split(' ')[0] : null,
      endDate: endM ? endM[1].split(' ')[0] : null,
      routeHint: visitM ? decodeHtml(visitM[1].replace(/<[^>]+>/g, '')) : routeM ? decodeHtml(routeM[1]) : null,
      listPrice: priceM ? { amount: Number(priceM[1]), currency: priceM[2].trim() } : null,
    })
  }
  return tours
}

export function parseCatalogTotalPages(html) {
  const last = html.match(/PagedList-skipToLast"><a href="[^"]*sayfa=(\d+)/)
  if (last) return Number(last[1])
  const nums = (html.match(/sayfa=(\d+)/g) || []).map((x) => Number(x.replace('sayfa=', '')))
  return nums.length ? Math.max(...nums) : 1
}

export async function fetchCatalogPage(page = 1) {
  const url = page <= 1 ? BASE_LIST : `${BASE_LIST}&sayfa=${page}`
  const r = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!r.ok) throw new Error(`Tatilsepeti liste HTTP ${r.status}`)
  return { url, html: await r.text() }
}

export async function fetchAllTatilsepetiCatalog({ delayMs = 400, onPage } = {}) {
  const first = await fetchCatalogPage(1)
  const totalPages = parseCatalogTotalPages(first.html)
  const all = [...parseCatalogPage(first.html, first.url)]
  for (let p = 2; p <= totalPages; p++) {
    await sleep(delayMs)
    const { url, html } = await fetchCatalogPage(p)
    all.push(...parseCatalogPage(html, url))
    onPage?.(p, totalPages, all.length)
  }
  const byId = new Map()
  for (const row of all) {
    if (!byId.has(row.tourId)) byId.set(row.tourId, { ...row, listRows: 1 })
    else byId.get(row.tourId).listRows += 1
  }
  return {
    totalPages,
    departureRows: all.length,
    products: [...byId.values()],
  }
}

export async function fetchTourDetailHtml(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!r.ok) throw new Error(`Detay HTTP ${r.status} ${url}`)
  return await r.text()
}

function parseJsonLd(html) {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)]
  for (const b of blocks) {
    try {
      const j = JSON.parse(b[1])
      if (j['@type'] === 'LodgingBusiness' || j['@type'] === 'Product') return j
    } catch {
      /* ignore */
    }
  }
  return null
}

function parseVisits(html) {
  const section = html.match(/Ziyaret Edilecek Yerler[\s\S]*?<ul>([\s\S]*?)<\/ul>/i)
  if (!section) return []
  return [...section[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((m) => decodeHtml(m[1].replace(/<[^>]+>/g, '')))
    .filter(Boolean)
}

function parseProgramDays(html) {
  const body = html.match(/<h2>Tur Programı<\/h2>[\s\S]*?<div class="panel-body[^"]*">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/i)
  if (!body) return []
  const days = []
  const mediaRe = /<div class="media">([\s\S]*?)<\/div>\s*<\/div>/gi
  let m
  while ((m = mediaRe.exec(body[1]))) {
    const block = m[1]
    const dayM = block.match(/media-object">\s*([\s\S]*?)<\/div>/)
    const titleM = block.match(/<h3 class="media-heading">([\s\S]*?)<\/h3>/)
    const contentM = block.match(/<div class="media-content">([\s\S]*?)<\/div>/)
    if (!titleM) continue
    days.push({
      day_label: decodeHtml(dayM ? dayM[1].replace(/<[^>]+>/g, '') : ''),
      title: decodeHtml(titleM[1].replace(/<[^>]+>/g, '')),
      body_html: decodeHtml(contentM ? contentM[1] : ''),
    })
  }
  return days
}

function parseServiceList(html, heading) {
  const re = new RegExp(`<h2>${heading}<\\/h2>[\\s\\S]*?<ol class="list-group">([\\s\\S]*?)<\\/ol>`, 'i')
  const m = html.match(re)
  if (!m) return []
  return [...m[1].matchAll(/list-group-item[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((x) => decodeHtml(x[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()))
    .filter(Boolean)
}

function parseGalleryUrls(html) {
  const urls = new Set()
  const gallery = html.match(/photo-gallery owl-carousel[\s\S]*?<\/div>\s*<\/div>/i)
  const scope = gallery ? gallery[0] : html
  for (const m of scope.matchAll(/(?:src|data-src)="(https:\/\/cdn\.tatilsepeti\.com\/Files\/TurResim\/[^"]+)"/gi)) {
    urls.add(m[1])
  }
  return [...urls]
}

function parseFirstEurPrice(html) {
  for (const m of html.matchAll(
    /discount-price">(\d+),<small class='price-currency'>\s*(\w{3})/gi,
  )) {
    const cur = m[2].toUpperCase()
    if (cur === 'TL' || cur === 'TRY') continue
    return { amount: Number(m[1]), currency: cur === 'TL' ? 'TRY' : cur }
  }
  const range = html.match(/priceRange":\s*"(\d+)\s+(\w{3})/i)
  if (range) return { amount: Number(range[1]), currency: range[2].toUpperCase() }
  return null
}

function parseShipName(html, title) {
  const shipM = html.match(/tour-detail__cruise__img[\s\S]*?<strong>([\s\S]*?)<\/strong>/i)
  if (shipM) return decodeHtml(shipM[1])
  const t = String(title || '')
  const m = t.match(/(?:^|\s)([\w\s.'-]+?)\s+ile\b/i)
  return m ? m[1].trim() : null
}

function parseNightCount(title, programDays) {
  const m = String(title || '').match(/(\d+)\s*Gece/i)
  if (m) return Number(m[1])
  if (programDays.length) return Math.max(1, programDays.length - 1)
  return null
}

function parsePeriods(html) {
  const opts = [...html.matchAll(/<option[^>]*data-startdate="([^"]+)"[^>]*data-enddate="([^"]+)"[^>]*>([^<]+)</gi)]
  return opts.map((m) => ({
    start: m[1],
    end: m[2],
    label: decodeHtml(m[3]),
  }))
}

export function parseTourDetail(html, catalogRow = {}) {
  const ld = parseJsonLd(html)
  const tourId =
    html.match(/id="hidTourId"[^>]*value="(\d+)"/i)?.[1] ||
    html.match(/Tur Kodu:<\/strong>\s*(\d+)/i)?.[1] ||
    catalogRow.tourId
  const title =
    decodeHtml(html.match(/<h1 class="page-title">([\s\S]*?)<\/h1>/i)?.[1] || '') ||
    decodeHtml(html.match(/id="hidTourName"[^>]*value="([^"]+)"/i)?.[1] || '') ||
    catalogRow.title
  const slug =
    slugFromHref(html.match(/id="hidPageUrl"[^>]*value="([^"]+)"/i)?.[1] || '') || catalogRow.slug
  const visits = parseVisits(html)
  const programDays = parseProgramDays(html)
  const included = parseServiceList(html, 'Fiyata Dahil Hizmetler')
  const excluded = parseServiceList(html, 'Fiyata Dahil Olmayan Hizmetler')
  const galleryUrls = parseGalleryUrls(html)
  const price = parseFirstEurPrice(html) || catalogRow.listPrice
  const shipName = parseShipName(html, title)
  const nightCount = parseNightCount(title, programDays)
  const periods = parsePeriods(html)
  const transportM = html.match(/<strong>Ulaşım:<\/strong>\s*([^<]+)/i)
  const visaM = html.match(/<strong>Vize:<\/strong>\s*([\s\S]*?)<br/i)

  return {
    tourId: String(tourId),
    title,
    slug,
    url: catalogRow.url || `https://www.tatilsepeti.com/${slug}`,
    description: ld?.description ? decodeHtml(ld.description) : null,
    shipName,
    cruiseLine: shipName,
    routeSummary: visits.length ? visits.join(' → ') : catalogRow.routeHint || null,
    visits,
    nightCount,
    transport: transportM ? decodeHtml(transportM[1]) : null,
    visaInfo: visaM ? decodeHtml(visaM[1].replace(/<[^>]+>/g, ' ')) : null,
    price,
    periods,
    programDays,
    included,
    excluded,
    galleryUrls,
    agencyId: html.match(/id="hidTourAgencyId"[^>]*value="(\d+)"/i)?.[1] || null,
  }
}

export async function fetchTourDetail(catalogRow) {
  const html = await fetchTourDetailHtml(catalogRow.url)
  return parseTourDetail(html, catalogRow)
}
