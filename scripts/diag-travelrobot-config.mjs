#!/usr/bin/env node
/**
 * DB + env'den yüklenen Travelrobot ayarlarını maskeli gösterir (sunucu teşhisi).
 */
import { loadTravelrobotConfigFromDb } from './lib/listing-api-providers-db.mjs'
import { staticCredentialsReady } from './lib/travelrobot-static-api.mjs'

function mask(s) {
  const t = String(s || '')
  if (!t) return '(boş)'
  if (t.length <= 4) return '***'
  return `${t.slice(0, 2)}…${t.slice(-2)} (${t.length} karakter)`
}

const cfg = await loadTravelrobotConfigFromDb()

console.log('Travelrobot config (DB + env birleşimi):')
console.log(
  JSON.stringify(
    {
      enabled: cfg.enabled,
      baseUrl: cfg.baseUrl,
      channelCode: cfg.channelCode || '(boş)',
      channelPassword: mask(cfg.channelPassword),
      staticBaseUrl: cfg.staticBaseUrl,
      staticUser: cfg.staticUser || '(boş)',
      staticPassword: mask(cfg.staticPassword),
      staticCredentialsReady: staticCredentialsReady(cfg),
      importHotels: cfg.importHotels,
      importTours: cfg.importTours,
    },
    null,
    2,
  ),
)

if (!staticCredentialsReady(cfg)) {
  console.log('\n→ Statik API için TRAVELROBOT_STATIC_USER ve TRAVELROBOT_STATIC_PASSWORD gerekli.')
  console.log('  Booking kanalı (agora_MM4N) statik kullanıcı (BAgora_mm4N) ile aynı değildir.')
  console.log('  node scripts/apply-travelrobot-live-config.mjs')
} else if (cfg.staticUser === cfg.channelCode) {
  console.log('\n→ Uyarı: static_user ile channel_code aynı görünüyor — statik API ayrı kullanıcı bekler (BAgora_mm4N).')
}

console.log('\nStatik API test: node scripts/ping-travelrobot-live.mjs --static-only')
console.log('Kimlik doğruysa ama 401 whitelist gelirse KPlus\'a sunucu IP\'sini bildirin.')
