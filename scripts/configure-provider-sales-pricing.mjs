#!/usr/bin/env node
/** Configure the user-approved supplier-net markup. Read-only unless --apply. */
import fs from 'node:fs'
import path from 'node:path'
import { createPgClient } from './lib/pg-client.mjs'

const apply = process.argv.includes('--apply')
const percentIndex = process.argv.indexOf('--percent')
const percent = percentIndex < 0 ? NaN : Number(process.argv[percentIndex + 1])
if (!Number.isFinite(percent) || percent < 0 || percent > 100) throw new Error('--percent 0..100 required')
const providers = ['travelrobot', 'wtatil', 'yolcu360']
const pg = createPgClient()
await pg.connect()
try {
  await pg.query('BEGIN')
  const result = await pg.query(`SELECT id, value_json FROM site_settings
    WHERE key = 'listing_api_providers' AND organization_id IS NULL
    ORDER BY id DESC LIMIT 1 FOR UPDATE`)
  const row = result.rows[0]
  if (!row) throw new Error('listing_api_providers_missing')
  const next = structuredClone(row.value_json)
  for (const provider of providers) {
    if (!next[provider]) throw new Error(`${provider}_config_missing`)
    next[provider].sales_markup_percent = percent
    if (provider === 'travelrobot') next[provider].hotel_commission_percent = percent
  }
  if (apply) {
    // Credentials stay on the production server, outside the public web root.
    const dir = process.env.PROVIDER_PRICING_BACKUP_DIR || '/var/lib/travel/pricing-backups'
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
    const backup = path.join(dir, `providers-${Date.now()}.json`)
    fs.writeFileSync(backup, JSON.stringify(row), { flag: 'wx', mode: 0o600 })
    await pg.query('UPDATE site_settings SET value_json = $2::jsonb WHERE id = $1', [row.id, JSON.stringify(next)])
    await pg.query('COMMIT')
    console.log(`APPLIED: supplier net + ${percent}%; private backup: ${backup}`)
  } else {
    await pg.query('ROLLBACK')
    console.log(`DRY RUN: supplier net + ${percent}%`)
  }
  for (const provider of providers) console.log(`${provider}: sales_markup_percent=${percent}`)
  console.log('Activation and publication unchanged; Yolcu360 still requires production access.')
} catch (error) {
  await pg.query('ROLLBACK')
  throw error
} finally {
  await pg.end()
}
