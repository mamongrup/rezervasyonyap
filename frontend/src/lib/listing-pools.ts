/**
 * Tatil evi dikey meta (`vertical_holiday_home`) — havuz satırları.
 * Panel: `CatalogNewListingClient` → `putVerticalMeta(..., 'holiday_home', { pools })`
 */
export type HolidayHomePoolRow = {
  enabled: boolean
  width: string
  length: string
  depth: string
  description: string
  heating_fee_per_day: string
}

export type HolidayHomePools = {
  open_pool: HolidayHomePoolRow
  heated_pool: HolidayHomePoolRow
  children_pool: HolidayHomePoolRow
}

const POOL_KEYS = ['open_pool', 'heated_pool', 'children_pool'] as const

function normalizePoolRow(raw: unknown): HolidayHomePoolRow {
  if (!raw || typeof raw !== 'object') {
    return {
      enabled: false,
      width: '',
      length: '',
      depth: '',
      description: '',
      heating_fee_per_day: '',
    }
  }
  const r = raw as Record<string, unknown>
  return {
    enabled: r.enabled === true,
    width: r.width != null ? String(r.width) : '',
    length: r.length != null ? String(r.length) : '',
    depth: r.depth != null ? String(r.depth) : '',
    description: r.description != null ? String(r.description) : '',
    heating_fee_per_day: r.heating_fee_per_day != null ? String(r.heating_fee_per_day) : '',
  }
}

/** Backend `listing_attributes.value_json` — bazen `{ category, data }`, bazen doğrudan `data` */
export function extractHolidayHomePoolsFromVerticalMeta(meta: unknown): HolidayHomePools | null {
  if (!meta || typeof meta !== 'object') return null
  const root = meta as Record<string, unknown>
  const data =
    root.data != null && typeof root.data === 'object'
      ? (root.data as Record<string, unknown>)
      : root
  const rawPools = data.pools
  if (!rawPools || typeof rawPools !== 'object') return null
  const p = rawPools as Record<string, unknown>
  const out: Partial<HolidayHomePools> = {}
  for (const k of POOL_KEYS) {
    out[k] = normalizePoolRow(p[k])
  }
  return out as HolidayHomePools
}

export function hasAnyEnabledPool(pools: HolidayHomePools): boolean {
  return pools.open_pool.enabled || pools.heated_pool.enabled || pools.children_pool.enabled
}

/** Havuz ısıtma ücreti metninden günlük tutarı çıkarır (örn. `350 ₺`, `350 ₺'dir, …`). */
export function parseHeatingFeeAmountFromLabel(raw: string): number | null {
  const s = raw.trim()
  if (!s) return null
  const m = s.match(/(\d+(?:[.,]\d+)?)/)
  if (!m) return null
  const n = parseFloat(m[1].replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Rezervasyon kartı: ısıtmalı havuz açık ve günlük ücret parse edilebiliyorsa */
export function getPoolHeatingReservationOption(
  pools: HolidayHomePools | null | undefined,
  listingCurrencyCode: string,
): { dailyAmount: number; feeSummary: string; currencyCode: string } | null {
  if (!pools?.heated_pool?.enabled) return null
  const raw = pools.heated_pool.heating_fee_per_day?.trim()
  if (!raw) return null
  const dailyAmount = parseHeatingFeeAmountFromLabel(raw)
  if (dailyAmount == null || dailyAmount <= 0) return null
  const currencyCode = listingCurrencyCode.trim().toUpperCase() || 'TRY'
  return { dailyAmount, feeSummary: raw, currencyCode }
}

/** Ölçülerden en az biri doluysa göster */
export function formatPoolDimensionsMm(row: HolidayHomePoolRow): string | null {
  const w = row.width.trim()
  const l = row.length.trim()
  const d = row.depth.trim()
  if (!w && !l && !d) return null
  const parts = [w, l, d].filter(Boolean)
  return parts.join(' × ')
}
