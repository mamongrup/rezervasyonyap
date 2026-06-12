import { describe, expect, it } from 'vitest'
import {
  computeStayRentalLodgingQuote,
  resolveNightlyFromPriceRulesForDate,
} from './stay-rental-range-quote'
import type { ListingPriceRuleRow } from '@/lib/travel-api'

const rules: ListingPriceRuleRow[] = [
  {
    id: '1',
    valid_from: '2026-05-01',
    valid_to: '2026-05-22',
    rule_json: JSON.stringify({ base_nightly: '7000' }),
  },
  {
    id: '2',
    valid_from: '2026-07-01',
    valid_to: '2026-08-31',
    rule_json: JSON.stringify({ base_nightly: '18000' }),
  },
]

describe('resolveNightlyFromPriceRulesForDate', () => {
  it('picks July rate for mid-July night', () => {
    const d = new Date(2026, 6, 5)
    expect(resolveNightlyFromPriceRulesForDate(rules, d)).toBe(18000)
  })

  it('picks May rate for mid-May night', () => {
    const d = new Date(2026, 4, 10)
    expect(resolveNightlyFromPriceRulesForDate(rules, d)).toBe(7000)
  })
})

describe('computeStayRentalLodgingQuote', () => {
  it('sums nightly rates for selected July range', () => {
    const start = new Date(2026, 6, 2)
    const end = new Date(2026, 6, 9)
    const quote = computeStayRentalLodgingQuote({
      days: [],
      priceRules: rules,
      rangeStart: start,
      rangeEnd: end,
      fallbackNightly: 7000,
    })
    expect(quote.nights).toBe(7)
    expect(quote.total).toBe(18000 * 7)
    expect(quote.uniformNightly).toBe(18000)
  })
})
