const STAY_SEARCH_PARAM_MAP = [
  ['checkIn', 'checkIn', 'checkin'],
  ['checkOut', 'checkOut', 'checkout'],
  ['guestAdults', 'guestAdults'],
  ['guestChildren', 'guestChildren'],
  ['guestInfants', 'guestInfants'],
  ['childAges', 'childAges'],
] as const

/**
 * Sonuç kartının sunucu verisi eski/önbellekli olsa bile mevcut aramadaki
 * rezervasyon bağlamını detay URL'sine taşır.
 */
export function mergeStaySearchIntoDetailQuery(
  detailSearchQuery: string | undefined,
  pageSearch: URLSearchParams,
): string {
  const query = new URLSearchParams(detailSearchQuery ?? '')

  for (const [target, ...sources] of STAY_SEARCH_PARAM_MAP) {
    if (query.has(target)) continue
    for (const source of sources) {
      const value = pageSearch.get(source)?.trim()
      if (!value) continue
      query.set(target, value)
      break
    }
  }

  // Eski arama URL'lerinde yalnızca toplam `guests` bulunur. Ayrıntılı dağılım
  // yoksa mevcut davranışla uyumlu biçimde yetişkin sayısı olarak aktarılır.
  if (!query.has('guestAdults')) {
    const guests = pageSearch.get('guests')?.trim()
    if (guests) query.set('guestAdults', guests)
  }

  return query.toString()
}
