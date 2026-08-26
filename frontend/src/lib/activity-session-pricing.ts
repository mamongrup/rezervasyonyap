export type ActivitySessionPriceRow = {
  adult_price?: string | null
  currency_code?: string | null
  is_active?: boolean
}

export function activityActiveSessionPrices<T extends ActivitySessionPriceRow>(sessions: T[]) {
  return sessions.flatMap((session) => {
    if (session.is_active === false) return []
    const amount = Number(String(session.adult_price ?? '').replace(',', '.'))
    if (!Number.isFinite(amount) || amount <= 0) return []
    return [{ amount, currencyCode: (session.currency_code || 'TRY').trim().toUpperCase() }]
  })
}

export function activityLowestSessionPrice<T extends ActivitySessionPriceRow>(
  sessions: T[],
  comparisonAmount: (amount: number, currencyCode: string) => number | null = (amount) => amount,
) {
  return activityActiveSessionPrices(sessions)
    .flatMap((price) => {
      const comparable = comparisonAmount(price.amount, price.currencyCode)
      return comparable == null || !Number.isFinite(comparable)
        ? []
        : [{ ...price, comparisonAmount: comparable }]
    })
    .reduce<{ amount: number; currencyCode: string; comparisonAmount: number } | null>(
      (lowest, candidate) =>
        lowest == null || candidate.comparisonAmount < lowest.comparisonAmount ? candidate : lowest,
      null,
    )
}

export function activityTotalWithStaffPrice(
  baseTotal: number,
  participantCount: number,
  specialUnitPrice: number,
  selected: boolean,
): number {
  if (!selected || specialUnitPrice <= 0 || participantCount <= 0) return baseTotal
  return specialUnitPrice * participantCount
}

export function activityStartingPrice<T extends ActivitySessionPriceRow>(sessions: T[]): string {
  const prices = activityActiveSessionPrices(sessions).map((price) => price.amount)

  return prices.length > 0 ? String(Math.min(...prices)) : ''
}

export function syncSingleActivitySessionPrice<T extends ActivitySessionPriceRow>(
  sessions: T[],
  price: string,
  currency: string,
): T[] {
  if (sessions.length !== 1) return sessions

  return [
    {
      ...sessions[0],
      adult_price: price,
      currency_code: currency,
    },
  ]
}

export type ActivitySessionSaveRow = ActivitySessionPriceRow & {
  id?: string
  valid_from: string
  valid_to: string
  start_time: string
  duration_minutes?: string
  capacity?: string
  child_price?: string
}

export function activitySessionsForSave<T extends ActivitySessionSaveRow>(
  sessions: T[],
  fallbackCurrency: string,
) {
  return sessions
    .filter((session) => session.valid_from && session.valid_to && session.start_time)
    .map((session, index) => ({
      id: session.id,
      valid_from: session.valid_from,
      valid_to: session.valid_to,
      start_time: session.start_time,
      duration_minutes: session.duration_minutes || '60',
      capacity: session.capacity || '10',
      is_active: session.is_active !== false,
      sort_order: String(index),
      adult_price: session.adult_price || '0',
      child_price: session.child_price || '',
      currency_code: session.currency_code || fallbackCurrency || 'TRY',
    }))
}
