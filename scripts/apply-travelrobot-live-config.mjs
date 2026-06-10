#!/usr/bin/env node
/**
 * Canlı Booking + Statik Content API bilgilerini site_settings.listing_api_providers.travelrobot'a yazar.
 *
 * Şifreleri repoya koymayın — sunucuda /etc/rezervasyonyap/backend.env veya ortam değişkenleri:
 *   TRAVELROBOT_CHANNEL_CODE, TRAVELROBOT_CHANNEL_PASSWORD
 *   TRAVELROBOT_STATIC_USER, TRAVELROBOT_STATIC_PASSWORD
 *
 * Kullanım:
 *   set -a && source /etc/rezervasyonyap/backend.env && set +a
 *   node scripts/apply-travelrobot-live-config.mjs
 *   node scripts/apply-travelrobot-live-config.mjs --dry-run
 */
import { upsertTravelrobotInListingApiProviders } from './lib/listing-api-providers-db.mjs'

function env(key, fallback = '') {
  return String(process.env[key] ?? fallback).trim()
}

function envBool(key, fallback = true) {
  const raw = env(key, fallback ? '1' : '0')
  return raw !== '0' && raw.toLowerCase() !== 'false'
}

const dryRun = process.argv.includes('--dry-run')

const patch = {
  enabled: envBool('TRAVELROBOT_ENABLED', true),
  base_url: env('TRAVELROBOT_BASE_URL', 'https://api.bookingagora.com/v0'),
  channel_code: env('TRAVELROBOT_CHANNEL_CODE'),
  channel_password: env('TRAVELROBOT_CHANNEL_PASSWORD'),
  static_base_url: env('TRAVELROBOT_STATIC_BASE_URL', 'https://static.travelchain.online/api'),
  static_user: env('TRAVELROBOT_STATIC_USER'),
  static_password: env('TRAVELROBOT_STATIC_PASSWORD'),
  listing_status: env('TRAVELROBOT_LISTING_STATUS', 'published'),
  import_tours: envBool('TRAVELROBOT_IMPORT_TOURS', true),
  import_hotels: envBool('TRAVELROBOT_IMPORT_HOTELS', true),
  import_flights: envBool('TRAVELROBOT_IMPORT_FLIGHTS', false),
  import_car_rental: envBool('TRAVELROBOT_IMPORT_CAR_RENTAL', false),
  import_hotel_rooms: envBool('TRAVELROBOT_IMPORT_HOTEL_ROOMS', true),
}

const missing = []
if (!patch.channel_code) missing.push('TRAVELROBOT_CHANNEL_CODE')
if (!patch.channel_password) missing.push('TRAVELROBOT_CHANNEL_PASSWORD')
if (!patch.static_user) missing.push('TRAVELROBOT_STATIC_USER')
if (!patch.static_password) missing.push('TRAVELROBOT_STATIC_PASSWORD')

if (missing.length) {
  console.error(`Eksik ortam değişkenleri: ${missing.join(', ')}`)
  process.exit(1)
}

const preview = {
  ...patch,
  channel_password: patch.channel_password ? '***' : '',
  static_password: patch.static_password ? '***' : '',
}

console.log(dryRun ? '[dry-run] Kaydedilecek travelrobot ayarı:' : 'Kaydediliyor:')
console.log(JSON.stringify(preview, null, 2))

if (dryRun) {
  console.log('Dry-run — DB güncellenmedi.')
  process.exit(0)
}

const saved = await upsertTravelrobotInListingApiProviders(patch)
console.log('OK — listing_api_providers.travelrobot güncellendi.')
console.log(
  JSON.stringify(
    {
      ...saved,
      channel_password: saved.channel_password ? '***' : '',
      static_password: saved.static_password ? '***' : '',
    },
    null,
    2,
  ),
)
