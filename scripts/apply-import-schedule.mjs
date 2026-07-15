#!/usr/bin/env node
/**
 * import_schedule site_settings kaydı — günlük otomatik import saatleri (UTC).
 *
 *   node scripts/apply-import-schedule.mjs
 *   node scripts/apply-import-schedule.mjs --dry-run
 */
import { createPgClient } from './lib/pg-client.mjs'

const KEY = 'import_schedule'
const dryRun = process.argv.includes('--dry-run')

function parseHoursEnv(key, fallback) {
  const raw = String(process.env[key] ?? '').trim()
  if (!raw) return fallback
  return raw
    .split(/[,\s]+/)
    .map((s) => Number.parseInt(s, 10))
    .filter((n) => Number.isFinite(n) && n >= 0 && n <= 23)
}

const schedule = {
  wtatil: parseHoursEnv('IMPORT_SCHEDULE_WTATIL', [3, 15]),
  travelrobot: parseHoursEnv('IMPORT_SCHEDULE_TRAVELROBOT', [2, 14]),
  turna: parseHoursEnv('IMPORT_SCHEDULE_TURNA', [4]),
  yolcu360: parseHoursEnv('IMPORT_SCHEDULE_YOLCU360', [6]),
  // Otel detay/fiyatları gece yenilenir. Tatilbudur resmi feed tanımlandığında
  // IMPORT_SCHEDULE_TATILBUDUR ile etkinleştirilir.
  tatilsepeti: parseHoursEnv('IMPORT_SCHEDULE_TATILSEPETI', [0]),
  tatilbudur: parseHoursEnv('IMPORT_SCHEDULE_TATILBUDUR', []),
  listing_reference: parseHoursEnv('IMPORT_SCHEDULE_LISTING_REFERENCE', [1, 7, 13, 19]),
}

console.log(dryRun ? '[dry-run] import_schedule:' : 'Kaydediliyor import_schedule:')
console.log(JSON.stringify(schedule, null, 2))
console.log('Not: saatler UTC. TR (UTC+3) için +3 saat ekleyin.')

if (dryRun) process.exit(0)

const client = createPgClient()
await client.connect()
try {
  await client.query(
    `INSERT INTO site_settings (organization_id, key, value_json)
     VALUES (NULL, $1, $2::jsonb)
     ON CONFLICT (key) WHERE organization_id IS NULL
     DO UPDATE SET value_json = excluded.value_json`,
    [KEY, JSON.stringify(schedule)],
  )
  console.log('OK — import_schedule güncellendi.')
} finally {
  await client.end()
}
