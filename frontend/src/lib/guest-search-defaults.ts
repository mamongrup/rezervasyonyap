import type { GuestsObject } from '@/type'

/** Konaklama, tur, otel, araç vb. — 2 yetişkin */
export const DEFAULT_GUESTS_STAY = {
  guestAdults: 2,
  guestChildren: 0,
  guestInfants: 0,
} as const satisfies GuestsObject

/** Aktivite ve etkinlik — 1 yetişkin */
export const DEFAULT_GUESTS_EXPERIENCE = {
  guestAdults: 1,
  guestChildren: 0,
  guestInfants: 0,
} as const satisfies GuestsObject

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
