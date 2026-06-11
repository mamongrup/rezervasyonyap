#!/usr/bin/env node
/**
 * KPlus sandbox Air SystemPNR canlılık kontrolü (GetBooking).
 * Kullanım: node scripts/verify-kplus-air-pnrs.mjs --from-db
 *           node scripts/verify-kplus-air-pnrs.mjs --base-url ... --channel-code ... --channel-password ...
 */
import { createTravelrobotToken, getBooking, loadTravelrobotConfig } from './lib/travelrobot-api.mjs'

const args = process.argv.slice(2)
const FROM_DB = args.includes('--from-db')

function getArg(name) {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : null
}

/** v14 tam koşu — 2026-06-10T13-43-27 (travelrobot-test-log-2026-06-10T13-43-27.json) */
const V14_PNRS = [
  ['Air-S1', '64QM06BREI'],
  ['Air-S2', '6V1H06Y57C'],
  ['Air-S3', '6LGW064BI3'],
  ['Air-S4', '636806VUNL'],
  ['Air-S5', '64HC06DW62'],
  ['Air-S6', '6NPJ063PIV'],
  ['Air-S7', '6JUJ06OPR6'],
  ['Air-S9', '61KT06GXVP'],
  ['Air-S10', '6GN1066SEJ'],
  ['Air-S11', '6IYM06N52K'],
]

async function loadCfg() {
  if (FROM_DB) return loadTravelrobotConfig()
  const baseUrl = getArg('--base-url') ?? process.env.TRAVELROBOT_BASE_URL ?? ''
  const channelCode = getArg('--channel-code') ?? process.env.TRAVELROBOT_CHANNEL_CODE ?? ''
  const channelPassword = getArg('--channel-password') ?? process.env.TRAVELROBOT_CHANNEL_PASSWORD ?? ''
  if (!baseUrl || !channelCode || !channelPassword) {
    throw new Error('--from-db veya --base-url + channel kimlik bilgileri gerekli')
  }
  return { baseUrl: baseUrl.replace(/\/$/, ''), channelCode, channelPassword }
}

async function main() {
  const cfg = await loadCfg()
  const token = await createTravelrobotToken(cfg)
  const tokenCode = token?.Result?.TokenCode ?? token?.TokenCode
  if (!tokenCode) throw new Error('Token alınamadı')

  console.log(`KPlus Air PNR doğrulama — ${cfg.baseUrl}\n`)

  let ok = 0
  let fail = 0
  for (const [scenario, systemPnr] of V14_PNRS) {
    try {
      const res = await getBooking(cfg, tokenCode, { systemPnr, lastName: 'TRAVELER' })
      const found = res?.Result?.Booking?.SystemPnr ?? res?.Result?.SystemPnr ?? null
      if (!res?.HasError && found) {
        console.log(`✅ ${scenario}  ${systemPnr}  → bulundu`)
        ok++
      } else {
        console.log(`❌ ${scenario}  ${systemPnr}  → ${res?.ErrorMessage ?? 'kayıt yok'}`)
        fail++
      }
    } catch (e) {
      console.log(`❌ ${scenario}  ${systemPnr}  → ${e.message}`)
      fail++
    }
  }

  console.log(`\nÖzet: ${ok} geçerli · ${fail} geçersiz / bulunamadı`)
  process.exit(fail > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error('[hata]', e.message)
  process.exit(1)
})
