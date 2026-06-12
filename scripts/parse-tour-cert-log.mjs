#!/usr/bin/env node
/**
 * Son tur cert logundan GetTourFinalPrice / BookTour istek-yanıt özetini döker.
 *   node scripts/parse-tour-cert-log.mjs
 *   node scripts/parse-tour-cert-log.mjs travelrobot-test-log-2026-06-12T16-19-19.json
 */
import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const arg = process.argv[2]
let logPath = arg ? join(root, arg) : null

if (!logPath) {
  const files = readdirSync(root)
    .filter((f) => f.startsWith('travelrobot-test-log-') && f.endsWith('.json'))
    .sort()
  logPath = files.length ? join(root, files.at(-1)) : null
}

if (!logPath) {
  console.error('Log dosyası bulunamadı')
  process.exit(1)
}

const entries = JSON.parse(readFileSync(logPath, 'utf8'))
const pick = (step) => {
  const exact = entries.filter((e) => e.method === step)
  if (exact.length) return exact
  return entries.filter(
    (e) => e.endpoint?.includes(step) && !String(e.method ?? '').endsWith('-fail'),
  )
}

console.log('log:', logPath)
for (const step of ['GetTourPrices-hit', 'GetTourFinalPrice', 'GetPickupPoints', 'BookTour-fail', 'BookTour']) {
  const rows = pick(step)
  if (!rows.length) continue
  const last = rows.at(-1)
  console.log('\n===', step, '===')
  if (step === 'BookTour-fail' && last.request?.attempts?.length) {
    console.log('attempts:', JSON.stringify(last.request.attempts, null, 2))
  }
  console.log('request:', JSON.stringify(last.request, null, 2)?.slice(0, 6000))
  console.log('response:', JSON.stringify(last.response, null, 2)?.slice(0, 3000))
}
