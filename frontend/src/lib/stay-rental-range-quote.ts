import { diffStayNights } from '@/hooks/use-stay-listing-quote'
import {
  parseListingPriceRuleAmount,
  parseListingPriceRuleJson,
} from '@/lib/listing-price-rules-public'
import type { ListingAvailabilityDay, ListingPriceRuleRow } from '@/lib/travel-api'
import { formatLocalYmd } from '@/utils/format-local-ymd'

export function parseStayNightlyPrice(raw: string | null | undefined): number | null {
  if (!raw?.trim()) return null
  return parseListingPriceRuleAmount(raw.trim())
}

function dateInRuleRange(ymd: string, validFrom: string | null, validTo: string | null): boolean {
  const vf = validFrom?.trim() ?? ''
  const vt = validTo?.trim() ?? ''
  if (vf && ymd < vf) return false
  if (vt && ymd > vt) return false
  return true
}

function isWeekendNight(date: Date): boolean {
  const dow = date.getDay()
  return dow === 0 || dow === 6
}

/** Seçili güne uyan en güncel (`valid_from`) dönem kuralından gecelik. */
export function resolveNightlyFromPriceRulesForDate(
  rules: readonly ListingPriceRuleRow[],
  date: Date,
): number | null {
  const ymd = formatLocalYmd(date)
  let best: { nightly: number; validFrom: string } | null = null

  for (const rule of rules) {
    if (!dateInRuleRange(ymd, rule.valid_from, rule.valid_to)) continue
    const parsed = parseListingPriceRuleJson(rule.rule_json)
    const base =
      parseListingPriceRuleAmount(parsed.base) ??
      parseListingPriceRuleAmount(parsed.roomOnly) ??
      parseListingPriceRuleAmount(parsed.mealsIncluded)
    const weekend = parseListingPriceRuleAmount(parsed.weekend)
    const nightly =
      isWeekendNight(date) && weekend != null && weekend > 0
        ? weekend
        : base
    if (nightly == null || !Number.isFinite(nightly) || nightly <= 0) continue

    const vf = rule.valid_from?.trim() ?? ''
    if (!best || vf >= best.validFrom) {
      best = { nightly, validFrom: vf }
    }
  }

  return best?.nightly ?? null
}

export type StayRentalLodgingQuote = {
  nights: number
  total: number
  available: boolean
  uniformNightly: number | null
  minNightly: number | null
  maxNightly: number | null
}

/** Tatil evi / yat — seçili aralıkta gecelik toplam (çıkış günü hariç). */
export function computeStayRentalLodgingQuote(input: {
  days: readonly ListingAvailabilityDay[]
  priceRules: readonly ListingPriceRuleRow[]
  rangeStart: Date
  rangeEnd: Date
  fallbackNightly: number
}): StayRentalLodgingQuote {
  const nights = diffStayNights(input.rangeStart, input.rangeEnd)
  if (nights <= 0) {
    return {
      nights: 0,
      total: 0,
      available: false,
      uniformNightly: null,
      minNightly: null,
      maxNightly: null,
    }
  }

  const byDay = new Map(input.days.map((d) => [d.day.trim(), d]))
  let total = 0
  let available = true
  let minNightly: number | null = null
  let maxNightly: number | null = null
  const nightlySamples: number[] = []

  const cursor = new Date(input.rangeStart)
  cursor.setHours(0, 0, 0, 0)
  const end = new Date(input.rangeEnd)
  end.setHours(0, 0, 0, 0)

  while (cursor < end) {
    const ymd = formatLocalYmd(cursor)
    const hit = byDay.get(ymd)
    if (hit && hit.is_available === false) available = false

    const nightly =
      parseStayNightlyPrice(hit?.price_override) ??
      resolveNightlyFromPriceRulesForDate(input.priceRules, cursor) ??
      (input.fallbackNightly > 0 ? input.fallbackNightly : 0)

    if (nightly > 0) {
      total += nightly
      nightlySamples.push(nightly)
      minNightly = minNightly == null ? nightly : Math.min(minNightly, nightly)
      maxNightly = maxNightly == null ? nightly : Math.max(maxNightly, nightly)
    }

    cursor.setDate(cursor.getDate() + 1)
  }

  const uniformNightly =
    nightlySamples.length > 0 && nightlySamples.every((n) => n === nightlySamples[0])
      ? nightlySamples[0]
      : null

  return { nights, total, available, uniformNightly, minNightly, maxNightly }
}
