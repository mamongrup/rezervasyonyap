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
  // Seans yoksa → verilen başlangıç fiyatı ve para birimiyle varsayılan 1 seans oluştur
  if (sessions.length === 0) {
    const trimmed = String(price ?? '').trim()
    if (!trimmed || trimmed === '0') return []
    const today = new Date().toISOString().slice(0, 10)
    const nextYear = new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10)
    return [
      {
        session_name: 'Standart Seans',
        valid_from: today,
        valid_to: nextYear,
        start_time: '09:00',
        duration_minutes: '120',
        capacity: '10',
        adult_price: trimmed,
        child_price: '',
        currency_code: currency || 'TRY',
        is_active: true,
        description: '',
      } as unknown as T,
    ]
  }

  // Tek seans → doğrudan güncelle
  if (sessions.length === 1) {
    return [
      {
        ...sessions[0],
        adult_price: price,
        currency_code: currency,
      },
    ]
  }

  // Çoklu seans → vitrin fiyatı en düşük aktif seans fiyatından hesaplandığından,
  // tüm aktif seansların yetişkin fiyatını yeni değere senkronize et.
  return sessions.map((session) => {
    if (session.is_active === false) return session
    return {
      ...session,
      adult_price: price,
      currency_code: currency,
    }
  })
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
  // İçe aktarılan ilanlarda valid_from/valid_to/start_time eksik olabilir;
  // bu durumda seans kaydı sessizce atlanır ve eski fiyatlar DB'de kalır.
  // Default tarih ekleyerek kaydın her zaman çalışmasını sağla.
  const today = new Date().toISOString().slice(0, 10)
  const nextYear = new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10)

  return sessions
    .map((session) => ({
      ...session,
      valid_from: session.valid_from || today,
      valid_to: session.valid_to || nextYear,
      start_time: session.start_time || '09:00',
    }))
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
