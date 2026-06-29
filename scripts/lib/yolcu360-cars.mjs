/**
 * Yolcu360 search/point yanıtından araç kayıtlarını düzleştirir.
 * (frontend/src/lib/yolcu360-cars.ts ile uyumlu)
 */

function asRecord(v) {
  return v && typeof v === 'object' && !Array.isArray(v) ? v : null
}

function pickNum(...vals) {
  for (const v of vals) {
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (typeof v === 'string' && v.trim() !== '') {
      const n = parseFloat(v.replace(/\s/g, '').replace(/,/g, '.'))
      if (Number.isFinite(n)) return n
    }
  }
  return undefined
}

function pickStr(...vals) {
  for (const v of vals) {
    if (typeof v === 'string' && v.trim() !== '') return v.trim()
    if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  }
  return ''
}

/**
 * Yolcu360 `pricing.total.amount` kuruş tamsayısı döner (TRY * 100); canlı
 * yanıtta doğrulandı. `>= 1000` eşiği olası major-unit değeri yanlışlıkla
 * bölmemek için korunur. İmkânsız düşük fiyatlar `isPlausiblyPricedCar` ile elenir.
 */
function moneyAmount(v) {
  const n = pickNum(v)
  if (n === undefined) return undefined
  return n >= 1000 ? n / 100 : n
}

function nestedName(obj) {
  const r = asRecord(obj)
  return r ? pickStr(r.name, r.displayName) : ''
}

/** @param {unknown} item @param {number} index */
export function flattenYolcu360CarItem(item, index) {
  const r = asRecord(item) ?? {}
  const vehicle = asRecord(r.vehicle) ?? asRecord(r.car)
  const pricing = asRecord(r.price) ?? asRecord(r.pricing)
  const vendor = asRecord(r.vendor) ?? asRecord(r.supplier)
  const images = Array.isArray(r.images) ? r.images : []
  const firstImg = asRecord(images[0])
  const totalMoney = asRecord(pricing?.total) ?? asRecord(pricing?.fee)
  const days = pickNum(r.rentalDurationInDays)

  const searchID = pickStr(r.searchID, r.searchId) || undefined
  const productCode = pickStr(r.code) || undefined
  const id = productCode || pickStr(r.id, r.productId) || searchID || `idx-${index}`
  const totalPrice = moneyAmount(
    pickNum(r.totalPrice, r.total_price, totalMoney?.amount, pricing?.total),
  )
  let dailyPrice = moneyAmount(
    pickNum(
      r.dailyPrice,
      r.daily_price,
      pricing?.daily,
      pricing?.dailyPrice,
      pricing?.dailyAmount,
    ),
  )
  if (dailyPrice === undefined && totalPrice !== undefined && days && days > 0) {
    dailyPrice = totalPrice / days
  }

  const brand = pickStr(r.brand, r.make, nestedName(r.brand), vehicle?.brand, vehicle?.make)
  const model = pickStr(r.model, nestedName(r.model), vehicle?.model)
  const vehicleClass = pickStr(
    r.vehicleClass,
    r.customClassName,
    nestedName(r.class),
    vehicle?.class,
    vehicle?.vehicleClass,
  )

  return {
    id,
    searchID,
    productCode,
    vehicleClass: vehicleClass || undefined,
    brand: brand || undefined,
    model: model || undefined,
    imageUrl:
      pickStr(r.imageURL, r.imageUrl, r.image, firstImg?.url, firstImg?.imageUrl) || undefined,
    thumbnailUrl: pickStr(r.thumbnailUrl, r.thumbnail, firstImg?.thumbnailUrl) || undefined,
    dailyPrice,
    totalPrice,
    currency: pickStr(r.currency, totalMoney?.currency, pricing?.currency) || undefined,
    transmission:
      pickStr(
        r.transmission,
        nestedName(r.transmission),
        vehicle?.transmission,
        r.gearType,
      ) || undefined,
    seats: pickNum(r.seats, vehicle?.seats, r.seatCount),
    fuelType:
      pickStr(r.fuelType, nestedName(r.fuel), vehicle?.fuelType, r.fuel) || undefined,
    bags: pickNum(r.bags, vehicle?.bags, r.bagCount),
    vendorName:
      pickStr(r.vendorName, nestedName(vendor), vendor?.name, r.supplierName) || undefined,
    vendorLogo: pickStr(r.vendorLogo, vendor?.logo, vendor?.logoUrl) || undefined,
    pickupLocationId: pickStr(r.pickupLocationId, r.pickUpLocationId) || undefined,
    returnLocationId: pickStr(r.returnLocationId) || undefined,
    raw: item,
  }
}

/** @param {unknown} raw */
export function normalizeYolcu360Cars(raw) {
  if (Array.isArray(raw)) {
    return raw.map((item, i) => flattenYolcu360CarItem(item, i))
  }
  const r = asRecord(raw)
  if (!r) return []
  for (const key of ['data', 'cars', 'vehicles', 'results', 'items']) {
    const arr = r[key]
    if (Array.isArray(arr)) {
      return arr.map((item, i) => flattenYolcu360CarItem(item, i))
    }
  }
  return []
}

/**
 * Toplam tutarı bu eşiğin altındaki kayıt Yolcu360'ta bozuk/yanlış ölçeklenmiş
 * demektir (çok günlük araç kiralama toplamı ₺1.000 altı olamaz). Vitrin
 * (`yolcu360-car-search.ts`) ile aynı kural — import'ta da bozuk fiyatlı ilan kaydedilmesin.
 */
export const YOLCU360_MIN_PLAUSIBLE_TOTAL_TRY = 1000

/** @param {{ totalPrice?: number, dailyPrice?: number }} car */
export function isPlausiblyPricedCar(car) {
  const total = car.totalPrice
  if (typeof total === 'number' && Number.isFinite(total) && total > 0) {
    return total >= YOLCU360_MIN_PLAUSIBLE_TOTAL_TRY
  }
  const daily = car.dailyPrice
  if (typeof daily === 'number' && Number.isFinite(daily) && daily > 0) {
    return daily >= 150
  }
  return true
}

/** @param {ReturnType<typeof flattenYolcu360CarItem>} car */
export function carTitle(car) {
  const brand = String(car.brand ?? '')
  const model = String(car.model ?? '')
  const vehicleClass = String(car.vehicleClass ?? '')
  return [brand, model].filter(Boolean).join(' ') || vehicleClass || 'Araç kiralama'
}
