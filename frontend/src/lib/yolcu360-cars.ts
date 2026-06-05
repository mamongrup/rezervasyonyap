import type { TListingBase } from '@/types/listing-types'

export interface Yolcu360Car {
  id: string
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

/** Yolcu360 ham araç kaydını düzleştirir (iç içe vehicle/price alanları dahil). */
export function flattenYolcu360CarItem(item: unknown, index: number): Yolcu360Car {
  const r = asRecord(item) ?? {}
  const vehicle = asRecord(r['vehicle']) ?? asRecord(r['car'])
  const price = asRecord(r['price']) ?? asRecord(r['pricing'])
  const vendor = asRecord(r['vendor']) ?? asRecord(r['supplier'])
  const images = Array.isArray(r['images']) ? r['images'] : []
  const firstImg = asRecord(images[0])

  const id = pickStr(r['id'], r['productId'], r['searchId'], r['code']) || `idx-${index}`

  return {
    id,
    vehicleClass: pickStr(r['vehicleClass'], r['class'], vehicle?.['class'], vehicle?.['vehicleClass']) || undefined,
    brand: pickStr(r['brand'], r['make'], vehicle?.['brand'], vehicle?.['make']) || undefined,
    model: pickStr(r['model'], vehicle?.['model']) || undefined,
    imageUrl:
      pickStr(r['imageUrl'], r['image'], firstImg?.['url'], firstImg?.['imageUrl']) || undefined,
    thumbnailUrl: pickStr(r['thumbnailUrl'], r['thumbnail'], firstImg?.['thumbnailUrl']) || undefined,
    dailyPrice: pickNum(
      r['dailyPrice'],
      r['daily_price'],
      price?.['daily'],
      price?.['dailyPrice'],
      price?.['dailyAmount'],
    ),
    totalPrice: pickNum(r['totalPrice'], r['total_price'], price?.['total'], price?.['totalPrice']),
    currency: pickStr(r['currency'], price?.['currency']) || undefined,
    transmission: pickStr(r['transmission'], vehicle?.['transmission'], r['gearType']) || undefined,
    seats: pickNum(r['seats'], vehicle?.['seats'], r['seatCount']),
    fuelType: pickStr(r['fuelType'], vehicle?.['fuelType'], r['fuel']) || undefined,
    bags: pickNum(r['bags'], vehicle?.['bags'], r['bagCount']),
    vendorName: pickStr(r['vendorName'], vendor?.['name'], r['supplierName']) || undefined,
    vendorLogo: pickStr(r['vendorLogo'], vendor?.['logo'], vendor?.['logoUrl']) || undefined,
    requiresFindeks: Boolean(r['requiresFindeks'] ?? r['findeksRequired']),
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
): TListingBase & { seats?: number; gearshift?: string } {
  const brand = String(car.brand ?? '')
  const model = String(car.model ?? '')
  const vehicleClass = String(car.vehicleClass ?? '')
  const title =
    [brand, model].filter(Boolean).join(' ') ||
    vehicleClass ||
    `Araç ${index + 1}`
  const slug = `yolcu360-${String(car.id ?? index)}`
  const price = car.dailyPrice
    ? new Intl.NumberFormat('tr-TR', { style: 'decimal', maximumFractionDigits: 0 }).format(
        car.dailyPrice,
      ) +
      ' ' +
      (car.currency ?? 'TRY')
    : undefined

  return {
    id: slug,
    handle: slug,
    title,
    price,
    priceAmount: car.dailyPrice,
    priceCurrency: car.currency ?? 'TRY',
    featuredImage: car.imageUrl ?? car.thumbnailUrl ?? '',
    listingCategory: 'Araç Kiralama',
    listingVertical: 'car_rental',
    reviewStart: 0,
    reviewCount: 0,
    seats: typeof car.seats === 'number' ? car.seats : undefined,
    gearshift: car.transmission,
    isNew: false,
  }
}
