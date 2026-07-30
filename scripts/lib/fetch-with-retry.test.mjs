import test from 'node:test'
import assert from 'node:assert/strict'
import {
  formatFetchNetworkError,
  isTransientNetworkError,
} from './fetch-with-retry.mjs'

test('geçici ağ hatalarını tanır', () => {
  assert.equal(isTransientNetworkError(new Error('fetch failed')), true)
  assert.equal(
    isTransientNetworkError(Object.assign(new Error('x'), { cause: { code: 'ECONNRESET' } })),
    true,
  )
  assert.equal(isTransientNetworkError(new Error('HTTP 401 unauthorized')), false)
})

test('ağ hatası mesajına cause kodunu ekler', () => {
  const err = new Error('fetch failed')
  err.cause = { code: 'ENOTFOUND', hostname: 'static.travelchain.online' }
  const msg = formatFetchNetworkError('/token/authenticate', err)
  assert.match(msg, /ağ bağlantısı başarısız/)
  assert.match(msg, /ENOTFOUND/)
  assert.match(msg, /static\.travelchain\.online/)
})
