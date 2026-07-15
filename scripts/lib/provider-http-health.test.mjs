import test from 'node:test'
import assert from 'node:assert/strict'
import { detailHttpStatus, nextProviderHttpHealth } from './provider-http-health.mjs'

test('detail HTTP durumunu hata mesajindan okur', () => {
  assert.equal(detailHttpStatus(new Error('Detay HTTP 400 https://example.test/hotel')), 400)
  assert.equal(detailHttpStatus(new Error('fetch failed')), 0)
})

test('uc ardisik 400 yanitinda saglayiciyi beklemeye alir', () => {
  assert.equal(nextProviderHttpHealth(0, new Error('Detay HTTP 400 x')).shouldPause, false)
  assert.equal(nextProviderHttpHealth(1, new Error('Detay HTTP 400 x')).shouldPause, false)
  assert.deepEqual(nextProviderHttpHealth(2, new Error('Detay HTTP 400 x')), {
    status: 400,
    consecutive400: 3,
    shouldPause: true,
  })
})

test('403, 429 ve 5xx yanitlarini hemen saglayici hatasi sayar', () => {
  for (const status of [403, 408, 429, 500, 503]) {
    assert.equal(nextProviderHttpHealth(0, new Error(`Detay HTTP ${status} x`)).shouldPause, true)
  }
})

test('farkli HTTP hatasi ardisik 400 sayacini sifirlar', () => {
  assert.equal(nextProviderHttpHealth(2, new Error('Detay HTTP 404 x')).consecutive400, 0)
})
