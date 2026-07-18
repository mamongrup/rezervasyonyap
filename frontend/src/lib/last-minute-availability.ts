import { listPublicActiveCampaigns } from '@/lib/travel-api'
import type { SearchQuery } from '@/lib/listings-fetcher'
import { cache } from 'react'

/** Son dakika vitrin sekmesi — otel, tatil evi, yat */
export const LAST_MINUTE_CATEGORY_SLUGS = new Set(['oteller', 'tatil-evleri', 'yat-kiralama'])

export function categorySupportsLastMinuteTab(categorySlug: string): boolean {
  return LAST_MINUTE_CATEGORY_SLUGS.has(categorySlug)
}

export const DEFAULT_LAST_MINUTE_MAX_HOURS = 72

export function parseLastMinuteMaxHours(rulesJson: string | null | undefined): number {
  try {
    const o = JSON.parse(rulesJson ?? '{}') as Record<string, unknown>
    const n =
      typeof o.max_hours_before_checkin === 'number'
        ? o.max_hours_before_checkin
        : DEFAULT_LAST_MINUTE_MAX_HOURS
    return Math.min(336, Math.max(24, Math.round(n)))
  } catch {
    return DEFAULT_LAST_MINUTE_MAX_HOURS
  }
}

export interface LastMinuteDateWindow {
  checkin: string
  checkout: string
  flexDays: number
  maxHours: number
}

function formatYmdIstanbul(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' })
}

function addCalendarDays(base: Date, days: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d
}

/** Aktif son dakika kampanyası + yakın giriş tarihi penceresi.
 * React.cache: anasayfada 3× featured_places aynı isteği tek fetch'e indirger. */
export const resolveLastMinuteDateWindow = cache(async (): Promise<LastMinuteDateWindow> => {
  const { campaigns } = await listPublicActiveCampaigns({ type: 'last_minute', limit: 1 })
  const maxHours = parseLastMinuteMaxHours(campaigns[0]?.rules_json)
  const flexDays = Math.min(7, Math.max(1, Math.ceil(maxHours / 24)))

  const now = new Date()
  const checkinDate = addCalendarDays(now, 1)
  const checkoutDate = addCalendarDays(checkinDate, 1)

  return {
    checkin: formatYmdIstanbul(checkinDate),
    checkout: formatYmdIstanbul(checkoutDate),
    flexDays,
    maxHours,
  }
})

/** `last_minute=1` URL / vitrin sorgusuna müsaitlik tarihlerini ekler */
export async function applyLastMinuteSearchQuery(
  categorySlug: string,
  query: SearchQuery,
): Promise<SearchQuery> {
  if (query.last_minute !== '1' || !categorySupportsLastMinuteTab(categorySlug)) {
    return query
  }
  const window = await resolveLastMinuteDateWindow()
  return {
    ...query,
    checkin: query.checkin?.trim() || window.checkin,
    checkout: query.checkout?.trim() || window.checkout,
    flex_days: query.flex_days?.trim() || String(window.flexDays),
  }
}

export function buildLastMinuteViewAllHref(
  categorySlug: string,
  window: LastMinuteDateWindow,
): string {
  const u = new URLSearchParams()
  u.set('last_minute', '1')
  u.set('checkin', window.checkin)
  u.set('checkout', window.checkout)
  if (window.flexDays > 0) u.set('flex_days', String(window.flexDays))
  return `/${categorySlug}/all?${u.toString()}`
}
