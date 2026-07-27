/**
 * Harici CDN kapak/galeri görsellerini indirip yerel AVIF olarak yeniden host eder.
 *
 *   node scripts/rehost-external-listing-images-avif.mjs --dry-run
 *   node scripts/rehost-external-listing-images-avif.mjs --limit=50
 *   node scripts/rehost-external-listing-images-avif.mjs --hosts=bookeder.com,reserwation.com
 *
 * Ortam: PGHOST PGUSER PGDATABASE PGPASSWORD (yoksa yerel travel/postgres)
 */

import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  downloadGalleryImages,
  isExternalImageKey,
  normalizeDownloadUrl,
} from './lib/wtatil-image-download.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const uploadsRoot = path.join(root, 'frontend', 'public', 'uploads')
const pg = createRequire(path.join(root, 'frontend/package.json'))('pg')

const dryRun = process.argv.includes('--dry-run')
const limitArg = process.argv.find((a) => a.startsWith('--limit='))
const limit = limitArg ? Number(limitArg.split('=')[1]) : 0
const hostsArg = process.argv.find((a) => a.startsWith('--hosts='))
const hostFilter = hostsArg
  ? hostsArg
      .split('=')[1]
      .split(',')
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean)
  : null

const HOST_REPAIR = [
  { re: /bookeder\.com/i, fix: (u) => u.replace(/\.avif(\?|$)/i, '.JPEG$1') },
  {
    re: /productcdn\.tatilbudur\.com|tatilbudur\.com/i,
    fix: (u) => u.replace(/\.avif(\?|$)/i, '.jpg$1').replace(/\.JPEG(\?|$)/, '.jpg$1'),
  },
  { re: /reserwation\.com/i, fix: (u) => u.replace(/\.avif(\?|$)/i, '.jpg$1') },
  { re: /fairystonetravel\.com/i, fix: (u) => u.replace(/\.avif(\?|$)/i, '.jpg$1') },
  { re: /upload\.wikimedia\.org/i, fix: (u) => u.replace(/\.avif(\?|$)/i, '.jpg$1') },
  { re: /yolcu360\.com/i, fix: (u) => u.replace(/\.avif(\?|$)/i, '.png$1') },
]

function repairUrl(url) {
  let u = normalizeDownloadUrl(url)
  for (const rule of HOST_REPAIR) {
    if (rule.re.test(u)) return rule.fix(u)
  }
  return u
}

function hostAllowed(url) {
  try {
    const host = new URL(url).hostname.toLowerCase()
    if (hostFilter) {
      return hostFilter.some((h) => host === h || host.endsWith(`.${h}`) || host.includes(h))
    }
    return HOST_REPAIR.some((r) => r.re.test(host))
  } catch {
    return false
  }
}

const client = new pg.Client({
  host: process.env.PGHOST || '127.0.0.1',
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '',
  database: process.env.PGDATABASE || 'travel',
})
await client.connect()

const listings = await client.query(`
  SELECT l.id, l.slug, l.featured_image_url, pc.code AS category_code
  FROM listings l
  JOIN product_categories pc ON pc.id = l.category_id
  WHERE l.featured_image_url ~* '^https?://'
    AND (
      l.featured_image_url ~* 'bookeder\\.com'
      OR l.featured_image_url ~* 'tatilbudur\\.com'
      OR l.featured_image_url ~* 'reserwation\\.com'
      OR l.featured_image_url ~* 'fairystonetravel\\.com'
      OR l.featured_image_url ~* 'wikimedia\\.org'
      OR l.featured_image_url ~* 'yolcu360\\.com'
    )
  ORDER BY l.updated_at DESC NULLS LAST
  ${limit > 0 ? `LIMIT ${Number(limit)}` : ''}
`)

console.log(`candidates=${listings.rows.length} dryRun=${dryRun}`)

let ok = 0
let fail = 0
for (const row of listings.rows) {
  const feat = String(row.featured_image_url || '').trim()
  if (!isExternalImageKey(feat) || !hostAllowed(feat)) continue

  const imgs = await client.query(
    `SELECT storage_key FROM listing_images WHERE listing_id = $1::uuid ORDER BY sort_order ASC, created_at ASC`,
    [row.id],
  )
  const sources = []
  const seen = new Set()
  const push = (u) => {
    const r = repairUrl(u)
    if (!r || seen.has(r) || !hostAllowed(r)) return
    seen.add(r)
    sources.push(r)
  }
  push(feat)
  for (const im of imgs.rows) {
    if (isExternalImageKey(im.storage_key)) push(im.storage_key)
  }
  if (!sources.length) continue

  if (dryRun) {
    console.log(`[dry] ${row.slug} images=${sources.length} cat=${row.category_code}`)
    ok += 1
    continue
  }

  try {
    const headers = /wikimedia/i.test(sources[0] || '')
      ? { Referer: 'https://commons.wikimedia.org/', 'User-Agent': 'Mozilla/5.0' }
      : /yolcu360/i.test(sources[0] || '')
        ? { Referer: 'https://www.yolcu360.com/', 'User-Agent': 'Mozilla/5.0' }
        : { 'User-Agent': 'Mozilla/5.0' }

    const saved = await downloadGalleryImages(sources, row.slug, uploadsRoot, {
      categoryCode: row.category_code,
      headers,
    })
    if (!saved?.length) {
      fail += 1
      console.warn(`[fail] ${row.slug} no files saved`)
      continue
    }
    const coverRaw = String(saved[0].storageKey || '').replace(/^\/+/, '')
    const cover = `/${coverRaw}`
    await client.query(
      `UPDATE listings SET featured_image_url = $2, thumbnail_url = $2, updated_at = now() WHERE id = $1::uuid`,
      [row.id, cover],
    )
    await client.query(
      `DELETE FROM listing_images WHERE listing_id = $1::uuid AND storage_key ~* '^https?://'`,
      [row.id],
    )
    for (let i = 0; i < saved.length; i++) {
      const key = String(saved[i].storageKey || '').replace(/^\/+/, '')
      await client.query(
        `INSERT INTO listing_images (listing_id, storage_key, sort_order, original_mime)
         VALUES ($1::uuid, $2, $3, 'image/avif')`,
        [row.id, key, Number(saved[i].sort ?? i)],
      )
    }
    ok += 1
    console.log(`[ok] ${row.slug} → ${cover} (n=${saved.length})`)
  } catch (e) {
    fail += 1
    console.warn(`[fail] ${row.slug}`, e.message || e)
  }
}

console.log(JSON.stringify({ ok, fail, dryRun }, null, 2))
await client.end()
