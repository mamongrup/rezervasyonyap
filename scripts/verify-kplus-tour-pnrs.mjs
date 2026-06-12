#!/usr/bin/env node
/**
 * KPlus sandbox Tour SystemPNR doğrulama.
 *
 * Stoplight Tour API akışı BookTour ile biter — otel gibi GetHotelBooking / GetBooking
 * karşılığı yoktur. Varsayılan mod cert log'daki başarılı BookTour yanıtını doğrular.
 *
 *   node scripts/verify-kplus-tour-pnrs.mjs --sandbox
 *   node scripts/verify-kplus-tour-pnrs.mjs --sandbox --log travelrobot-test-log-2026-06-12T22-56-10.json
 *   node scripts/verify-kplus-tour-pnrs.mjs --sandbox --live   # deneysel API sorgusu (çoğu sandbox'ta 404)
 */
import { readFileSync, readdirSync, existsSync } from 'fs'
import { join, dirname, isAbsolute } from 'path'
import { fileURLToPath } from 'url'
import { createTravelrobotToken, getTourBooking } from './lib/travelrobot-api.mjs'
import { buildSandboxConfig, isSandboxBaseUrl } from './lib/travelrobot-sandbox-config.mjs'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const USE_SANDBOX = args.includes('--sandbox')
const USE_LIVE = args.includes('--live')

function getArg(name) {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}

/** v36 tam koşu — 2026-06-12T22-56-10 */
const TOUR_PNRS = [
  ['Tour-S1: 2 ADT / tek oda', '6ARJ06FVA2'],
  ['Tour-S2: 2 ADT + 1 CHD(5) / tek oda', '63GP06II6C'],
  ['Tour-S3: 2 ADT + 1 CHD(8) / tek oda', '6RHU068FFL'],
]

function extractBookTourPnr(entry) {
  const booking = entry?.response?.Result?.Booking ?? entry?.response?.Result ?? {}
  const systemPnr =
    booking?.SystemPnr ??
    booking?.systemPnr ??
    entry?.response?.Result?.SystemPnr ??
    null
  return systemPnr ? String(systemPnr).trim().toUpperCase() : null
}

/** `TOUR CERT | Senaryo | SystemPNR: XXX | Tour: …` */
function parseTourPnrsFromSummaryText(text) {
  const rows = []
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith('TOUR CERT |')) continue
    const parts = line.split('|').map((p) => p.trim())
    if (parts.length < 3) continue
    const scenario = parts[1]
    const pnrMatch = parts[2].match(/SystemPNR:\s*(\S+)/i)
    const systemPnr = pnrMatch?.[1]
    if (!scenario || !systemPnr || systemPnr === '-') continue
    rows.push([scenario, systemPnr])
  }
  return rows
}

function parseTourPnrsFromLogText(text) {
  const entries = JSON.parse(text)
  if (!Array.isArray(entries)) return []
  const rows = []
  const seen = new Set()
  for (const entry of entries) {
    if (entry?.method !== 'BookTour' || !entry?.success) continue
    const scenario = entry.scenario
    const systemPnr = extractBookTourPnr(entry)
    if (!scenario || !systemPnr || seen.has(systemPnr)) continue
    seen.add(systemPnr)
    rows.push([scenario, systemPnr])
  }
  return rows
}

function resolveSummaryPath(explicit) {
  if (explicit) {
    return isAbsolute(explicit) ? explicit : join(repoRoot, explicit)
  }
  const files = readdirSync(repoRoot)
    .filter((f) => f.startsWith('travelrobot-test-summary-') && f.endsWith('.txt'))
    .sort()
  return files.length ? join(repoRoot, files.at(-1)) : null
}

function resolveLogPath(explicit) {
  if (explicit) {
    return isAbsolute(explicit) ? explicit : join(repoRoot, explicit)
  }
  const files = readdirSync(repoRoot)
    .filter((f) => f.startsWith('travelrobot-test-log-') && f.endsWith('.json'))
    .sort()
  return files.length ? join(repoRoot, files.at(-1)) : null
}

function resolveTourPnrs() {
  const summaryArg = getArg('--summary')
  if (summaryArg) {
    const summaryPath = resolveSummaryPath(summaryArg)
    if (summaryPath && existsSync(summaryPath)) {
      const parsed = parseTourPnrsFromSummaryText(readFileSync(summaryPath, 'utf8'))
      if (parsed.length) {
        console.log(`[config] PNR kaynağı: ${summaryPath} (${parsed.length} tur)`)
        return parsed
      }
    }
  }

  const logArg = getArg('--log')
  if (logArg) {
    const logPath = resolveLogPath(logArg)
    if (logPath && existsSync(logPath)) {
      const parsed = parseTourPnrsFromLogText(readFileSync(logPath, 'utf8'))
      if (parsed.length) {
        console.log(`[config] PNR kaynağı: ${logPath} (${parsed.length} tur)`)
        return parsed
      }
    }
  }

  if (TOUR_PNRS.length) {
    console.log(`[config] PNR kaynağı: TOUR_PNRS sabit listesi (${TOUR_PNRS.length} tur)`)
    return TOUR_PNRS
  }

  const summaryPath = resolveSummaryPath(null)
  if (summaryPath && existsSync(summaryPath)) {
    const parsed = parseTourPnrsFromSummaryText(readFileSync(summaryPath, 'utf8'))
    if (parsed.length) {
      console.log(`[config] PNR kaynağı: ${summaryPath} (${parsed.length} tur)`)
      return parsed
    }
  }

  const logPath = resolveLogPath(null)
  if (logPath && existsSync(logPath)) {
    const parsed = parseTourPnrsFromLogText(readFileSync(logPath, 'utf8'))
    if (parsed.length) {
      console.log(`[config] PNR kaynağı: ${logPath} (${parsed.length} tur)`)
      return parsed
    }
  }

  return []
}

function loadCertLogEntries() {
  const logPath = resolveLogPath(getArg('--log') ?? null)
  if (!logPath || !existsSync(logPath)) return { logPath: null, entries: [] }
  const entries = JSON.parse(readFileSync(logPath, 'utf8'))
  return { logPath, entries: Array.isArray(entries) ? entries : [] }
}

function findBookTourEntry(entries, scenario, systemPnr) {
  const want = String(systemPnr).trim().toUpperCase()
  const matches = entries.filter((entry) => {
    if (entry?.method !== 'BookTour' || !entry?.success) return false
    return extractBookTourPnr(entry) === want
  })
  if (!matches.length) return null
  if (scenario) {
    const byScenario = matches.filter((entry) => entry.scenario === scenario)
    if (byScenario.length) return byScenario.at(-1)
  }
  return matches.at(-1)
}

function loadCfg() {
  if (!USE_SANDBOX) {
    throw new Error('Tur PNR kontrolü için --sandbox kullanın.')
  }
  return buildSandboxConfig(getArg)
}

async function verifyLive(cfg, tourPnrs) {
  const { tokenCode } = await createTravelrobotToken(cfg)
  let ok = 0
  let fail = 0
  for (const [scenario, systemPnr] of tourPnrs) {
    try {
      const res = await getTourBooking(cfg, tokenCode, { systemPnr, lastName: 'TRAVELER' })
      const found = res?.Result?.Booking?.SystemPnr ?? res?.Result?.SystemPnr ?? null
      if (!res?.HasError && found) {
        console.log(`✅ ${scenario}  ${systemPnr}  → GetTourBooking bulundu`)
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
  return { ok, fail }
}

function verifyCertLog(tourPnrs, logPath, entries) {
  let ok = 0
  let fail = 0
  for (const [scenario, systemPnr] of tourPnrs) {
    const entry = findBookTourEntry(entries, scenario, systemPnr)
    if (entry) {
      console.log(`✅ ${scenario}  ${systemPnr}  → cert log BookTour yanıtı`)
      ok++
    } else {
      console.log(`❌ ${scenario}  ${systemPnr}  → cert log'da başarılı BookTour yok`)
      fail++
    }
  }
  if (logPath) {
    console.log(`[config] Doğrulama kaynağı: ${logPath}`)
  } else {
    console.log('⚠️  Cert log bulunamadı — --log travelrobot-test-log-....json verin')
  }
  return { ok, fail }
}

async function main() {
  const tourPnrs = resolveTourPnrs()
  if (!tourPnrs.length) {
    console.log('Tur PNR bulunamadı — önce cert çalıştırın:')
    console.log('  node scripts/test-travelrobot-scenarios.mjs --sandbox --with-booking --only tours')
    console.log('Ardından:')
    console.log('  node scripts/verify-kplus-tour-pnrs.mjs --sandbox')
    console.log('  node scripts/verify-kplus-tour-pnrs.mjs --sandbox --log travelrobot-test-log-....json')
    process.exit(0)
  }

  const cfg = loadCfg()
  console.log(`KPlus Tour PNR doğrulama — ${cfg.baseUrl}`)
  console.log(`Channel: ${cfg.channelCode}`)
  if (!isSandboxBaseUrl(cfg.baseUrl)) {
    console.warn('⚠️  Uyarı: baseUrl sandbox değil.\n')
  }

  if (USE_LIVE) {
    console.log('[config] Mod: canlı API (GetTourBooking — Tour API dokümantasyonunda yok, 404 olabilir)\n')
    const { ok, fail } = await verifyLive(cfg, tourPnrs)
    console.log(`\nÖzet: ${ok} OK, ${fail} FAIL`)
    process.exit(fail > 0 ? 1 : 0)
  }

  const { logPath, entries } = loadCertLogEntries()
  console.log(
    '[config] Mod: cert log (BookTour yanıtı — KPlus Tour API sertifikasyon kanıtı)\n',
  )
  const { ok, fail } = verifyCertLog(tourPnrs, logPath, entries)
  console.log(`\nÖzet: ${ok} OK, ${fail} FAIL`)
  if (fail > 0) {
    console.log(
      '\nNot: Tour Stoplight akışında GetBooking yok; sertifikasyon kanıtı BookTour + SystemPNR logudur.',
    )
  }
  process.exit(fail > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
