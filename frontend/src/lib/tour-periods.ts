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
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

function normalizeIsoDate(raw: string): string {
  const trimmed = raw.trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10)
  const dotted = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/)
  if (dotted) {
    const [, d, m, y] = dotted
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  const parsed = new Date(trimmed)
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10)
  return ''
}

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
  const keys = ['price', 'amount', 'adultPrice', 'doublePrice', 'singlePrice', 'totalPrice', 'tourPrice', 'double']
  for (const key of keys) {
    const raw = row[key]
    if (raw == null || raw === '') continue
    const num = Number(String(raw).replace(/\s/g, '').replace(',', '.'))
    if (Number.isFinite(num) && num > 0) return num
  }
  return null
}

function periodRowId(row: Record<string, unknown>): string {
  const raw = row.id ?? row.periodId ?? row.tourPeriodId
  return raw != null ? String(raw).trim() : ''
}

function priceRowPeriodId(row: Record<string, unknown>): string {
  const raw = row.periodId ?? row.tourPeriodId ?? row.id
  return raw != null ? String(raw).trim() : ''
}

export function mergeTourPeriodOptions(data: PublicTourPeriodsResponse): TourPeriodOption[] {
  const periods = Array.isArray(data.periods) ? data.periods : []
  const prices = Array.isArray(data.period_prices) ? data.period_prices : []
  const currency = data.currency_code?.trim() || 'TRY'

  const priceByPeriod = new Map<string, number>()
  for (const item of prices) {
    const row = asRecord(item)
    if (!row) continue
    const pid = priceRowPeriodId(row)
    const amount = pickPrice(row)
    if (!pid || amount == null) continue
    const prev = priceByPeriod.get(pid)
    if (prev == null || amount < prev) priceByPeriod.set(pid, amount)
  }

  const today = new Date().toISOString().slice(0, 10)
  const options: TourPeriodOption[] = []

  for (const item of periods) {
    const row = asRecord(item)
    if (!row) continue
    const id = periodRowId(row)
    const startDate = pickDate(row, ['startDate', 'periodStartDate', 'beginDate', 'fromDate', 'start'])
    const endDate = pickDate(row, ['endDate', 'periodEndDate', 'finishDate', 'toDate', 'end'])
    if (!startDate && !endDate) continue
    if (endDate && endDate < today) continue

    const price = (id ? priceByPeriod.get(id) : undefined) ?? pickPrice(row) ?? null
    options.push({
      id: id || `${startDate}-${endDate}`,
      startDate: startDate || endDate,
      endDate: endDate || startDate,
      price,
      currencyCode: currency,
      bookable: true,
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
