#!/usr/bin/env node
/**
 * Yolcu360 API bilgilerini site_settings.listing_api_providers.yolcu360'a yazar.
 *
 *   set -a && source /etc/rezervasyonyap/backend.env && set +a
 *   node scripts/apply-yolcu360-live-config.mjs
 */
import { upsertYolcu360InListingApiProviders } from './lib/listing-api-providers-db.mjs'

function env(key, fallback = '') {
  return String(process.env[key] ?? fallback).trim()
}

function envBool(key, fallback = true) {
  const raw = env(key, fallback ? '1' : '0')
  return raw !== '0' && raw.toLowerCase() !== 'false'
}

const dryRun = process.argv.includes('--dry-run')

const patch = {
  enabled: envBool('YOLCU360_ENABLED', true),
  base_url: env('YOLCU360_BASE_URL', 'https://api.pro.yolcu360.com/api/v1'),
  api_key: env('YOLCU360_API_KEY'),
  api_secret: env('YOLCU360_API_SECRET'),
  listing_status: env('YOLCU360_STATUS', 'published'),
}

const missing = []
if (!patch.api_key) missing.push('YOLCU360_API_KEY')
if (!patch.api_secret) missing.push('YOLCU360_API_SECRET')
if (missing.length) {
  console.error(`Eksik: ${missing.join(', ')}`)
  process.exit(1)
}

const preview = {
  ...patch,
  api_key: patch.api_key ? `${patch.api_key.slice(0, 4)}…` : '',
  api_secret: patch.api_secret ? '***' : '',
}

console.log(dryRun ? '[dry-run]' : 'Kaydediliyor:', JSON.stringify(preview, null, 2))
if (dryRun) process.exit(0)

await upsertYolcu360InListingApiProviders(patch)
console.log('OK — listing_api_providers.yolcu360 güncellendi.')
