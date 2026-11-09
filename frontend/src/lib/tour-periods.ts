import { pickTourPeriodPersonPrice, isWtatilPeriodSellable, supplierDate, supplierBusinessDate } from './supplier-tour-price.mjs'
export { pickTourPeriodPersonPrice, isWtatilPeriodSellable }
export type PublicTourPeriodsResponse = {
  currency_code: string
  periods: unknown[]
  period_prices: unknown[]
}

export type TourPeriodOption = {
  id: string
  startDate: string
  endDate: string
  price: number | null
  currencyCode: string
  /** false = planlanmış kalkış, henüz online satışa kapalı */
  bookable?: boolean
  /** false = tarih seçilebilir / fiyat görünür ama ödeme ile checkout yok (Gezinomi katalog) */
  onlineCheckout?: boolean
  /** Gezinomi ay grubu — örn. "Temmuz 2026" */
  monthLabel?: string
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

function normalizeIsoDate(raw:string):string {return supplierDate(raw)??''}

function pickDate(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'string' && value.trim()) {
      const iso = normalizeIsoDate(value)
      if (iso) return iso
    }
  }
  return ''
}

function pickPrice(row: Record<string, unknown>): number | null {
  return pickTourPeriodPersonPrice(row)
}

function periodRowId(row: Record<string, unknown>): string {
  const raw = row.id ?? row.ID ?? row.periodId ?? row.PeriodId ?? row.tourPeriodId ?? row.TourPeriodId
  return raw != null ? String(raw).trim() : ''
}

/** Wtatil dönem satışa kapalı mı (Stop&Sale, kota dolu vb.) */
function priceRowPeriodId(row: Record<string, unknown>): string {
  const raw = row.periodId ?? row.PeriodId ?? row.tourPeriodId ?? row.TourPeriodId ?? row.id ?? row.ID
  return raw != null ? String(raw).trim() : ''
}

export function mergeTourPeriodOptions(data: PublicTourPeriodsResponse): TourPeriodOption[] {
  const periods = Array.isArray(data.periods) ? data.periods : []
  const prices = Array.isArray(data.period_prices) ? data.period_prices : []
  const currency = data.currency_code?.trim() || 'TRY'

  const priceByPeriod = new Map<string, number>()
  const periodsWithPriceRows = new Set<string>()
  for (const item of prices) {
    const row = asRecord(item)
    if (!row) continue
    const pid = priceRowPeriodId(row)
    if (pid) periodsWithPriceRows.add(pid)
    if (!isWtatilPeriodSellable(row)) continue
    const amount = pickPrice(row)
    if (!pid || amount == null) continue
    const prev = priceByPeriod.get(pid)
    if (prev == null || amount < prev) priceByPeriod.set(pid, amount)
  }

  const today = supplierBusinessDate()
  const options: TourPeriodOption[] = []

  for (const item of periods) {
    const row = asRecord(item)
    if (!row) continue
    if (!isWtatilPeriodSellable(row)) continue
    const id = periodRowId(row)
    const startDate = pickDate(row, [
      'startDate',
      'StartDate',
      'periodStartDate',
      'PeriodStartDate',
      'beginDate',
      'BeginDate',
      'fromDate',
      'FromDate',
      'departureDate',
      'DepartureDate',
      'start',
    ])
    const endDate = pickDate(row, [
      'endDate',
      'EndDate',
      'periodEndDate',
      'PeriodEndDate',
      'finishDate',
      'FinishDate',
      'toDate',
      'ToDate',
      'returnDate',
      'ReturnDate',
      'end',
    ])
    if (!startDate || startDate < today) continue
    if (endDate && (endDate < today || endDate < startDate)) continue
    if (id && periodsWithPriceRows.has(id) && !priceByPeriod.has(id)) continue

    const price = (id ? priceByPeriod.get(id) : undefined) ?? pickPrice(row) ?? null
    options.push({
      id: id || `${startDate}-${endDate}`,
      startDate: startDate || endDate,
      endDate: endDate || startDate,
      price,
      currencyCode: currency,
      bookable: price != null,
    })
  }

  options.sort((a, b) => a.startDate.localeCompare(b.startDate))
  return options
}

/** Uçuş programı + satışa açık Wtatil dönemlerini tek listede birleştirir. */
export function buildTourPeriodSelectOptions(
  bookablePeriods: TourPeriodOption[],
  flightSchedules: { departureDate: string; returnDate: string }[],
  currencyCode: string,
): TourPeriodOption[] {
  const today = new Date().toISOString().slice(0, 10)
  const currency = currencyCode.trim() || 'TRY'

  if (flightSchedules.length === 0) {
    return bookablePeriods.map((p) => ({ ...p, bookable: p.bookable !== false }))
  }

  const bookableByStart = new Map<string, TourPeriodOption>()
  for (const p of bookablePeriods) {
    if (p.startDate) bookableByStart.set(p.startDate, { ...p, bookable: true })
  }

  const merged: TourPeriodOption[] = []
  const seenStarts = new Set<string>()

  const sortedFlights = [...flightSchedules].sort((a, b) =>
    a.departureDate.localeCompare(b.departureDate),
  )

  for (const flight of sortedFlights) {
    if (flight.departureDate < today) continue
    seenStarts.add(flight.departureDate)

    const bookable = bookableByStart.get(flight.departureDate)
    if (bookable) {
      merged.push({
        ...bookable,
        endDate: bookable.endDate || flight.returnDate,
        bookable: true,
      })
      bookableByStart.delete(flight.departureDate)
    } else {
      merged.push({
        id: `planned-${flight.departureDate}`,
        startDate: flight.departureDate,
        endDate: flight.returnDate,
        price: null,
        currencyCode: currency,
        bookable: false,
      })
    }
  }

  for (const p of bookableByStart.values()) {
    if (p.endDate && p.endDate < today) continue
    merged.push({ ...p, bookable: true })
  }

  merged.sort((a, b) => a.startDate.localeCompare(b.startDate))
  return merged
}

export function isTourPeriodBookable(period: TourPeriodOption | null | undefined): boolean {
  return period != null && period.bookable !== false
}

export function isTourPeriodOnlineCheckout(period: TourPeriodOption | null | undefined): boolean {
  if (!isTourPeriodBookable(period)) return false
  return period?.onlineCheckout !== false
}

export function formatTourPeriodDateRange(start: string, end: string): string {
  const fmt = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number)
    if (!y || !m || !d) return iso
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(y, m - 1, d))
  }
  const a = start ? fmt(start) : ''
  const b = end ? fmt(end) : ''
  if (a && b) return `${a} - ${b}`
  return a || b
}

export function formatTourPeriodPrice(amount: number | null, currency: string): string {
  if (amount == null) return '—'
  try {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(amount)
  } catch {
    return `${amount.toLocaleString('tr-TR')} ${currency}`
  }
}
