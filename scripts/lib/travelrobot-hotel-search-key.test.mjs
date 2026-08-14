import assert from 'node:assert/strict'
import { test } from 'node:test'
import { pickHotelSearchKey, pickHotelSearchKeys } from './travelrobot-hotel-search-key.mjs'

test('oda fiyati icin satir ve kok SearchKey adaylari sirayla korunur', () => {
  const payload = { Result: { SearchKey: 'root-key' } }
  const row = { SearchKey: 'row-key', Data: { Key: 'legacy-key' } }
  assert.deepEqual(pickHotelSearchKeys(payload, row), ['row-key', 'root-key', 'legacy-key'])
  assert.equal(pickHotelSearchKey(payload, row), 'row-key')
})

test('bos ve ayni anahtar adaylari elenir', () => {
  const payload = { Result: { SearchKey: ' same ' } }
  const row = { SearchKey: 'same', Key: '' }
  assert.deepEqual(pickHotelSearchKeys(payload, row), ['same'])
})
