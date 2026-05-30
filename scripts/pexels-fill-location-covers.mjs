#!/usr/bin/env node
/**
 * Kapak + 3 mozaik — Pexels → location_pages (panel batch ile aynı mantık).
 * npm/pg modülü gerekmez — yalnızca psql CLI.
 *
 *   set -a && source /etc/rezervasyonyap/backend.env && set +a
 *   node scripts/pexels-fill-location-covers.mjs --dry-run --limit 3
 */
import {
  execSql,
  queryRows,
  queryScalar,
  sqlJson,
  sqlLiteral,
} from './lib/psql-exec.mjs'
import { loadBackendEnvFile } from './lib/load-backend-env.mjs'

const SCRIPT_VERSION = 'psql-v1'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const limitArg = args.find((a) => a.startsWith('--limit='))?.slice('--limit='.length)
  ?? (args.includes('--limit') ? args[args.indexOf('--limit') + 1] : null)
const maxItems = limitArg ? Math.max(1, parseInt(limitArg, 10) || 0) : 0
const delayMs = Number(process.env.PEXELS_DELAY_MS || 350)

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function loadPexelsKeys() {
  const rows = queryRows(
    `SELECT coalesce(value_json->'api_keys', '[]'::jsonb) AS keys
     FROM site_settings WHERE key = 'pexels' AND organization_id IS NULL
     ORDER BY id DESC LIMIT 1`,
  )
  const keys = rows[0]?.keys
  const list = Array.isArray(keys) ? keys.map(String).map((k) => k.trim()).filter(Boolean) : []
  if (list.length === 0) throw new Error('site_settings.pexels api_keys boş')
  return list
}

function queriesFor(row) {
  const { region_type, location_name, parent_name } = row
  if (region_type === 'country') {
    return [`${location_name} landscape travel`, `${location_name} nature`, 'Turkey landscape']
  }
  if (region_type === 'province') {
    return [
      `${location_name} Turkey`,
      `${location_name} city Turkey`,
      `${location_name} travel Turkey`,
      `${location_name} landscape`,
    ]
  }
  return [
    `${location_name} ${parent_name} Turkey`,
    `${parent_name} Turkey`,
    `${location_name} Turkey`,
    'Turkey nature landscape',
  ]
}

async function searchPexels(apiKey, query, perPage = 5) {
  const u = new URL('https://api.pexels.com/v1/search')
  u.searchParams.set('query', query)
  u.searchParams.set('per_page', String(Math.min(15, perPage)))
  u.searchParams.set('locale', 'tr-TR')
  const res = await fetch(u.toString(), { headers: { Authorization: apiKey } })
  if (!res.ok) return []
  const data = await res.json()
  return (data.photos ?? []).map((p) => p?.src?.large).filter(Boolean)
}

async function fetchGalleryUrls(keys, queries, want = 3) {
  const urls = []
  const seen = new Set()
  let keyIdx = 0
  for (const q of queries) {
    if (urls.length >= want) break
    const key = keys[keyIdx % keys.length]
    keyIdx++
    const found = await searchPexels(key, q, 8)
    await sleep(delayMs)
    for (const u of found) {
      if (seen.has(u)) continue
      seen.add(u)
      urls.push(u)
      if (urls.length >= want) break
    }
  }
  if (urls.length === 0) return []
  while (urls.length < want) urls.push(urls[urls.length % urls.length])
  return urls.slice(0, want)
}

function saveCover(id, cover, gallery) {
  execSql(
    `UPDATE location_pages
     SET cover_image = ${sqlLiteral(cover)},
         featured_image_url = ${sqlLiteral(cover)},
         gallery_json = ${sqlJson(gallery)},
         updated_at = now()
     WHERE id = ${sqlLiteral(id)}::uuid`,
  )
}

function markNotFound(id) {
  execSql(`UPDATE location_pages SET cover_image = 'not_found' WHERE id = ${sqlLiteral(id)}::uuid`)
}

async function main() {
  console.log(`→ pexels-fill-location-covers (${SCRIPT_VERSION}) başlıyor…`)
  loadBackendEnvFile()

  const keys = loadPexelsKeys()
  console.log(`→ ${keys.length} Pexels key yüklendi`)

  const rows = queryRows(
    `SELECT lp.id::text AS id, lp.slug_path,
            coalesce(lp.region_type, 'district') AS region_type,
            coalesce(d.name, r2.name, co2.name, lp.title, lp.slug_path) AS location_name,
            coalesce(r3.name, '') AS parent_name
     FROM location_pages lp
     LEFT JOIN districts d ON d.id = lp.district_id
     LEFT JOIN regions r2 ON r2.id = lp.region_id
     LEFT JOIN countries co2 ON co2.id = lp.country_id
     LEFT JOIN regions r3 ON r3.id = d.region_id
     WHERE coalesce(lp.cover_image, '') = ''
     ORDER BY CASE coalesce(lp.region_type, 'district')
                WHEN 'country' THEN 1 WHEN 'province' THEN 2
                WHEN 'district' THEN 3 ELSE 4 END,
              lp.slug_path`,
  )

  const todo = maxItems > 0 ? rows.slice(0, maxItems) : rows
  console.log(`→ Hedef: ${todo.length} / ${rows.length} kapaksız lokasyon`)
  if (dryRun) console.log('[dry-run] DB yazılmayacak')

  let ok = 0
  let fail = 0
  for (const row of todo) {
    const gallery = await fetchGalleryUrls(keys, queriesFor(row), 3)
    if (gallery.length === 0) {
      console.log(`  ✗ ${row.slug_path} — Pexels sonuç yok`)
      if (!dryRun) markNotFound(row.id)
      fail++
      continue
    }
    console.log(`  ✓ ${row.slug_path} (${row.region_type})`)
    if (!dryRun) saveCover(row.id, gallery[0], gallery)
    ok++
  }

  const total = queryScalar(
    `SELECT count(*)::text FROM location_pages
     WHERE cover_image <> '' AND cover_image <> 'not_found'`,
  )
  console.log(`→ Özet: ${ok} başarılı, ${fail} başarısız | toplam kapaklı: ${total}`)
}

main().catch((e) => {
  console.error('[FAIL]', e.message || e)
  process.exit(1)
})
