/**
 * Kabinsiz cruise ilanlarına Tatilsepeti eşleşmesiyle kabin/fiyat/detay doldurur.
 * Gezinomi kaynaklı ilanlar için: slug/provider değişmez, vertical_cruise merge edilir.
 *
 *   node scripts/backfill-cruise-cabins-from-tatilsepeti.mjs --dry-run --limit 5
 *   node scripts/backfill-cruise-cabins-from-tatilsepeti.mjs --limit 20
 *   node scripts/backfill-cruise-cabins-from-tatilsepeti.mjs
 *
 * Ortam: PG*, TATILSEPETI_DELAY_MS=500
 */

import { fetchAllTatilsepetiCatalog, fetchTourDetail } from './lib/tatilsepeti-cruise-api.mjs'
import { patchCruiseListingFromTatilsepetiDetail } from './lib/tatilsepeti-listing-db.mjs'
import { createPgClient } from './lib/pg-client.mjs'

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const ONLY_EMPTY = !args.has('--all')
const limitIdx = process.argv.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : 0
const slugIdx = process.argv.indexOf('--slug')
const SLUG = slugIdx >= 0 ? process.argv[slugIdx + 1] : ''
const MIN_SCORE = Number(process.env.TATILSEPETI_MATCH_MIN || 0.48)
const DELAY_MS = Number(process.env.TATILSEPETI_DELAY_MS || 500)

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function decodeHtml(s) {
  return String(s || '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&')
    .trim()
}

function normalizeTitle(title) {
  return decodeHtml(title)
    .toLowerCase()
    .replace(/[’'*]/g, '')
    .replace(/\d+\s*yıldızlı/gi, '')
    .replace(/\bncl\b/g, 'norwegian')
    .replace(/\d{1,2}\s+(ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık)\s*[-–]\s*\d{1,2}\s+(ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık)\s*\d{4}/gi, '')
    .replace(/\d+\s*gece/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function shipKey(title) {
  const n = normalizeTitle(title)
  const m =
    n.match(/(?:^|ile\s+)([a-z0-9][a-z0-9\s.'-]{2,40}?)\s+ile\b/) ||
    n.match(/\b(msc\s+\w+|costa\s+\w+|celebrity\s+\w+|norwegian\s+\w+|amadeus\s+\w+)/)
  return m ? m[1].replace(/\s+/g, ' ').trim() : ''
}

function titleSimilarity(a, b) {
  const stop = new Set(['ile', 'turu', 'turlari', 'gece', 'hareketli', 'varisli', 'varışlı', 'pgs'])
  const ta = new Set(
    normalizeTitle(a)
      .split(/[^a-z0-9çğıöşü]+/i)
      .filter((w) => w.length > 2 && !stop.has(w)),
  )
  const tb = new Set(
    normalizeTitle(b)
      .split(/[^a-z0-9çğıöşü]+/i)
      .filter((w) => w.length > 2 && !stop.has(w)),
  )
  if (!ta.size || !tb.size) return 0
  let inter = 0
  for (const w of ta) if (tb.has(w)) inter++
  const cover = inter / Math.max(ta.size, tb.size)
  const jaccard = inter / new Set([...ta, ...tb]).size
  const sk = shipKey(a)
  const shipBonus = sk && sk === shipKey(b) ? 0.12 : 0
  return Math.min(1, cover * 0.75 + jaccard * 0.25 + shipBonus)
}

function pickBestTatilsepetiMatch(ourTitle, products) {
  let best = null
  let bestScore = 0
  for (const p of products) {
    const score = titleSimilarity(ourTitle, p.title)
    if (score > bestScore) {
      bestScore = score
      best = p
    }
  }
  if (!best || bestScore < MIN_SCORE) return null
  return { product: best, score: bestScore }
}

async function loadCruiseListings(pg) {
  let sql = `
    SELECT l.id::text AS listing_id, l.slug,
           COALESCE(lt.title, l.slug) AS title,
           COALESCE(jsonb_array_length(la.value_json->'cabins'), 0) AS cabin_count
    FROM listings l
    JOIN product_categories pc ON pc.id = l.category_id AND pc.code = 'cruise'
    LEFT JOIN listing_attributes la
      ON la.listing_id = l.id AND la.group_code = 'vertical_cruise' AND la.key = 'v1'
    LEFT JOIN listing_translations lt ON lt.listing_id = l.id
    WHERE l.status = 'published'
  `
  const params = []
  if (SLUG) {
    params.push(SLUG)
    sql += ` AND l.slug = $${params.length}`
  }
  if (ONLY_EMPTY) {
    sql += ` AND COALESCE(jsonb_array_length(la.value_json->'cabins'), 0) = 0`
  }
  sql += ' ORDER BY l.slug'
  if (LIMIT > 0) sql += ` LIMIT ${LIMIT}`
  const { rows } = await pg.query(sql, params)
  const byId = new Map()
  for (const row of rows) {
    if (!byId.has(row.listing_id)) byId.set(row.listing_id, row)
  }
  return [...byId.values()]
}

async function main() {
  console.log(`Cruise kabin backfill (Tatilsepeti eşleşme) — dry-run=${DRY_RUN}, min-score=${MIN_SCORE}`)

  const pg = createPgClient()
  await pg.connect()

  const ours = await loadCruiseListings(pg)
  console.log(`→ İşlenecek ilan: ${ours.length}`)

  console.log('→ Tatilsepeti katalog çekiliyor…')
  const catalog = await fetchAllTatilsepetiCatalog({
    delayMs: DELAY_MS,
    onPage: (p, total, n) => process.stderr.write(`[tatilsepeti] sayfa ${p}/${total} (${n})\n`),
  })
  console.log(`→ Tatilsepeti: ${catalog.products.length} benzersiz tur`)

  let ok = 0
  let skip = 0
  let fail = 0

  for (let i = 0; i < ours.length; i++) {
    const row = ours[i]
    process.stdout.write(`[${i + 1}/${ours.length}] ${row.slug} … `)

    const hit = pickBestTatilsepetiMatch(row.title, catalog.products)
    if (!hit) {
      skip++
      console.log('eşleşme yok')
      continue
    }

    try {
      const detail = await fetchTourDetail(hit.product)
      const cabinCount = detail.cabins?.length ?? 0
      if (!cabinCount) {
        skip++
        console.log(`ts=${hit.product.tourId} score=${hit.score.toFixed(2)} kabin yok`)
        await sleep(DELAY_MS)
        continue
      }

      if (DRY_RUN) {
        ok++
        console.log(
          `dry-run ts=${hit.product.tourId} score=${hit.score.toFixed(2)} cabins=${cabinCount} program=${detail.programDays?.length ?? 0}`,
        )
        await sleep(DELAY_MS)
        continue
      }

      const res = await patchCruiseListingFromTatilsepetiDetail(pg, row.listing_id, detail)
      ok++
      console.log(
        `ok ts=${hit.product.tourId} score=${hit.score.toFixed(2)} cabins=${res.cabinCount} program=${res.programCount}`,
      )
    } catch (e) {
      fail++
      console.log(`hata: ${e.message}`)
    }
    await sleep(DELAY_MS)
  }

  await pg.end()
  console.log(`\nBitti: ${ok} ok, ${skip} atlandı, ${fail} hata`)
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
