#!/usr/bin/env node
/**
 * Turna API bilgilerini site_settings.listing_api_providers.turna'ya yazar.
 *
 *   set -a && source /etc/rezervasyonyap/backend.env && set +a
 *   # isteğe bağlı: source /etc/rezervasyonyap/turna.env
 *   node scripts/apply-turna-live-config.mjs
 */
import { upsertTurnaInListingApiProviders } from './lib/listing-api-providers-db.mjs'

function env(key, fallback = '') {
  return String(process.env[key] ?? fallback).trim()
}

function envBool(key, fallback = true) {
  const raw = env(key, fallback ? '1' : '0')
  return raw !== '0' && raw.toLowerCase() !== 'false'
}

function normalizeTurnaBaseUrl(raw) {
  let u = String(raw || 'https://api.turna.com').trim().replace(/\/+$/, '')
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`
  if (/^http:\/\//i.test(u) && /turna\.com/i.test(u)) u = u.replace(/^http:\/\//i, 'https://')
  return u
}

const dryRun = process.argv.includes('--dry-run')

let baseUrl = normalizeTurnaBaseUrl(env('TURNA_BASE_URL', 'https://api.turna.com'))
if (baseUrl.includes('apitest')) {
  console.warn('[UYARI] TURNA_BASE_URL test ortamı — canlı anahtar için https://api.turna.com önerilir')
  if (envBool('TURNA_FORCE_LIVE', false)) {
    baseUrl = 'https://api.turna.com'
    console.warn('  → TURNA_FORCE_LIVE=1 ile canlı URL kullanılıyor')
  }
}

const patch = {
  enabled: envBool('TURNA_ENABLED', true),
  base_url: baseUrl,
  api_key: env('TURNA_API_KEY'),
  country_code: env('TURNA_COUNTRY_CODE', 'TR'),
  currency_code: env('TURNA_CURRENCY_CODE', 'TRY'),
  language_code: env('TURNA_LANGUAGE_CODE', 'tr'),
  listing_status: env('TURNA_STATUS', 'published'),
}

if (!patch.api_key) {
  console.error('Eksik: TURNA_API_KEY (backend.env veya turna.env)')
  process.exit(1)
}

const preview = {
  ...patch,
  api_key: patch.api_key ? `${patch.api_key.slice(0, 4)}…` : '',
}

console.log(dryRun ? '[dry-run]' : 'Kaydediliyor:', JSON.stringify(preview, null, 2))
if (dryRun) process.exit(0)

await upsertTurnaInListingApiProviders(patch)
console.log('OK — listing_api_providers.turna güncellendi.')
