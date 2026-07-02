/** Gezinomi kültür tur katalog — bölgesel alt kategoriler + tur arama */

const LIST_API = 'https://www.gezinomi.com/api/tour/getSearchTourList'

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

/** Tatilsepeti kültür alt kategorileri ↔ Gezinomi path */
export const KULTUR_REGIONS = [
  {
    code: 'kapadokya',
    nameTr: 'Kapadokya Turları',
    nameEn: 'Cappadocia Tours',
    gezinomiLink: 'kapadokya-turlari',
    gezinomiPath: '/kapadokya-turlari',
    slug: 'kapadokya-turlari',
  },
  {
    code: 'karadeniz',
    nameTr: 'Karadeniz Turları',
    nameEn: 'Black Sea Tours',
    gezinomiLink: 'karadeniz-turlari',
    gezinomiPath: '/karadeniz-turlari',
    slug: 'karadeniz-turlari',
  },
  {
    code: 'gap',
    nameTr: 'GAP Turları',
    nameEn: 'Southeast Anatolia Tours',
    gezinomiLink: 'gap-turlari',
    gezinomiPath: '/gap-turlari',
    slug: 'gap-turlari',
  },
  {
    code: 'ege-akdeniz',
    nameTr: 'Akdeniz-Ege Turları',
    nameEn: 'Aegean & Mediterranean Tours',
    gezinomiLink: 'ege-akdeniz-turu',
    gezinomiPath: '/ege-akdeniz-turu',
    slug: 'ege-akdeniz-turlari',
  },
  {
    code: 'ic-anadolu',
    nameTr: 'İç Anadolu Turları',
    nameEn: 'Central Anatolia Tours',
    gezinomiLink: 'ic-anadolu-turlari',
    gezinomiPath: '/ic-anadolu-turlari',
    slug: 'ic-anadolu-turlari',
  },
  {
    code: 'dogu-anadolu',
    nameTr: 'Doğu Anadolu Turları',
    nameEn: 'Eastern Anatolia Tours',
    gezinomiLink: 'dogu-anadolu-turlari',
    gezinomiPath: '/dogu-anadolu-turlari',
    slug: 'dogu-anadolu-turlari',
  },
  {
    code: 'gunubirlik',
    nameTr: 'Günübirlik Turlar',
    nameEn: 'Day Tours',
    gezinomiLink: 'gunubirlik-turlar',
    gezinomiPath: '/gunubirlik-turlar',
    slug: 'gunubirlik-turlar',
  },
  {
    code: 'marmara',
    nameTr: 'Marmara Bölgesi Turları',
    nameEn: 'Marmara Region Tours',
    gezinomiLink: 'butik-turlar',
    gezinomiPath: '/butik-turlar',
    slug: 'marmara-turlari',
  },
]

export const KULTUR_REGION_CODES = KULTUR_REGIONS.map((r) => r.code)

export function kulturRegionByCode(code) {
  const c = String(code || '').trim().toLowerCase()
  return KULTUR_REGIONS.find((r) => r.code === c) || null
}

export function kulturRegionBySlug(slug) {
  const s = String(slug || '').trim().toLowerCase()
  return KULTUR_REGIONS.find((r) => r.slug === s) || null
}

export async function fetchGezinomiKulturToursForRegion(region, { categoryId = -1 } = {}) {
  const body = {
    url: region.gezinomiLink,
    path: region.gezinomiPath,
    tourType: 4,
    categoryId,
    tourPeriod: -1,
    tourSubCategory: -1,
    departurePlace: -1,
    visaFree: false,
    isAvailable: false,
    isEkstra: false,
    isCruise: 'false',
    searchCriteria: 0,
    language: 0,
    searchBox: [{ text: '', id: null }],
    filterTourParams: { ...EMPTY_FILTER },
  }
  const r = await fetch(LIST_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'TravelGezinomiKulturImport/1.0' },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`getSearchTourList HTTP ${r.status} (${region.gezinomiLink})`)
  const j = await r.json()
  const list = j.tourSearchResponse?.newTourLists || []
  return list.map((row) => ({
    ...row,
    tourRegion: region.code,
    tourRegionName: region.nameTr,
    categoryLink: region.gezinomiLink,
    productId: Number(row.productId),
  }))
}

export async function fetchAllGezinomiKulturTours({ categoryFilter = '' } = {}) {
  let regions = [...KULTUR_REGIONS]
  if (categoryFilter) {
    const needle = categoryFilter.toLowerCase()
    regions = regions.filter(
      (r) =>
        r.code.includes(needle) ||
        r.gezinomiLink.toLowerCase().includes(needle) ||
        r.nameTr.toLowerCase().includes(needle) ||
        r.slug.includes(needle),
    )
  }

  const byProductId = new Map()
  for (const region of regions) {
    let rows = []
    try {
      rows = await fetchGezinomiKulturToursForRegion(region)
    } catch (e) {
      console.warn(`[warn] ${region.gezinomiLink}: ${e.message}`)
      continue
    }
    for (const row of rows) {
      if (!row.productId) continue
      if (!byProductId.has(row.productId)) {
        byProductId.set(row.productId, { ...row })
      }
    }
    await sleep(Number(process.env.GEIZINOMI_DELAY_MS || 400))
  }
  return [...byProductId.values()]
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

export function gezinomiTourImageUrl(imageUrl, productId) {
  const name = String(imageUrl || '').trim()
  if (!name) return ''
  if (name.startsWith('http')) return name
  return `https://images.gezinomi.com/fit-in/1600x900/filters:quality(90)/assets/${name}-b0.jpg`
}

export function pickTourPrice(row) {
  const amount = row.discountedPrice ?? row.originalPrice ?? row.priceInTL
  if (amount == null || Number(amount) <= 0) return null
  return Number(amount)
}

export function pickTourCurrency(row) {
  const code = String(row.originalUnitCode || row.tlUnitCode || 'TRY').trim().toUpperCase()
  if (code === 'TL') return 'TRY'
  return code || 'TRY'
}

export function parseTourDepartureCity(text) {
  const s = String(text || '').toLowerCase()
  if (s.includes('istanbul') || s.includes('İstanbul'.toLowerCase())) return 'istanbul'
  if (s.includes('ankara')) return 'ankara'
  if (s.includes('izmir') || s.includes('İzmir'.toLowerCase())) return 'izmir'
  if (s.includes('antalya')) return 'antalya'
  if (s.includes('bursa')) return 'bursa'
  return ''
}

export function parseTourTravelType(row, model = null) {
  const hay = [
    row.transportationInfo,
    row.transportionInfo,
    row.tourDeparture,
    model?.tourDeparture,
    model?.transportationInfo,
    row.productName,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  if (/uçak|ucak|fly|plane/.test(hay)) return 'plane'
  if (/otobüs|otobus|bus/.test(hay)) return 'bus'
  return 'bus'
}
