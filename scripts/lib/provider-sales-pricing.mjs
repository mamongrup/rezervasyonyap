/** Supplier prices remain net in snapshots; only sale amounts receive the markup. */
const settingsByClient = new WeakMap()

export function salePrice(net, percent) {
  if (net == null || net === '') return null
  const amount = typeof net === 'string' ? Number(net.trim().replace(',', '.')) : Number(net)
  const rate = Number(percent)
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) throw new Error('invalid_sales_markup_percent')
  if (!Number.isFinite(amount) || amount <= 0) return null
  return Math.round((amount * (1 + rate / 100) + Number.EPSILON) * 100) / 100
}

export async function providerMarkupPercent(pg, provider) {
  if (!settingsByClient.has(pg)) {
    settingsByClient.set(pg, pg.query(
      `SELECT value_json FROM site_settings WHERE key = 'listing_api_providers'
       AND organization_id IS NULL ORDER BY id DESC LIMIT 1`,
    ).then((r) => r.rows[0]?.value_json ?? {}))
  }
  const settings = await settingsByClient.get(pg)
  const raw = settings[provider]?.sales_markup_percent
  if (raw == null || raw === '') throw new Error(`${provider}_sales_markup_not_configured`)
  const rate = Number(raw)
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) throw new Error('invalid_sales_markup_percent')
  return rate
}

// Explicit monetary fields only: never modify quota, ids, dates, passenger counts or currency.
const MONEY_FIELDS = new Set([
  'double', 'triple', 'single', 'quad', 'child_1', 'child_2', 'child_3', 'infant',
  'adultPrice', 'doublePrice', 'singlePrice', 'triplePrice', 'childPrice', 'infantPrice',
  'price', 'amount', 'tourPrice', 'totalPrice', 'cheapestPrice',
])

function mapMoney(value, percent, money = false) {
  if (Array.isArray(value)) return value.map((item) => mapMoney(item, percent, money))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [
      key,
      mapMoney(child, percent, MONEY_FIELDS.has(key) || (money && key === 'value')),
    ]))
  }
  if (!money || value == null || value === '' || typeof value === 'boolean') return value
  const amount = salePrice(value, percent)
  if (amount == null) return value
  return typeof value === 'string' ? amount.toFixed(2) : amount
}

export function priceWtatilEnrichment(enrich, percent) {
  if (!enrich) return enrich
  const net = enrich.provider_net_prices ?? {
    periods: enrich.periods,
    periodPrices: enrich.periodPrices,
    cheapestPrice: enrich.cheapestPrice,
  }
  return {
    ...enrich,
    periods: mapMoney(net.periods, percent),
    periodPrices: mapMoney(net.periodPrices, percent),
    cheapestPrice: mapMoney(net.cheapestPrice, percent, true),
    provider_net_prices: net,
    pricing: { basis: 'supplier_net_plus_markup', markup_percent: Number(percent) },
  }
}
