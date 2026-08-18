import { describe, expect, it } from 'vitest'
import {
  computeStayRentalLodgingQuote,
  resolveDiscountNightlyFromPriceRulesForDate,
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

  it('applies a lower campaign price only inside its date range', () => {
    const campaignRules: ListingPriceRuleRow[] = [{
      id: 'campaign',
      valid_from: '2026-07-01',
      valid_to: '2026-08-31',
      rule_json: JSON.stringify({
        base_nightly: '18000',
        discount_nightly: '14500',
        discount_from: '2026-07-10',
        discount_to: '2026-07-20',
      }),
    }]

    expect(resolveNightlyFromPriceRulesForDate(campaignRules, new Date(2026, 6, 15))).toBe(14500)
    expect(resolveNightlyFromPriceRulesForDate(campaignRules, new Date(2026, 6, 25))).toBe(18000)
    expect(resolveDiscountNightlyFromPriceRulesForDate(campaignRules, new Date(2026, 6, 15))).toBe(14500)
    expect(resolveDiscountNightlyFromPriceRulesForDate(campaignRules, new Date(2026, 6, 25))).toBeNull()
  })

  it('resolves a campaign stored separately from the normal season', () => {
    const separateCampaignRules: ListingPriceRuleRow[] = [
      ...rules,
      {
        id: 'campaign',
        valid_from: '2026-07-10',
        valid_to: '2026-07-20',
        rule_json: JSON.stringify({
          discount_nightly: '14500',
          discount_from: '2026-07-10',
          discount_to: '2026-07-20',
        }),
      },
    ]

    expect(resolveDiscountNightlyFromPriceRulesForDate(separateCampaignRules, new Date(2026, 6, 15))).toBe(14500)
    expect(resolveDiscountNightlyFromPriceRulesForDate(separateCampaignRules, new Date(2026, 6, 25))).toBeNull()
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

  it('keeps an active campaign ahead of a normal calendar price override', () => {
    const quote = computeStayRentalLodgingQuote({
      days: [
        { day: '2026-07-15', status: 'available', price_override: '18000' },
      ],
      priceRules: [{
        id: 'campaign',
        valid_from: '2026-07-01',
        valid_to: '2026-08-31',
        rule_json: JSON.stringify({
          base_nightly: '18000',
          discount_nightly: '14500',
          discount_from: '2026-07-10',
          discount_to: '2026-07-20',
        }),
      }],
      rangeStart: new Date(2026, 6, 15),
      rangeEnd: new Date(2026, 6, 16),
      fallbackNightly: 18000,
    })
    expect(quote.total).toBe(14500)
    expect(quote.uniformNightly).toBe(14500)
  })
})
