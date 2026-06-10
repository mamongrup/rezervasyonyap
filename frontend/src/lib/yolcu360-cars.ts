import type { TListingBase } from '@/types/listing-types'

/** Yolcu360 checkout zorunlu; yalnızca checkin varsa varsayılan +N gün. */
export function ensureCarRentalCheckout(
  checkin: string,
  checkout?: string,
  extraDays = 3,
): string {
  const cout = (checkout ?? '').trim()
  if (cout) return cout
  const cin = checkin.trim()
  if (!cin) return ''
  const d = new Date(`${cin}T12:00:00`)
  if (Number.isNaN(d.getTime())) return ''
  d.setDate(d.getDate() + extraDays)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export interface Yolcu360Car {
  id: string
  /** Arama oturumu — POST /order için zorunlu */
  searchID?: string
  /** Araç ürün kodu — POST /order `code` alanı */
  productCode?: string
  vehicleClass?: string
  brand?: string
  model?: string
  imageUrl?: string
  thumbnailUrl?: string
  dailyPrice?: number
  totalPrice?: number
  currency?: string
  transmission?: string
  seats?: number
  fuelType?: string
  bags?: number
  vendorName?: string
  vendorLogo?: string
  requiresFindeks?: boolean
  pickupLocationId?: string
  returnLocationId?: string
  [key: string]: unknown
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

function pickNum(...vals: unknown[]): number | undefined {
  for (const v of vals) {
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (typeof v === 'string' && v.trim() !== '') {
      const n = parseFloat(v.replace(/\s/g, '').replace(/,/g, '.'))
      if (Number.isFinite(n)) return n
    }
  }
  return undefined
}

function pickStr(...vals: unknown[]): string {
  for (const v of vals) {
    if (typeof v === 'string' && v.trim() !== '') return v.trim()
    if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  }
  return ''
}

/** API amount alanları genelde kuruş (TRY * 100). */
function moneyAmount(v: unknown): number | undefined {
  const n = pickNum(v)
  if (n === undefined) return undefined
  return n >= 1000 ? n / 100 : n
}

function nestedName(obj: unknown): string {
  const r = asRecord(obj)
  return r ? pickStr(r['name'], r['displayName']) : ''
}

/** Yolcu360 ham araç kaydını düzleştirir (search/point results dahil). */
export function flattenYolcu360CarItem(item: unknown, index: number): Yolcu360Car {
  const r = asRecord(item) ?? {}
  const vehicle = asRecord(r['vehicle']) ?? asRecord(r['car'])
  const pricing = asRecord(r['price']) ?? asRecord(r['pricing'])
  const vendor = asRecord(r['vendor']) ?? asRecord(r['supplier'])
  const images = Array.isArray(r['images']) ? r['images'] : []
  const firstImg = asRecord(images[0])
  const totalMoney = asRecord(pricing?.['total']) ?? asRecord(pricing?.['fee'])
  const days = pickNum(r['rentalDurationInDays'])

  const searchID = pickStr(r['searchID'], r['searchId']) || undefined
  const productCode = pickStr(r['code']) || undefined
  const id =
    productCode || pickStr(r['id'], r['productId']) || searchID || `idx-${index}`
  const totalPrice = moneyAmount(
    pickNum(r['totalPrice'], r['total_price'], totalMoney?.['amount'], pricing?.['total']),
  )
  let dailyPrice = moneyAmount(
    pickNum(
      r['dailyPrice'],
      r['daily_price'],
      pricing?.['daily'],
      pricing?.['dailyPrice'],
      pricing?.['dailyAmount'],
    ),
  )
  if (dailyPrice === undefined && totalPrice !== undefined && days && days > 0) {
    dailyPrice = totalPrice / days
  }

  return {
    id,
    searchID,
    productCode,
    vehicleClass:
      pickStr(
        r['vehicleClass'],
        r['customClassName'],
        nestedName(r['class']),
        vehicle?.['class'],
        vehicle?.['vehicleClass'],
      ) || undefined,
    brand:
      pickStr(r['brand'], r['make'], nestedName(r['brand']), vehicle?.['brand'], vehicle?.['make']) ||
      undefined,
    model: pickStr(r['model'], nestedName(r['model']), vehicle?.['model']) || undefined,
    imageUrl:
      pickStr(
        r['imageURL'],
        r['imageUrl'],
        r['image'],
        firstImg?.['url'],
        firstImg?.['imageUrl'],
      ) || undefined,
    thumbnailUrl: pickStr(r['thumbnailUrl'], r['thumbnail'], firstImg?.['thumbnailUrl']) || undefined,
    dailyPrice,
    totalPrice,
    currency:
      pickStr(r['currency'], totalMoney?.['currency'], pricing?.['currency']) || undefined,
    transmission:
      pickStr(
        r['transmission'],
        nestedName(r['transmission']),
        vehicle?.['transmission'],
        r['gearType'],
      ) || undefined,
    seats: pickNum(r['seats'], vehicle?.['seats'], r['seatCount']),
    fuelType:
      pickStr(r['fuelType'], nestedName(r['fuel']), vehicle?.['fuelType'], r['fuel']) || undefined,
    bags: pickNum(r['bags'], vehicle?.['bags'], r['bagCount']),
    vendorName:
      pickStr(r['vendorName'], nestedName(vendor), vendor?.['name'], r['supplierName']) || undefined,
    vendorLogo: pickStr(r['vendorLogo'], vendor?.['logo'], vendor?.['logoUrl']) || undefined,
    requiresFindeks: Boolean(r['isFindeksRequired'] ?? r['requiresFindeks'] ?? r['findeksRequired']),
    pickupLocationId: pickStr(r['pickupLocationId'], r['pickUpLocationId']) || undefined,
    returnLocationId: pickStr(r['returnLocationId']) || undefined,
  }
}

/** Backend'in döndürdüğü ham JSON'dan araç listesini çıkarır. */
export function normalizeYolcu360Cars(raw: unknown): Yolcu360Car[] {
  if (Array.isArray(raw)) {
    return raw.map((item, i) => flattenYolcu360CarItem(item, i))
  }
  const r = asRecord(raw)
  if (!r) return []
  for (const key of ['data', 'cars', 'vehicles', 'results', 'items'] as const) {
    const arr = r[key]
    if (Array.isArray(arr)) {
      return arr.map((item, i) => flattenYolcu360CarItem(item, i))
    }
  }
  return []
}

/** Yolcu360 araç yanıtını TListingBase'e dönüştürür */
export function mapYolcu360CarToListing(
  car: Yolcu360Car,
  index: number,
  detailQuery?: string,
): TListingBase & {
  seats?: number
  gearshift?: string
  yolcu360RawId?: string
  yolcu360TotalPrice?: number
  yolcu360FuelType?: string
  yolcu360VendorName?: string
  yolcu360Bags?: number
} {
  const brand = String(car.brand ?? '')
  const model = String(car.model ?? '')
  const vehicleClass = String(car.vehicleClass ?? '')
  const title =
    [brand, model].filter(Boolean).join(' ') ||
    vehicleClass ||
    `Araç ${index + 1}`
  const rawId = String(car.id ?? index)
  const slug = `yolcu360-${index}`
  const handle = slug
  const price = car.dailyPrice
    ? new Intl.NumberFormat('tr-TR', { style: 'decimal', maximumFractionDigits: 0 }).format(
        car.dailyPrice,
      ) +
      ' ' +
      (car.currency ?? 'TRY')
    : undefined

  const img = car.imageUrl ?? car.thumbnailUrl ?? ''

  return {
    id: slug,
    handle,
    detailSearchQuery: detailQuery,
    yolcu360RawId: rawId,
    yolcu360SearchId: car.searchID,
    yolcu360ProductCode: car.productCode,
    yolcu360TotalPrice: car.totalPrice,
    yolcu360FuelType: car.fuelType,
    yolcu360VendorName: car.vendorName,
    yolcu360Bags: car.bags,
    title,
    price,
    priceAmount: car.dailyPrice,
    priceCurrency: car.currency ?? 'TRY',
    galleryImgs: img ? [img] : [],
    featuredImage: img,
    listingVertical: 'car_rental',
    reviewStart: 0,
    reviewCount: 0,
    seats: typeof car.seats === 'number' ? car.seats : undefined,
    gearshift: car.transmission,
    isNew: false,
  }
}
