#!/usr/bin/env node
/**
 * KPlus sandbox Tour SystemPNR doğrulama (GetTourBooking).
 *
 * PNR kaynağı (öncelik sırası):
 *   1. --summary travelrobot-test-summary-*.txt
 *   2. TOUR_PNRS sabit dizisi
 *   3. Repo kökündeki en son travelrobot-test-summary-*.txt
 *
 *   node scripts/verify-kplus-tour-pnrs.mjs --sandbox
 *   node scripts/verify-kplus-tour-pnrs.mjs --sandbox --summary travelrobot-test-summary-2026-06-12T22-56-10.txt
 *   node scripts/verify-kplus-tour-pnrs.mjs --sandbox --log travelrobot-test-log-2026-06-12T22-56-10.json
 */
import { readFileSync, readdirSync, existsSync } from 'fs'
import { join, dirname, isAbsolute } from 'path'
import { fileURLToPath } from 'url'
import { createTravelrobotToken, getTourBooking } from './lib/travelrobot-api.mjs'
import { buildSandboxConfig, isSandboxBaseUrl } from './lib/travelrobot-sandbox-config.mjs'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const USE_SANDBOX = args.includes('--sandbox')

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
    const booking = entry.response?.Result?.Booking ?? entry.response?.Result ?? {}
    const systemPnr =
      booking?.SystemPnr ??
      booking?.systemPnr ??
      entry.response?.Result?.SystemPnr ??
      null
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

function loadCfg() {
  if (!USE_SANDBOX) {
    throw new Error('Tur PNR kontrolü için --sandbox kullanın.')
  }
  return buildSandboxConfig(getArg)
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

  const { tokenCode } = await createTravelrobotToken(cfg)
  let ok = 0
  let fail = 0
  for (const [scenario, systemPnr] of tourPnrs) {
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
