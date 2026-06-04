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
  return {
    guestAdults: partial?.guestAdults ?? base.guestAdults ?? DEFAULT_GUESTS_STAY.guestAdults,
    guestChildren: partial?.guestChildren ?? base.guestChildren ?? 0,
    guestInfants: partial?.guestInfants ?? base.guestInfants ?? 0,
  }
}

export function totalGuestCount(g: GuestsObject): number {
  return (g.guestAdults ?? 0) + (g.guestChildren ?? 0) + (g.guestInfants ?? 0)
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
