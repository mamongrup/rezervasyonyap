export type ActivitySessionPriceRow = {
  adult_price: string
  currency_code: string
  is_active: boolean
}

export function activityStartingPrice<T extends ActivitySessionPriceRow>(sessions: T[]): string {
  const prices = sessions
    .filter((session) => session.is_active)
    .map((session) => Number(session.adult_price.replace(',', '.')))
    .filter((price) => Number.isFinite(price) && price > 0)

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
      is_active: session.is_active,
      sort_order: String(index),
      adult_price: session.adult_price || '0',
      child_price: session.child_price || '',
      currency_code: session.currency_code || fallbackCurrency || 'TRY',
    }))
}
