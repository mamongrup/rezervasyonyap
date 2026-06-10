#!/usr/bin/env node
import { loadTurnaConfigFromDb } from './lib/listing-api-providers-db.mjs'

function mask(s) {
  const t = String(s || '')
  if (!t) return '(boş)'
  if (t.length <= 4) return '***'
  return `${t.slice(0, 2)}…${t.slice(-2)} (${t.length} karakter)`
}

const cfg = await loadTurnaConfigFromDb()
console.log(
  JSON.stringify(
    {
      enabled: cfg.enabled,
      baseUrl: cfg.baseUrl,
      apiKey: mask(cfg.apiKey),
      countryCode: cfg.countryCode,
      currencyCode: cfg.currencyCode,
      languageCode: cfg.languageCode,
      listingStatus: cfg.listingStatus,
      credentialsReady: Boolean(cfg.apiKey),
      apitestWarning: cfg.baseUrl.includes('apitest'),
    },
    null,
    2,
  ),
)

if (!cfg.apiKey) {
  console.log('\n→ TURNA_API_KEY gerekli (panel veya /etc/rezervasyonyap/turna.env)')
  console.log('  node scripts/apply-turna-live-config.mjs')
}

if (cfg.baseUrl.includes('apitest')) {
  console.log('\n→ Canlı anahtar ile apitest.turna.com genelde 403 verir; TURNA_BASE_URL=https://api.turna.com')
}
