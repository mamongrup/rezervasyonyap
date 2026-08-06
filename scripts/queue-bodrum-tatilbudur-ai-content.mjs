#!/usr/bin/env node
/**
 * Bodrum TatilBudur otellerinde 6 dil eksikse AI içerik batch'i kuyruğa alır.
 *
 *   node scripts/queue-bodrum-tatilbudur-ai-content.mjs
 *   node scripts/queue-bodrum-tatilbudur-ai-content.mjs --overwrite
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPgClient } from './lib/pg-client.mjs'
import { queueHotelEditorialRefresh } from './lib/hotel-import-quality.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const overwrite = process.argv.includes('--overwrite')
const urlsFile = path.resolve(
  ROOT,
  process.env.BODRUM_TATILBUDUR_URLS || 'deploy/data/tatilbudur/bodrum-request-urls.txt',
)

const refs = fs
  .readFileSync(urlsFile, 'utf8')
  .split(/\r?\n/)
  .map((line) => line.replace(/#.*/, '').trim())
  .filter(Boolean)
  .map((url) => {
    try {
      return new URL(url).pathname.replace(/^\/+|\/+$/g, '')
    } catch {
      return ''
    }
  })
  .filter(Boolean)

const client = createPgClient()
await client.connect()
try {
  const result = await client.query(
    `SELECT l.id::text, l.slug, tr.title,
       (SELECT count(*)::int
          FROM listing_translations lt
          JOIN locales lo ON lo.id=lt.locale_id
         WHERE lt.listing_id=l.id
           AND lo.code=ANY(ARRAY['tr','en','de','ru','zh','fr'])
           AND length(trim(coalesce(lt.title,''))) >= 2
           AND length(trim(coalesce(lt.description,''))) >= 120) AS locale_count
     FROM listings l
     JOIN listing_translations tr ON tr.listing_id=l.id
     JOIN locales trlo ON trlo.id=tr.locale_id AND trlo.code='tr'
     WHERE l.external_provider_code='tatilbudur'
       AND l.external_listing_ref=ANY($1::text[])
     ORDER BY tr.title`,
    [refs],
  )

  let queued = 0
  let alreadyComplete = 0
  const batches = []
  for (const row of result.rows) {
    if (Number(row.locale_count) >= 6) {
      alreadyComplete += 1
      continue
    }
    const batchId = await queueHotelEditorialRefresh(client, row.id, { overwrite })
    queued += 1
    batches.push({ slug: row.slug, locale_count: Number(row.locale_count), batchId })
  }

  console.log(
    JSON.stringify(
      {
        found: result.rows.length,
        alreadyComplete,
        queued,
        overwrite,
        sample: batches.slice(0, 8),
      },
      null,
      2,
    ),
  )
} finally {
  await client.end()
}
