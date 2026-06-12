#!/usr/bin/env node
/**
 * Travelrobot canlı Booking API (CreateToken) ve Statik Content API (authenticate) bağlantı testi.
 *
 *   node scripts/ping-travelrobot-live.mjs
 *   node scripts/ping-travelrobot-live.mjs --live-only
 *   node scripts/ping-travelrobot-live.mjs --static-only
 */
import { loadTravelrobotConfigFromDb } from './lib/listing-api-providers-db.mjs'
import { createTravelrobotToken } from './lib/travelrobot-api.mjs'
import { authenticateStatic, staticCredentialsReady } from './lib/travelrobot-static-api.mjs'

const liveOnly = process.argv.includes('--live-only')
const staticOnly = process.argv.includes('--static-only')

const cfg = await loadTravelrobotConfigFromDb()

function mask(s) {
  const t = String(s || '')
  if (t.length <= 4) return '***'
  return `${t.slice(0, 2)}…${t.slice(-2)}`
}

console.log('Travelrobot config özeti:')
console.log(
  JSON.stringify(
    {
      enabled: cfg.enabled,
      baseUrl: cfg.baseUrl,
      channelCode: cfg.channelCode,
      channelPassword: cfg.channelPassword ? mask(cfg.channelPassword) : '(boş)',
      staticBaseUrl: cfg.staticBaseUrl,
      staticUser: cfg.staticUser || '(boş)',
      staticPassword: cfg.staticPassword ? mask(cfg.staticPassword) : '(boş)',
    },
    null,
    2,
  ),
)

let failed = false

if (!staticOnly) {
  if (!cfg.channelCode || !cfg.channelPassword) {
    console.error('\n[Booking API] channel_code / channel_password eksik')
    failed = true
  } else {
    try {
      const { tokenCode } = await createTravelrobotToken(cfg)
      console.log(`\n[Booking API] OK — token: ${mask(tokenCode)} (${cfg.baseUrl})`)
    } catch (e) {
      console.error(`\n[Booking API] HATA — ${e.message}`)
      failed = true
    }
  }
}

if (!liveOnly) {
  if (!staticCredentialsReady(cfg)) {
    console.error(
      '\n[Static API] static_user / static_password eksik — Booking kanalı (agora_MM4N) ile karıştırmayın; statik kullanıcı BAgora_mm4N ayrı kaydedilmeli',
    )
    failed = true
  } else {
    try {
      const { token, expiration } = await authenticateStatic(cfg)
      console.log(
        `\n[Static API] OK — token: ${mask(token)} (${cfg.staticBaseUrl})${expiration ? ` · expiration: ${expiration}` : ''}`,
      )
    } catch (e) {
      console.error(`\n[Static API] HATA — ${e.message}`)
      failed = true
    }
  }
}

process.exit(failed ? 1 : 0)
