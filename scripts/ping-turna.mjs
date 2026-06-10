#!/usr/bin/env node
import { loadTurnaConfigFromDb } from './lib/listing-api-providers-db.mjs'
import { pingTurnaLogin } from './lib/turna-api.mjs'

const cfg = await loadTurnaConfigFromDb()
console.log('Turna config:', {
  baseUrl: cfg.baseUrl,
  enabled: cfg.enabled,
  countryCode: cfg.countryCode,
})
if (!cfg.apiKey) {
  console.error('api_key boş — apply-turna-live-config.mjs veya panel')
  process.exit(1)
}
const { json, session } = await pingTurnaLogin({
  enabled: cfg.enabled,
  baseUrl: cfg.baseUrl,
  apiKey: cfg.apiKey,
  countryCode: cfg.countryCode,
  currencyCode: cfg.currencyCode,
  languageCode: cfg.languageCode,
})
console.log('[Turna] OK —', {
  sessionId: session.sessionId || '(header yok)',
  keys: json && typeof json === 'object' ? Object.keys(json).slice(0, 8) : [],
})
