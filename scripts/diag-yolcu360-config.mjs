#!/usr/bin/env node
import { loadYolcu360ConfigFromDb } from './lib/listing-api-providers-db.mjs'

function mask(s) {
  const t = String(s || '')
  if (!t) return '(boş)'
  if (t.length <= 4) return '***'
  return `${t.slice(0, 2)}…${t.slice(-2)} (${t.length} karakter)`
}

const cfg = await loadYolcu360ConfigFromDb()
console.log(
  JSON.stringify(
    {
      enabled: cfg.enabled,
      baseUrl: cfg.baseUrl,
      apiKey: mask(cfg.apiKey),
      apiSecret: mask(cfg.apiSecret),
      listingStatus: cfg.listingStatus,
      credentialsReady: Boolean(cfg.apiKey && cfg.apiSecret),
    },
    null,
    2,
  ),
)

if (!cfg.apiKey || !cfg.apiSecret) {
  console.log('\n→ YOLCU360_API_KEY + YOLCU360_API_SECRET gerekli (pro.yolcu360.com → API Keys)')
  console.log('  node scripts/apply-yolcu360-live-config.mjs')
}
