import { describe, expect, it } from 'vitest'

import { convertAmountWithRates, resolveDisplayMoney } from '@/lib/currency-convert'
import type { PublicCurrencyRateRow } from '@/lib/travel-api'

const rates: PublicCurrencyRateRow[] = [
  { base_code: 'USD', quote_code: 'TRY', rate: 48.1157, source: 'TCMB', fetched_at: '2026-08-26' },
  { base_code: 'EUR', quote_code: 'TRY', rate: 56.2, source: 'TCMB', fetched_at: '2026-08-26' },
]

describe('currency conversion', () => {
  it('converts listing prices with the current direct rate', () => {
    expect(convertAmountWithRates(160, ' usd ', ' try ', rates)).toBeCloseTo(7698.512, 3)
  })

  it('supports inverse and cross-currency conversions', () => {
    expect(convertAmountWithRates(4811.57, 'TRY', 'USD', rates)).toBeCloseTo(100, 6)
    expect(convertAmountWithRates(100, 'EUR', 'USD', rates)).toBeCloseTo(116.8018, 4)
  })

  it('never labels an unconverted source amount with the preferred currency', () => {
    expect(resolveDisplayMoney(160, 'USD', 'TRY', [])).toEqual({
      amount: 160,
      currencyCode: 'USD',
      converted: false,
    })
  })

  it('rejects invalid rates and non-finite amounts', () => {
    expect(convertAmountWithRates(100, 'USD', 'TRY', [{ ...rates[0], rate: -1 }])).toBeNull()
    expect(convertAmountWithRates(Number.NaN, 'USD', 'USD', rates)).toBeNull()
  })
})
