import { test } from 'node:test'
import assert from 'node:assert/strict'
import { saleableWtatilEnrichment } from './wtatil-sale-periods.mjs'
import { priceWtatilEnrichment } from './provider-sales-pricing.mjs'
test('past, inactive, unknown-date and unmatched prices cannot become sale prices',()=>{
  const periods=[{id:1,startDate:'2026-10-11',isActive:true},{id:2,startDate:'13.10.2026',isActive:true,askSell:true},{id:3,startDate:'2026-10-14',isActive:false},{id:4,isActive:true}]
  const prices=[{tourPeriodId:1,startDate:'2026-10-11',isActive:true,double:1},{tourPeriodId:2,startDate:'2026-10-13',isActive:true,double:100},{tourPeriodId:3,startDate:'2026-10-14',isActive:true,double:2},{tourPeriodId:99,startDate:'2026-10-14',isActive:true,double:3}]
  const result=saleableWtatilEnrichment({periods,periodPrices:prices,cheapestPrice:1},'2026-10-12')
  assert.deepEqual(result.periods.map(p=>p.id),[2])
  assert.deepEqual(result.periodPrices.map(p=>p.double),[100])
  assert.equal(result.periods[0].askSell,true)
  assert.equal(result.cheapestPrice,null)
})
test('retained net snapshots cannot restore an expired departure',()=>{
  const priced=priceWtatilEnrichment({periods:[{id:2,startDate:'2026-10-13',isActive:true}],periodPrices:[{tourPeriodId:2,startDate:'2026-10-13',isActive:true,double:100}],cheapestPrice:100},15)
  const result=priceWtatilEnrichment(saleableWtatilEnrichment(priced,'2026-10-14'),15)
  assert.deepEqual(result.periodPrices,[])
  assert.equal(result.cheapestPrice,null)
})
