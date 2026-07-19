import { describe, expect, it } from 'vitest'
import {
  buildSeasonalPricingTableRows,
  mergeSamePriceSeasonRules,
} from './listing-price-rules-public'

const msg = {
  defaultPeriod: 'Dönem',
  rangeSep: '-',
  rangeFromOpen: 'itibaren',
  rangeUntil: 'kadar',
}

function rule(id: string, from: string, to: string, nightly: number) {
  return {
    id,
    valid_from: from,
    valid_to: to,
    rule_json: JSON.stringify({ base_nightly: String(nightly) }),
  }
}

describe('mergeSamePriceSeasonRules', () => {
  it('merges same-price bands across reservation gaps', () => {
    const merged = mergeSamePriceSeasonRules([
      rule('1', '2026-08-06', '2026-08-09', 67045),
      rule('2', '2026-08-29', '2026-08-31', 67045),
      rule('3', '2026-09-01', '2026-09-15', 54855),
    ])
    expect(merged).toHaveLength(2)
    expect(merged[0].valid_from).toBe('2026-08-06')
    expect(merged[0].valid_to).toBe('2026-08-31')
    expect(merged[1].valid_from).toBe('2026-09-01')
  })

  it('does not merge when a different price sits between', () => {
    const merged = mergeSamePriceSeasonRules([
      rule('1', '2026-07-01', '2026-07-31', 20000),
      rule('2', '2026-08-01', '2026-08-15', 25000),
      rule('3', '2026-09-01', '2026-09-30', 20000),
    ])
    expect(merged).toHaveLength(3)
  })
})

describe('buildSeasonalPricingTableRows', () => {
  it('shows one row per merged price season', () => {
    const rows = buildSeasonalPricingTableRows(
      [
        rule('1', '2026-08-06', '2026-08-09', 67045),
        rule('2', '2026-08-29', '2026-08-31', 67045),
      ],
      'tr',
      'TRY',
      msg,
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].nightlyAmount).toBe(67045)
    expect(rows[0].periodLabel).toContain('6')
    expect(rows[0].periodLabel).toContain('31')
  })
})
