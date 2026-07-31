import type { GuestsObject } from '@/type'
import { getMessages } from '@/utils/getT'

/** Konaklama, tur, otel, araç vb. — 2 yetişkin */
export const DEFAULT_GUESTS_STAY: GuestsObject = {
  guestAdults: 2,
  guestChildren: 0,
  guestInfants: 0,
}

/** Aktivite ve etkinlik — 1 yetişkin */
export const DEFAULT_GUESTS_EXPERIENCE: GuestsObject = {
  guestAdults: 1,
  guestChildren: 0,
  guestInfants: 0,
}

export function mergeGuestDefaults(
  partial?: GuestsObject,
  base: GuestsObject = DEFAULT_GUESTS_STAY,
): GuestsObject {
  const guestChildren = partial?.guestChildren ?? base.guestChildren ?? 0
  const childAges =
    partial?.childAges ??
    base.childAges ??
    (guestChildren > 0 ? undefined : [])
  return {
    guestAdults: partial?.guestAdults ?? base.guestAdults ?? DEFAULT_GUESTS_STAY.guestAdults,
    guestChildren,
    guestInfants: partial?.guestInfants ?? base.guestInfants ?? 0,
    ...(childAges != null ? { childAges } : {}),
  }
}

export function totalGuestCount(g: GuestsObject): number {
  return (g.guestAdults ?? 0) + (g.guestChildren ?? 0) + (g.guestInfants ?? 0)
}

function nonNegativeGuestCount(raw: FormDataEntryValue | string | null | undefined): number {
  const n = Number.parseInt(typeof raw === 'string' ? raw : '', 10)
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** Arama URL'sindeki toplam yolcu (yetişkin + çocuk + bebek). */
export function guestSearchTotalFromRecord(
  values: Record<string, FormDataEntryValue | string | undefined>,
): number {
  return (
    nonNegativeGuestCount(values.guestAdults) +
    nonNegativeGuestCount(values.guestChildren) +
    nonNegativeGuestCount(values.guestInfants)
  )
}

/** Arama URL'sindeki kapasite filtresi — bebekler oda kapasitesine genelde dahil edilmez. */
export function guestCapacityFromRecord(
  values: Record<string, FormDataEntryValue | string | undefined>,
): number {
  const adults = nonNegativeGuestCount(values.guestAdults)
  const children = nonNegativeGuestCount(values.guestChildren)
  const total = adults + children
  if (total > 0) return total
  const guestsOnly = nonNegativeGuestCount(values.guests)
  if (guestsOnly > 0) return guestsOnly
  return guestSearchTotalFromRecord(values)
}

/** URL / prefill → misafir nesnesi (yetişkin/çocuk/bebek + yaşlar). */
export function guestsObjectFromSearchRecord(
  values: Record<string, FormDataEntryValue | string | null | undefined>,
  base: GuestsObject = DEFAULT_GUESTS_STAY,
): GuestsObject {
  const adults = nonNegativeGuestCount(values.guestAdults)
  const children = nonNegativeGuestCount(values.guestChildren)
  const infants = nonNegativeGuestCount(values.guestInfants)
  const guestsOnly = nonNegativeGuestCount(values.guests)
  const agesRaw = typeof values.childAges === 'string' ? values.childAges.trim() : ''
  const childAges = agesRaw
    ? agesRaw
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => Number.isFinite(n) && n >= 0 && n <= 17)
    : undefined

  if (adults > 0 || children > 0 || infants > 0) {
    return mergeGuestDefaults(
      {
        guestAdults: adults > 0 ? adults : base.guestAdults,
        guestChildren: children,
        guestInfants: infants,
        ...(childAges && childAges.length > 0 ? { childAges } : {}),
      },
      base,
    )
  }
  if (guestsOnly > 0) {
    return mergeGuestDefaults({ guestAdults: guestsOnly, guestChildren: 0, guestInfants: 0 }, base)
  }
  return mergeGuestDefaults(undefined, base)
}

/** Form / URL → misafir query parametreleri (kapasite + yaşlar). */
export function appendStayGuestSearchParams(
  searchParams: URLSearchParams,
  values: Record<string, FormDataEntryValue | string | undefined>,
): void {
  const adults = nonNegativeGuestCount(values.guestAdults)
  const children = nonNegativeGuestCount(values.guestChildren)
  const infants = nonNegativeGuestCount(values.guestInfants)
  const capacity = guestCapacityFromRecord(values)
  const total = guestSearchTotalFromRecord(values)
  if (capacity > 0) searchParams.set('guests', String(capacity))
  else if (total > 0) searchParams.set('guests', String(total))
  if (adults > 0) searchParams.set('guestAdults', String(adults))
  if (children > 0) searchParams.set('guestChildren', String(children))
  if (infants > 0) searchParams.set('guestInfants', String(infants))
  const agesRaw = typeof values.childAges === 'string' ? values.childAges.trim() : ''
  if (agesRaw && children > 0) searchParams.set('childAges', agesRaw)
}

/** "2 Yetişkin" veya "2 Yetişkin, 1 Çocuk" — sıfır olan tipler gösterilmez. */
export function formatStayGuestSummary(locale: string | undefined | null, g: GuestsObject): string {
  const H = getMessages(locale).HeroSearchForm
  const parts: string[] = []
  const adults = g.guestAdults ?? 0
  const children = g.guestChildren ?? 0
  const infants = g.guestInfants ?? 0
  if (adults > 0) parts.push(`${adults} ${H.Adults}`)
  if (children > 0) parts.push(`${children} ${H.Children}`)
  if (infants > 0) parts.push(`${infants} ${H.Infants}`)
  if (parts.length === 0) return `0 ${H.Adults}`
  return parts.join(', ')
}
