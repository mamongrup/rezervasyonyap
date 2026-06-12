#!/usr/bin/env node
/**
 * KPlus sandbox Air SystemPNR canlılık kontrolü (GetBooking).
 *
 * Sertifikasyon PNR'ları sandbox'ta oluşur — --from-db canlı bookingagora ile ÇALIŞMAZ.
 *
 *   node scripts/verify-kplus-air-pnrs.mjs --sandbox
 *   node scripts/verify-kplus-air-pnrs.mjs --sandbox --channel-code Test_... --channel-password ...
 */
import { createTravelrobotToken, getBooking } from './lib/travelrobot-api.mjs'
import { buildSandboxConfig, isSandboxBaseUrl } from './lib/travelrobot-sandbox-config.mjs'

const args = process.argv.slice(2)
const USE_SANDBOX = args.includes('--sandbox')

function getArg(name) {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
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

function loadCfg() {
  if (!USE_SANDBOX) {
    throw new Error(
      'Sertifikasyon PNR kontrolü için --sandbox kullanın. ' +
        '(--from-db canlı API döner; sandbox PNR bulunamaz.)',
    )
  }
  return buildSandboxConfig(getArg)
}

async function main() {
  const cfg = loadCfg()
  console.log(`KPlus Air PNR doğrulama — ${cfg.baseUrl}`)
  console.log(`Channel: ${cfg.channelCode}`)
  if (!isSandboxBaseUrl(cfg.baseUrl)) {
    console.warn('⚠️  Uyarı: baseUrl sandbox değil — PNR listesi sandbox kayıtlarıdır.\n')
  } else {
    console.log('')
  }

  let tokenCode = null
  try {
    const result = await createTravelrobotToken(cfg)
    tokenCode = result.tokenCode
  } catch (e) {
    throw new Error(`Token alınamadı: ${e.message}`)
  }
  if (!tokenCode) throw new Error('Token alınamadı: CreateTokenV2 yanıtında TokenCode yok')

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
  if (fail > 0) {
    console.log(
      '\nÇoğu PNR düşmüşse yeniden sertifikasyon koşusu (--sandbox --with-booking --only flights).',
    )
  }
  process.exit(fail > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error('[hata]', e.message)
  process.exit(1)
})
