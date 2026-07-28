import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { isAdultSeasonalPriceRow } from './tatilsepeti-hotel-api.mjs'

describe('isAdultSeasonalPriceRow', () => {
  it('accepts dated adult board rows', () => {
    assert.equal(
      isAdultSeasonalPriceRow({
        dateRange: '11 Ekim - 31 Ekim',
        priceType: 'Herşey Dahil Cuma-Pazartesi',
        doublePerPerson: 6400,
      }),
      true,
    )
  })

  it('rejects child age rows with empty dateRange', () => {
    assert.equal(
      isAdultSeasonalPriceRow({
        dateRange: '',
        priceType: '7 - 11, 99 yaş:',
        doublePerPerson: 3200,
      }),
      false,
    )
  })
})
