#!/usr/bin/env node
/**
 * Turna API bilgilerini site_settings.listing_api_providers.turna'ya yazar.
 *
 *   set -a && source /etc/rezervasyonyap/backend.env && set +a
 *   # isteğe bağlı: source /etc/rezervasyonyap/turna.env
 *   node scripts/apply-turna-live-config.mjs
 */
import { loadTurnaConfigFromDb, upsertTurnaInListingApiProviders } from './lib/listing-api-providers-db.mjs'

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
const existing = await loadTurnaConfigFromDb()
const envApiKey = env('TURNA_API_KEY')

let baseUrl = normalizeTurnaBaseUrl(env('TURNA_BASE_URL') || existing.baseUrl || 'https://api.turna.com')
if (baseUrl.includes('apitest')) {
  console.warn('[UYARI] TURNA_BASE_URL test ortamı — canlı anahtar için https://api.turna.com önerilir')
  if (envBool('TURNA_FORCE_LIVE', false)) {
    baseUrl = 'https://api.turna.com'
    console.warn('  → TURNA_FORCE_LIVE=1 ile canlı URL kullanılıyor')
  }
}

const patch = {
  enabled: process.env.TURNA_ENABLED != null ? envBool('TURNA_ENABLED', true) : existing.enabled,
  base_url: baseUrl,
  api_key: envApiKey || existing.apiKey,
  country_code: env('TURNA_COUNTRY_CODE') || existing.countryCode || 'TR',
  currency_code: env('TURNA_CURRENCY_CODE') || existing.currencyCode || 'TRY',
  language_code: env('TURNA_LANGUAGE_CODE') || existing.languageCode || 'tr',
  listing_status: env('TURNA_STATUS') || existing.listingStatus || 'published',
}

if (!patch.api_key) {
  console.error('Eksik: TURNA_API_KEY (backend.env / turna.env) veya panel → listing_api_providers.turna')
  process.exit(1)
}

if (!envApiKey && existing.apiKey) {
  console.log('OK — panel/DB kaydı geçerli (TURNA_API_KEY env yok, apply atlandı).')
  console.log('  Env ile senkron: TURNA_API_KEY ekleyip tekrar çalıştırın.')
  process.exit(0)
}

const preview = {
  ...patch,
  api_key: patch.api_key ? `${patch.api_key.slice(0, 4)}…` : '',
}

console.log(dryRun ? '[dry-run]' : 'Kaydediliyor:', JSON.stringify(preview, null, 2))
if (dryRun) process.exit(0)

await upsertTurnaInListingApiProviders(patch)
console.log('OK — listing_api_providers.turna güncellendi.')
