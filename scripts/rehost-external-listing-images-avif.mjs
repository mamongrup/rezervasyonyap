/**
 * Harici CDN kapak/galeri görsellerini indirip yerel AVIF olarak yeniden host eder.
 *
 *   node scripts/rehost-external-listing-images-avif.mjs --dry-run
 *   node scripts/rehost-external-listing-images-avif.mjs --limit=50
 *   node scripts/rehost-external-listing-images-avif.mjs --hosts=fairystonetravel.com
 *   node scripts/rehost-external-listing-images-avif.mjs --category=activity
 *   node scripts/rehost-external-listing-images-avif.mjs --source=manual
 *
 * --source=manual → yalnızca panel/IDE ile eklenen ilanlar (API import otel/araç hariç).
 * Ortam: backend.env / DATABASE_URL veya PG* (createPgClient)
 */

import path from 'node:path'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createPgClient } from './lib/pg-client.mjs'
import {
  downloadGalleryImages,
  isExternalImageKey,
  normalizeDownloadUrl,
} from './lib/wtatil-image-download.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
// listingUploadDir(uploadsRoot, …) → …/ilanlar/{kategori}/{slug}
// DB storage_key = uploads/listings/ilanlar/… → dosya public/uploads/listings/ilanlar/…
const uploadsRoot = path.join(root, 'frontend', 'public', 'uploads', 'listings')

const dryRun = process.argv.includes('--dry-run')
const limitArg = process.argv.find((a) => a.startsWith('--limit='))
const limit = limitArg ? Number(limitArg.split('=')[1]) : 0
const hostsArg = process.argv.find((a) => a.startsWith('--hosts='))
const categoryArg = process.argv.find((a) => a.startsWith('--category='))
const categoryFilter = categoryArg ? categoryArg.split('=')[1].trim().toLowerCase() : ''
const sourceArg = process.argv.find((a) => a.startsWith('--source='))
const sourceFilter = sourceArg ? sourceArg.split('=')[1].trim().toLowerCase() : ''
const providerArg = process.argv.find((a) => a.startsWith('--provider='))
const providerFilter = providerArg ? providerArg.split('=')[1].trim().toLowerCase() : ''
const hostFilter = hostsArg
  ? hostsArg
      .split('=')[1]
      .split(',')
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean)
  : null
if (sourceFilter && !['manual', 'api', 'hybrid'].includes(sourceFilter)) {
  console.error(`Geçersiz --source=${sourceFilter} (manual|api|hybrid)`)
  process.exit(1)
}

const HOST_REPAIR = [
  { re: /bookeder\.com/i, fix: (u) => u.replace(/\.avif(\?|$)/i, '.JPEG$1') },
  {
    re: /productcdn\.tatilbudur\.com|ucdn\.tatilbudur\.net|tatilbudur\.com/i,
    fix: (u) => u.replace(/\.avif(\?|$)/i, '.jpg$1').replace(/\.JPEG(\?|$)/, '.jpg$1'),
  },
  { re: /reserwation\.com/i, fix: (u) => u.replace(/\.avif(\?|$)/i, '.jpg$1') },
  { re: /fairystonetravel\.com/i, fix: (u) => u.replace(/\.avif(\?|$)/i, '.jpg$1') },
  { re: /upload\.wikimedia\.org/i, fix: (u) => u.replace(/\.avif(\?|$)/i, '.jpg$1') },
  { re: /yolcu360\.com/i, fix: (u) => u.replace(/\.avif(\?|$)/i, '.png$1') },
  { re: /i\.travelapi\.com/i, fix: (u) => u.replace(/\.avif(\?|$)/i, '.jpg$1') },
  { re: /photos\.hotelbeds\.com/i, fix: (u) => u.replace(/\.avif(\?|$)/i, '.jpg$1') },
  { re: /aegeanhotels\.net/i, fix: (u) => u.replace(/\.avif(\?|$)/i, '.jpg$1') },
  { re: /cdn\.kplus\.com\.tr/i, fix: (u) => u.replace(/\.avif(\?|$)/i, '.jpg$1') },
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

const hostSqlPatterns = [
  'bookeder\\.com',
  'tatilbudur\\.com',
  'ucdn\\.tatilbudur\\.net',
  'reserwation\\.com',
  'fairystonetravel\\.com',
  'wikimedia\\.org',
  'yolcu360\\.com',
  'travelapi\\.com',
  'hotelbeds\\.com',
  'aegeanhotels\\.net',
  'kplus\\.com\\.tr',
]

const client = createPgClient()
await client.connect()

const hostUrlOr = hostSqlPatterns.map((p) => `e.url ~* '${p}'`).join('\n      OR ')
const params = []
let extraClause = ''
if (categoryFilter) {
  params.push(categoryFilter)
  extraClause += ` AND e.category_code = $${params.length}`
}
if (sourceFilter) {
  params.push(sourceFilter)
  extraClause += ` AND e.listing_source = $${params.length}`
}
if (providerFilter) {
  params.push(providerFilter)
  extraClause += ` AND e.external_provider_code = $${params.length}`
}
const listingStatusSql = providerFilter
  ? `l.status IN ('published', 'draft')`
  : `l.status = 'published'`

const listings = await client.query(
  `
  WITH e AS (
    SELECT l.id, l.slug, l.featured_image_url, pc.code AS category_code,
           coalesce(l.listing_source, 'manual') AS listing_source, l.external_provider_code, l.updated_at,
           coalesce(l.featured_image_url, '') AS url
    FROM listings l
    JOIN product_categories pc ON pc.id = l.category_id
    WHERE ${listingStatusSql}
      AND coalesce(l.featured_image_url, '') ~* '^https?://'
    UNION ALL
    SELECT l.id, l.slug, l.featured_image_url, pc.code AS category_code,
           coalesce(l.listing_source, 'manual') AS listing_source, l.external_provider_code, l.updated_at,
           li.storage_key AS url
    FROM listing_images li
    JOIN listings l ON l.id = li.listing_id
    JOIN product_categories pc ON pc.id = l.category_id
    WHERE ${listingStatusSql}
      AND li.storage_key ~* '^https?://'
  )
  SELECT id, slug, featured_image_url, category_code, listing_source, external_provider_code, max(updated_at) AS updated_at
  FROM e
  WHERE (
      ${hostUrlOr}
    )
    ${extraClause}
  GROUP BY id, slug, featured_image_url, category_code, listing_source, external_provider_code
  ORDER BY max(updated_at) DESC NULLS LAST
  ${limit > 0 ? `LIMIT ${Number(limit)}` : ''}
`,
  params,
)

console.log(
  `candidates=${listings.rows.length} dryRun=${dryRun} category=${categoryFilter || '*'} source=${sourceFilter || '*'} provider=${providerFilter || '*'} hosts=${hostFilter?.join(',') || 'default'}`,
)

let ok = 0
let fail = 0
let skipped = 0
for (const row of listings.rows) {
  const imgs = await client.query(
    `SELECT storage_key FROM listing_images WHERE listing_id = $1::uuid ORDER BY sort_order ASC, created_at ASC`,
    [row.id],
  )
  const sources = []
  const seen = new Set()
  const push = (u) => {
    const raw = String(u || '').trim()
    if (!isExternalImageKey(raw)) return
    const r = repairUrl(raw)
    if (!r || seen.has(r) || !hostAllowed(r)) return
    seen.add(r)
    sources.push(r)
  }
  push(row.featured_image_url)
  for (const im of imgs.rows) push(im.storage_key)
  if (!sources.length) {
    skipped += 1
    continue
  }

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
        : /fairystone/i.test(sources[0] || '')
          ? { Referer: 'https://fairystonetravel.com/', 'User-Agent': 'Mozilla/5.0' }
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
    // DB'yi CDN URL'lerinden koparmadan önce dosyaların gerçekten diskte olduğunu doğrula.
    const missing = []
    for (const item of saved) {
      const key = String(item.storageKey || '').replace(/^\/+/, '')
      const abs = path.join(root, 'frontend', 'public', key)
      if (!existsSync(abs)) missing.push(key)
    }
    if (missing.length) {
      fail += 1
      console.warn(`[fail] ${row.slug} missing on disk after write: ${missing.slice(0, 3).join(', ')}`)
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
    const maxSort = await client.query(
      `SELECT coalesce(max(sort_order), -1)::int AS m FROM listing_images WHERE listing_id = $1::uuid`,
      [row.id],
    )
    const baseSort = Number(maxSort.rows[0]?.m ?? -1) + 1
    for (let i = 0; i < saved.length; i++) {
      const key = String(saved[i].storageKey || '').replace(/^\/+/, '')
      await client.query(
        `INSERT INTO listing_images (listing_id, storage_key, sort_order, original_mime)
         VALUES ($1::uuid, $2, $3, 'image/avif')`,
        [row.id, key, baseSort + Number(saved[i].sort ?? i)],
      )
    }
    // Feed'de güvenli sınıflandırılmış oda görsellerini aynı yerel AVIF'lere çevir.
    // Lobby/restaurant vb. zaten fix-hotel-room-images-in-feed tarafından elendi.
    const localBySource = new Map(
      saved
        .map((item) => [
          repairUrl(String(item.sourceUrl || '')),
          `/${String(item.storageKey || '').replace(/^\/+/, '')}`,
        ])
        .filter(([source, local]) => source && local),
    )
    if (localBySource.size > 0) {
      const roomRows = await client.query(
        `SELECT id::text, meta_json FROM hotel_rooms WHERE listing_id=$1::uuid`,
        [row.id],
      )
      for (const room of roomRows.rows) {
        const meta = room.meta_json && typeof room.meta_json === 'object' ? room.meta_json : {}
        const originals = Array.isArray(meta.images)
          ? meta.images
          : typeof meta.image === 'string' && meta.image.trim()
            ? [meta.image]
            : []
        const localImages = originals
          .map((url) => localBySource.get(repairUrl(String(url || ''))))
          .filter(Boolean)
        if (!localImages.length) continue
        await client.query(
          `UPDATE hotel_rooms
              SET meta_json = meta_json || jsonb_build_object('image',$2::text,'images',$3::jsonb)
            WHERE id=$1::uuid`,
          [room.id, localImages[0], JSON.stringify([...new Set(localImages)])],
        )
      }
    }
    ok += 1
    console.log(`[ok] ${row.slug} → ${cover} (n=${saved.length})`)
  } catch (e) {
    fail += 1
    console.warn(`[fail] ${row.slug}`, e.message || e)
  }
}

console.log(JSON.stringify({ ok, fail, skipped, dryRun }, null, 2))
await client.end()
