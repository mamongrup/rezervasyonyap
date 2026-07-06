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
  const section = html.match(
    /<h2>\s*Tur Programı\s*<\/h2>([\s\S]*?)(?:<h2>\s*Fiyata Dahil|<h3>\s*Fiyata Dahil)/i,
  )
  if (!section) return []
  const chunks = section[1].split(/<div class="media">/i).slice(1)
  const days = []
  for (const block of chunks) {
    const dayM = block.match(/media-object">\s*([\s\S]*?)<\/div>/)
    const titleM = block.match(/<h3 class="media-heading">([\s\S]*?)<\/h3>/)
    const contentM = block.match(/<div class="media-content">([\s\S]*?)<\/div>/)
    if (!titleM) continue
    days.push({
      day_label: decodeHtml(dayM ? dayM[1].replace(/<[^>]+>/g, '') : ''),
      title: decodeHtml(titleM[1].replace(/<[^>]+>/g, '')),
      body_html: contentM ? contentM[1].trim() : '',
    })
  }
  return days
}

function parseServiceList(html, heading) {
  const re = new RegExp(
    `<h[23]>\\s*${heading}\\s*<\\/h[23]>[\\s\\S]*?<ol class="list-group">([\\s\\S]*?)<\\/ol>`,
    'i',
  )
  const m = html.match(re)
  if (!m) return []
  return [...m[1].matchAll(/<li class="list-group-item"[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((x) => parseServiceListItem(x[1]))
    .filter(Boolean)
}

function parseServiceListItem(block) {
  const tipM = block.match(/data-original-title="([^"]*)"/i)
  const tip = tipM ? decodeHtml(tipM[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()) : ''
  const name = decodeHtml(
    block
      .replace(/<i class="fa fa-info-circle"[\s\S]*?<\/i>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  )
  if (!name) return ''
  return tip ? `${name} (${tip})` : name
}

function parsePanelListItems(html, heading) {
  const re = new RegExp(
    `<h[23]>\\s*${heading}\\s*<\\/h[23]>[\\s\\S]*?<ul class="list-group">([\\s\\S]*?)<\\/ul>`,
    'i',
  )
  const m = html.match(re)
  if (!m) return []
  return [...m[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((x) => decodeHtml(x[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()))
    .filter(Boolean)
}

function parseSimpleListItems(html, heading) {
  const re = new RegExp(`<h[23]>\\s*${heading}\\s*<\\/h[23]>[\\s\\S]*?<ul>([\\s\\S]*?)<\\/ul>`, 'i')
  const m = html.match(re)
  if (!m) return []
  return [...m[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((x) => decodeHtml(x[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()))
    .filter(Boolean)
}

function parseDetailTextHtml(html) {
  const m = html.match(/id="descriptionTour"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*<div class="row"/i)
  return m ? m[1].trim() : ''
}

function parseShipSpecs(html) {
  const m = html.match(/tour-detail__cruise__info[\s\S]*?<ul>([\s\S]*?)<\/ul>/i)
  if (!m) return []
  return [...m[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((x) => decodeHtml(x[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()))
    .filter(Boolean)
}

function parseShipImageUrl(html) {
  const m = html.match(
    /tour-detail__cruise__img[\s\S]*?(?:src|data-src)="(https:\/\/cdn\.tatilsepeti\.com\/[^"]+)"/i,
  )
  return m ? m[1] : null
}

function parseDeckPlanImageUrl(html) {
  const m = html.match(
    /id="cruiseMap"[\s\S]*?(?:data-src|src)="(https:\/\/cdn\.tatilsepeti\.com\/(?!wwwroot)[^"]+)"/i,
  )
  const url = m?.[1]
  if (!url || url.includes('ts-loading')) return null
  return url
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

function parsePriceAmount(mainPart, centsPart, currencyRaw) {
  const main = String(mainPart || '').trim()
  if (!main || main === '-' || main === ' - ') return null
  const cents = String(centsPart || '00').trim()
  const whole = main.replace(/\./g, '')
  const amount = Number(`${whole}.${cents.padStart(2, '0')}`)
  if (!Number.isFinite(amount) || amount <= 0) return null
  const cur = String(currencyRaw || 'EUR').trim().toUpperCase()
  return { amount, currency: cur === 'TL' ? 'TRY' : cur }
}

function parsePriceCell(html) {
  const block = String(html)
  const eurM = block.match(
    /<strong class="discount-price(?!\s+is-tl)">\s*([\d.]+),<small class='price-currency'>\s*(\d+)\s*(\w+)/i,
  )
  if (eurM) {
    const parsed = parsePriceAmount(eurM[1], eurM[2], eurM[3])
    if (parsed) return parsed
  }
  const tlM = block.match(
    /<strong class="discount-price\s+is-tl">\s*([\d.]+),<small class='price-currency'>\s*(\d+)\s*(\w+)/i,
  )
  if (tlM) {
    const parsed = parsePriceAmount(tlM[1], tlM[2], tlM[3])
    if (parsed) return parsed
  }
  return null
}

function extractCabinPriceCells(block) {
  const itemIdx = block.indexOf('price-table__body__item')
  if (itemIdx < 0) return []
  let slice = block.slice(itemIdx)
  const childIdx = slice.indexOf('child-div')
  if (childIdx > 0) slice = slice.slice(0, childIdx)
  return [...slice.matchAll(/price-table__body__cell[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/gi)].map(
    (m) => m[1],
  )
}

function extractCabinImageUrls(block) {
  const urls = new Set()
  for (const panel of block.matchAll(
    /<div role="tabpanel" class="tab-pane" id="kabin-gorselleri[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi,
  )) {
    for (const m of panel[1].matchAll(
      /(?:src|data-src)="(https:\/\/cdn\.tatilsepeti\.com\/Files\/GemiGuverte\/[^"]+)"/gi,
    )) {
      urls.add(m[1])
    }
  }
  if (urls.size === 0) {
    for (const m of block.matchAll(
      /id="kabin-gorselleri[^"]*"[\s\S]*?(?:src|data-src)="(https:\/\/cdn\.tatilsepeti\.com\/Files\/GemiGuverte\/[^"]+)"/gi,
    )) {
      urls.add(m[1])
    }
  }
  return [...urls]
}

function enrichCabinsWithoutImages(cabins, { galleryUrls = [] } = {}) {
  const gallery = galleryUrls.filter(Boolean)
  if (gallery.length === 0) return cabins
  let galleryIdx = 0
  return cabins.map((cabin) => {
    if (Array.isArray(cabin.image_urls) && cabin.image_urls.length > 0) return cabin
    const image_urls = [gallery[galleryIdx % gallery.length]]
    galleryIdx += 1
    return { ...cabin, image_urls }
  })
}

function parseCabinTables(html, galleryUrls = []) {
  const cabins = []
  const blocks = html.split(/<div class="col-xs-12 price-table">/i).slice(1)
  for (const block of blocks) {
    const nameM = block.match(/price-table__title__name[\s\S]*?<div class="middle">\s*([\s\S]*?)<\/div>/i)
    const name = decodeHtml(nameM ? nameM[1].replace(/<[^>]+>/g, '') : '').trim()
    if (!name) continue

    const campaignM = block.match(/price-table__title__campaign[\s\S]*?<span>([\s\S]*?)<\/span>/i)
    const campaign = campaignM ? decodeHtml(campaignM[1].replace(/<[^>]+>/g, '')) : null

    const featuresM = block.match(/class="tab-pane"[^>]*id="kabin-ozellikleri[^"]*"[\s\S]*?<div class="cabin-info">\s*([\s\S]*?)<\/div>/i)
    const description = featuresM ? decodeHtml(featuresM[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')) : ''

    const imageUrls = extractCabinImageUrls(block)

    const cells = extractCabinPriceCells(block)
    const doublePerPerson = cells[0] ? parsePriceCell(cells[0]) : null
    const extraBed = cells[1] ? parsePriceCell(cells[1]) : null
    const single = cells[2] ? parsePriceCell(cells[2]) : null

    const children = []
    const childHeaders = [...block.matchAll(/price-table__header__name--small">\s*([^<]+)/gi)]
    const childCells = [...block.matchAll(/child-div[\s\S]*?price-table__body__cell">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/gi)]
    for (let i = 0; i < childHeaders.length; i++) {
      const price = childCells[i] ? parsePriceCell(childCells[i][1]) : null
      if (!price) continue
      children.push({ label: decodeHtml(childHeaders[i][1]), ...price })
    }

    const footnoteM = block.match(/price-table__footer[\s\S]*?aciklamaDiv[^>]*>([\s\S]*?)<\/div>/i)
    const footnote = footnoteM
      ? decodeHtml(footnoteM[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
      : null

    const id = `cabin-${slugify(name)}`
    cabins.push({
      id,
      name,
      campaign,
      description,
      footnote,
      image_urls: [...new Set(imageUrls)],
      prices: {
        double_per_person: doublePerPerson,
        extra_bed: extraBed,
        single,
        children,
      },
      from_price: doublePerPerson || single || extraBed || children[0] || null,
    })
  }
  return enrichCabinsWithoutImages(cabins, { galleryUrls })
}

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
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
  const galleryUrls = parseGalleryUrls(html)
  const cabins = parseCabinTables(html, galleryUrls)
  const included = parseServiceList(html, 'Fiyata Dahil Hizmetler')
  const excluded = parseServiceList(html, 'Fiyata Dahil Olmayan Hizmetler')
  const price = parseFirstEurPrice(html) || catalogRow.listPrice
  const shipName = parseShipName(html, title)
  const nightCount = parseNightCount(title, programDays)
  const periods = parsePeriods(html)
  const transportM = html.match(/<strong>Ulaşım:<\/strong>\s*([^<]+)/i)
  const visaM = html.match(/<strong>Vize:<\/strong>\s*([\s\S]*?)<br/i)
  const departurePoints = parsePanelListItems(html, 'Tur Kalkış Noktaları')
  const shipSpecs = parseShipSpecs(html)
  const shipActivities = parseSimpleListItems(html, 'Gemi Aktiviteleri')
  const shipImageUrl = parseShipImageUrl(html)
  const deckPlanImageUrl = parseDeckPlanImageUrl(html)
  const detailTextHtml = parseDetailTextHtml(html)
  const metaDescription = ld?.description ? decodeHtml(ld.description) : null

  return {
    tourId: String(tourId),
    title,
    slug,
    url: catalogRow.url || `https://www.tatilsepeti.com/${slug}`,
    description: metaDescription,
    detailTextHtml,
    shipName,
    cruiseLine: shipName,
    routeSummary: visits.length ? visits.join(' → ') : catalogRow.routeHint || null,
    visits,
    nightCount,
    transport: transportM ? decodeHtml(transportM[1]) : null,
    visaInfo: visaM ? decodeHtml(visaM[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()) : null,
    departurePoints,
    shipSpecs,
    shipActivities,
    shipImageUrl,
    deckPlanImageUrl,
    price,
    periods,
    programDays,
    cabins,
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
