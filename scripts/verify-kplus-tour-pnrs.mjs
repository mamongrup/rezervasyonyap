#!/usr/bin/env node
/**
 * KPlus sandbox Tour SystemPNR doğrulama (GetTourBooking).
 *
 * İlk başarılı cert koşusundan sonra TOUR_PNRS dizisini güncelleyin
 * (travelrobot-test-summary-*.txt içindeki SystemPNR satırları).
 *
 *   node scripts/verify-kplus-tour-pnrs.mjs --sandbox
 */
import { createTravelrobotToken, getTourBooking } from './lib/travelrobot-api.mjs'
import { buildSandboxConfig, isSandboxBaseUrl } from './lib/travelrobot-sandbox-config.mjs'

const args = process.argv.slice(2)
const USE_SANDBOX = args.includes('--sandbox')

function getArg(name) {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}

/** Cert koşusu sonrası doldurun: ['Tour-S1', 'SYSTEMPNR'], … */
const TOUR_PNRS = []

function loadCfg() {
  if (!USE_SANDBOX) {
    throw new Error('Tur PNR kontrolü için --sandbox kullanın.')
  }
  return buildSandboxConfig(getArg)
}

async function main() {
  if (!TOUR_PNRS.length) {
    console.log('TOUR_PNRS listesi boş — önce cert çalıştırın:')
    console.log('  node scripts/test-travelrobot-scenarios.mjs --sandbox --with-booking --only tours')
    console.log('Ardından scripts/verify-kplus-tour-pnrs.mjs içindeki TOUR_PNRS dizisini güncelleyin.')
    process.exit(0)
  }

  const cfg = loadCfg()
  console.log(`KPlus Tour PNR doğrulama — ${cfg.baseUrl}`)
  if (!isSandboxBaseUrl(cfg.baseUrl)) {
    console.warn('⚠️  Uyarı: baseUrl sandbox değil.\n')
  }

  const { tokenCode } = await createTravelrobotToken(cfg)
  let ok = 0
  let fail = 0
  for (const [scenario, systemPnr] of TOUR_PNRS) {
    try {
      const res = await getTourBooking(cfg, tokenCode, { systemPnr, lastName: 'TRAVELER' })
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
  console.log(`\nÖzet: ${ok} OK, ${fail} FAIL`)
  process.exit(fail > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
