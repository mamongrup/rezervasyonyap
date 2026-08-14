#!/usr/bin/env node
/** Active, already-priced KPlus hotels in resumable batches. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { createPgClient } from './lib/pg-client.mjs'

const args = process.argv.slice(2)
function arg(name, fallback = '') {
  const i = args.indexOf(name)
  return i >= 0 ? String(args[i + 1] ?? fallback).trim() : fallback
}

const batchSize = Math.max(1, Number(arg('--batch-size', '100')) || 100)
const delay = Math.max(0, Number(arg('--delay', '500')) || 0)
const checkpointFile = resolve(arg('--checkpoint-file', '.deploy/kplus-active-priced-sync.json'))

function checkpoint() {
  if (!existsSync(checkpointFile)) return { afterId: '' }
  try { return JSON.parse(readFileSync(checkpointFile, 'utf8')) } catch { return { afterId: '' } }
}

function saveCheckpoint(afterId) {
  mkdirSync(dirname(checkpointFile), { recursive: true })
  writeFileSync(checkpointFile, JSON.stringify({ afterId, updatedAt: new Date().toISOString() }, null, 2) + '\n')
}

async function reportStatus() {
  const pg = createPgClient()
  await pg.connect()
  try {
    const result = await pg.query(`
      SELECT l.status::text AS status, count(*)::int AS total,
        count(*) FILTER (WHERE COALESCE(l.first_charge_amount, 0) > 0 OR EXISTS (
          SELECT 1 FROM listing_meal_plans m
          WHERE m.listing_id = l.id AND m.is_active = true AND m.price_per_night > 0
        ))::int AS priced
      FROM listings l
      JOIN product_categories pc ON pc.id = l.category_id AND pc.code = 'hotel'
      WHERE l.external_provider_code = 'travelrobot'
      GROUP BY l.status ORDER BY l.status`)
    console.log('KPlus aktif/pasif raporu:')
    for (const row of result.rows) console.log(`  ${row.status}: ${row.total} ilan, ${row.priced} fiyatlı`)
  } finally {
    await pg.end()
  }
}

function runBatch(afterId) {
  return new Promise((resolveBatch, reject) => {
    const child = spawn(process.execPath, [
      'scripts/sync-hotel-vitrin-prices.mjs', '--force', '--only-priced',
      '--after-id', afterId, '--limit', String(batchSize), '--delay', String(delay),
    ], { stdio: ['ignore', 'pipe', 'pipe'] })
    let output = ''
    const forward = (chunk, stream) => { const text = String(chunk); output += text; stream.write(text) }
    child.stdout.on('data', (chunk) => forward(chunk, process.stdout))
    child.stderr.on('data', (chunk) => forward(chunk, process.stderr))
    child.on('error', reject)
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(`Parti işlem kodu ${code}`))
      const cursor = output.match(/^NEXT_CURSOR=(.+)$/m)?.[1]?.trim() ?? ''
      const count = Number(output.match(/^(\d+) otel işlenecek/m)?.[1] ?? 0)
      resolveBatch({ cursor, count })
    })
  })
}

async function main() {
  await reportStatus()
  let afterId = String(checkpoint().afterId ?? '').trim()
  console.log(`Checkpoint: ${afterId || 'yok'} | parti: ${batchSize}`)
  while (true) {
    const { cursor, count } = await runBatch(afterId)
    if (!cursor || count === 0) break
    saveCheckpoint(cursor)
    afterId = cursor
    console.log(`Checkpoint kaydedildi: ${afterId}`)
    if (count < batchSize) break
  }
  console.log('KPlus aktif fiyat senkronu tamamlandı.')
}

main().catch((error) => { console.error(error); process.exit(1) })
