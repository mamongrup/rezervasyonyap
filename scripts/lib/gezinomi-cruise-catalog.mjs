/** Gezinomi cruise katalog — kategori listesi + tur arama */

const SEARCH_API = 'https://apigezinomi.gezinomi.com/api/Tour/SearchAutoComplate'
const LIST_API = 'https://www.gezinomi.com/api/tour/getSearchTourList'
const SUBCAT_API = 'https://apigezinomi.gezinomi.com/api/Tour/GetTourSubCategories'

const EMPTY_FILTER = {
  fiyat: [],
  kategori: [],
  esnekKategori: [],
  donem: [],
  gece: [],
  kalkisYeri: [],
  firstDate: '',
  lastDate: '',
  order: '',
  type: '',
  available: [],
  lokasyon: [],
  locationParent: [],
  ulasimTipi: [],
  transportationFilter: [],
  flightFilters: [],
}

export async function searchGezinomiAutoComplete(query) {
  const r = await fetch(SEARCH_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'TravelGezinomiCruiseImport/1.0' },
    body: JSON.stringify({ Query: query }),
  })
  if (!r.ok) throw new Error(`SearchAutoComplate HTTP ${r.status}`)
  const j = await r.json()
  return j.data || []
}

export async function fetchGezinomiCruiseCategories() {
  const rows = await searchGezinomiAutoComplete('cruise')
  return rows
    .filter((x) => x.type === 'CruiseCategory' && x.link)
    .map((x) => ({
      link: x.link,
      name: String(x.name || '').trim(),
      typeId: x.typeId ?? 2,
      path: x.path || x.link,
      pk: x.pk,
    }))
}

export async function fetchGezinomiCruiseToursForCategory(categoryLink, { categoryId = -1 } = {}) {
  const body = {
    url: categoryLink,
    path: `/${categoryLink}`,
    tourType: 2,
    categoryId,
    tourPeriod: -1,
    tourSubCategory: -1,
    departurePlace: -1,
    visaFree: false,
    isAvailable: false,
    isEkstra: false,
    isCruise: 'true',
    searchCriteria: 0,
    language: 0,
    searchBox: [{ text: '', id: null }],
    filterTourParams: { ...EMPTY_FILTER },
  }
  const r = await fetch(LIST_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'TravelGezinomiCruiseImport/1.0' },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`getSearchTourList HTTP ${r.status} (${categoryLink})`)
  const j = await r.json()
  const list = j.tourSearchResponse?.newTourLists || []
  return list.map((row) => ({
    ...row,
    categoryLink,
    productId: Number(row.productId),
  }))
}

export async function fetchAllGezinomiCruises({ categoryFilter = '' } = {}) {
  let categories = await fetchGezinomiCruiseCategories()
  if (categoryFilter) {
    const needle = categoryFilter.toLowerCase()
    categories = categories.filter((c) => c.link.toLowerCase().includes(needle) || c.name.toLowerCase().includes(needle))
  }

  const byProductId = new Map()
  for (const cat of categories) {
    let rows = []
    try {
      rows = await fetchGezinomiCruiseToursForCategory(cat.link)
    } catch (e) {
      console.warn(`[warn] ${cat.link}: ${e.message}`)
      continue
    }
    for (const row of rows) {
      if (!row.productId) continue
      if (!byProductId.has(row.productId)) {
        byProductId.set(row.productId, {
          ...row,
          cruiseLine: cat.name.replace(/\s+Turları\s*$/i, '').trim() || cat.name,
          cruiseCategoryLink: cat.link,
        })
      }
    }
    await sleep(Number(process.env.GEIZINOMI_DELAY_MS || 400))
  }
  return [...byProductId.values()]
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

export function gezinomiCruiseImageUrl(imageUrl, productId) {
  const name = String(imageUrl || '').trim()
  if (!name) return ''
  if (name.startsWith('http')) return name
  return `https://images.gezinomi.com/fit-in/1600x900/filters:quality(90)/assets/${name}-b0.jpg`
}

export function parseCruiseShipName(row) {
  const info = String(row.transportionInfo || row.transportationInfo || '').trim()
  if (info) return info
  const name = String(row.productName || '')
  const m = name.match(/^(.+?)\s+ile\b/i)
  return m ? m[1].trim() : ''
}

export function parseRouteSummary(row) {
  const route = String(row.routeLink || row.route || '').trim()
  if (route) return route.replace(/\//g, ' → ')
  const dep = String(row.tourDeparture || '').trim()
  return dep || null
}

export function pickCruisePrice(row) {
  const amount = row.discountedPrice ?? row.originalPrice ?? row.priceInTL
  if (amount == null || Number(amount) <= 0) return null
  return Number(amount)
}

export function pickCruiseCurrency(row) {
  const code = String(row.originalUnitCode || row.tlUnitCode || 'TRY').trim().toUpperCase()
  if (code === 'TL') return 'TRY'
  return code || 'TRY'
}
