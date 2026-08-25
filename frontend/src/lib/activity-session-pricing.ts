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
