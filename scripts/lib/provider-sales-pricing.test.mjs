import assert from 'node:assert/strict'
import { test } from 'node:test'
import { salePrice, priceWtatilEnrichment, providerMarkupPercent } from './provider-sales-pricing.mjs'

test('approved 15 percent is added to supplier net with currency rounding', () => {
  assert.equal(salePrice(1000, 15), 1150)
  assert.equal(salePrice('123.45', 15), 141.97)
  assert.equal(salePrice('123,45', 15), 141.97)
  assert.equal(salePrice(null, 15), null)
  assert.equal(salePrice(0, 15), null)
  assert.throws(() => salePrice(1000, NaN))
})

test('period and card amounts agree while quota, references and currencies remain intact', () => {
  const net = {
    periods: [{ id: 10, quota: 4, startDate: '2026-11-01', double: 1000, isStopSale: true }],
    periodPrices: [{ periodId: 10, double: '1000', single: 1200, currency: 'EUR', child_1: 0 }],
    cheapestPrice: { value: 1000, currency: 'EUR' },
  }
  const priced = priceWtatilEnrichment(net, 15)
  assert.equal(priced.periods[0].double, 1150)
  assert.equal(priced.periodPrices[0].double, '1150.00')
  assert.equal(priced.cheapestPrice.value, 1150)
  assert.equal(priced.periodPrices[0].single, 1380)
  assert.equal(priced.periodPrices[0].child_1, 0)
  assert.equal(priced.periods[0].quota, 4)
  assert.equal(priced.periods[0].isStopSale, true)
  assert.equal(priced.periods[0].id, 10)
  assert.equal(priced.cheapestPrice.currency, 'EUR')
  assert.equal(net.periodPrices[0].double, '1000')
})

test('repeated enrichment and changed rates always recalculate from preserved supplier net', () => {
  const first = priceWtatilEnrichment({ cheapestPrice: 1000 }, 15)
  assert.equal(priceWtatilEnrichment(first, 15).cheapestPrice, 1150)
  assert.equal(priceWtatilEnrichment(JSON.parse(JSON.stringify(first)), 20).cheapestPrice, 1200)
  assert.equal(priceWtatilEnrichment({ periods: [] }, 15).cheapestPrice, undefined)
})

test('missing configuration fails closed instead of silently publishing unmarked prices', async () => {
  await assert.rejects(providerMarkupPercent({ query: async () => ({ rows: [] }) }, 'wtatil'), /not_configured/)
  assert.equal(await providerMarkupPercent({ query: async () => ({ rows: [{ value_json: { wtatil: { sales_markup_percent: 15 } } }] }) }, 'wtatil'), 15)
})
