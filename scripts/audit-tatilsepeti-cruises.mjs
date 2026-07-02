/**
 * Tatilsepeti gemi/cruise listesi ile yerel katalog karşılaştırması.
 *   node scripts/audit-tatilsepeti-cruises.mjs
 *   node scripts/audit-tatilsepeti-cruises.mjs --json
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPgClient } from './lib/pg-client.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BASE = 'https://www.tatilsepeti.com/gemi-cruise-turlari?liste=hepsi'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 TravelAudit/1.0'
const JSON_OUT = process.argv.includes('--json')
const CACHE = path.join(__dirname, '..', 'tmp-tatilsepeti-cruise-pages.json')

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function decodeHtml(s) {
  return String(s || '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .trim()
}

function normalizeTitle(title) {
  return decodeHtml(title)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[’']/g, '')
    .replace(/\d{1,2}\s+(ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık)\s*[-–]\s*\d{1,2}\s+(ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|ekim|kasım|aralık)\s*\d{4}/gi, '')
    .replace(/\d+\s*gece/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function slugFromHref(href) {
  const m = String(href).match(/^\/([^?]+)/)
  return m ? m[1] : href
}

function parseTatilsepetiPage(html, pageUrl) {
  const tours = []
  const articleRe = /<article>([\s\S]*?)<\/article>/gi
  let m
  while ((m = articleRe.exec(html))) {
    const block = m[1]
    const idM = block.match(/data-tourid="(\d+)"/)
    const nameM = block.match(/data-tourname="([^"]+)"/)
    const hrefM = block.match(/panel-heading-inside[\s\S]*?href="([^"]+)"/)
    if (!idM || !nameM) continue
    const href = hrefM ? hrefM[1] : ''
    tours.push({
      tourId: idM[1],
      title: decodeHtml(nameM[1]),
      slug: slugFromHref(href),
      url: href.startsWith('http') ? href : `https://www.tatilsepeti.com${href}`,
      pageUrl,
    })
  }
  return tours
}

function parseTotalPages(html) {
  const last = html.match(/PagedList-skipToLast"><a href="[^"]*sayfa=(\d+)/)
  if (last) return Number(last[1])
  const count = (html.match(/sayfa=\d+/g) || []).map((x) => Number(x.replace('sayfa=', '')))
  return count.length ? Math.max(...count) : 1
}

function parseTotalDepartures(html) {
  const m = html.match(/id="totalTourCount">(\d+)/)
  return m ? Number(m[1]) : null
}

async function fetchPage(page) {
  const url = page <= 1 ? BASE : `${BASE}&sayfa=${page}`
  const r = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`)
  return { url, html: await r.text() }
}

async function fetchAllTatilsepeti({ useCache = false } = {}) {
  if (useCache && fs.existsSync(CACHE)) {
    return JSON.parse(fs.readFileSync(CACHE, 'utf8'))
  }

  const first = await fetchPage(1)
  const totalPages = parseTotalPages(first.html)
  const totalDepartures = parseTotalDepartures(first.html)
  const all = [...parseTatilsepetiPage(first.html, first.url)]

  for (let p = 2; p <= totalPages; p++) {
    await sleep(350)
    const { url, html } = await fetchPage(p)
    all.push(...parseTatilsepetiPage(html, url))
    if (!JSON_OUT) process.stderr.write(`[tatilsepeti] sayfa ${p}/${totalPages}\n`)
  }

  const byId = new Map()
  for (const t of all) {
    if (!byId.has(t.tourId)) byId.set(t.tourId, { ...t, departures: 0 })
    byId.get(t.tourId).departures += 1
  }

  const payload = {
    fetchedAt: new Date().toISOString(),
    totalPages,
    totalDepartures,
    departureRows: all.length,
    uniqueProducts: byId.size,
    products: [...byId.values()].sort((a, b) => a.title.localeCompare(b.title, 'tr')),
  }
  fs.writeFileSync(CACHE, JSON.stringify(payload, null, 2))
  return payload
}

function tokenSet(s) {
  return new Set(
    normalizeTitle(s)
      .split(/[^a-z0-9çğıöşü]+/i)
      .filter((w) => w.length > 2),
  )
}

function titleSimilarity(a, b) {
  const ta = tokenSet(a)
  const tb = tokenSet(b)
  if (!ta.size || !tb.size) return 0
  let inter = 0
  for (const w of ta) if (tb.has(w)) inter++
  return inter / Math.max(ta.size, tb.size)
}

async function loadOurCruises(pg) {
  const r = await pg.query(`
    SELECT l.id,
           l.slug,
           l.status,
           l.external_provider_code,
           l.external_listing_ref,
           COALESCE(lt.title, l.slug) AS title,
           lcd.external_cruise_ref,
           lcd.cruise_line,
           lcd.ship_name,
           lcd.meta_json
    FROM listings l
    JOIN product_categories pc ON pc.id = l.category_id
    LEFT JOIN listing_translations lt ON lt.listing_id = l.id AND lt.locale = 'tr'
    LEFT JOIN listing_cruise_details lcd ON lcd.listing_id = l.id
    WHERE pc.code = 'cruise'
    ORDER BY l.status, lt.title NULLS LAST
  `)
  return r.rows
}

function buildOurIndexes(rows) {
  const byRef = new Map()
  const byTitle = []
  for (const row of rows) {
    const refs = new Set()
    if (row.external_listing_ref) refs.add(String(row.external_listing_ref))
    if (row.external_cruise_ref) refs.add(String(row.external_cruise_ref))
    const meta = row.meta_json || {}
    if (meta.product_id) refs.add(String(meta.product_id))
    if (meta.wtatil_tour_id) refs.add(String(meta.wtatil_tour_id))
    for (const ref of refs) {
      if (!byRef.has(ref)) byRef.set(ref, [])
      byRef.get(ref).push(row)
    }
    byTitle.push(row)
  }
  return { byRef, byTitle, rows }
}

function findOurMatch(ts, ours) {
  const direct = ours.byRef.get(String(ts.tourId))
  if (direct?.length) return { row: direct[0], method: 'id' }

  let best = null
  let bestScore = 0
  for (const row of ours.byTitle) {
    const score = titleSimilarity(ts.title, row.title)
    if (score > bestScore) {
      bestScore = score
      best = row
    }
  }
  if (best && bestScore >= 0.55) return { row: best, method: `title:${bestScore.toFixed(2)}` }
  return null
}

async function main() {
  const ts = await fetchAllTatilsepeti()
  const pg = createPgClient()
  await pg.connect()
  try {
    const ours = await loadOurCruises(pg)
    const idx = buildOurIndexes(ours)

    const published = ours.filter((r) => r.status === 'published')
    const missingPublished = []
    const missingAny = []
    const matched = []

    for (const p of ts.products) {
      const hit = findOurMatch(p, idx)
      if (!hit) {
        missingAny.push(p)
        missingPublished.push(p)
        continue
      }
      matched.push({ tatilsepeti: p, ours: hit.row, method: hit.method })
      if (hit.row.status !== 'published') missingPublished.push({ ...p, draftMatch: hit.row.slug })
    }

    const report = {
      tatilsepeti: {
        totalDepartures: ts.totalDepartures,
        departureRowsScraped: ts.departureRows,
        uniqueProducts: ts.uniqueProducts,
        pages: ts.totalPages,
      },
      ours: {
        total: ours.length,
        published: published.length,
        draftOrOther: ours.length - published.length,
        byProvider: Object.fromEntries(
          [...ours.reduce((m, r) => {
            const k = r.external_provider_code || 'manual'
            m.set(k, (m.get(k) || 0) + 1)
            return m
          }, new Map())].sort((a, b) => b[1] - a[1]),
        ),
      },
      match: {
        matchedProducts: matched.length,
        missingCompletely: missingAny.length,
        missingPublishedOnly: missingPublished.filter((x) => !x.draftMatch).length,
        draftOnlyMatches: missingPublished.filter((x) => x.draftMatch).length,
      },
      missingCompletely: missingAny.map((p) => ({
        tourId: p.tourId,
        title: p.title,
        departures: p.departures,
        url: p.url.split('?')[0],
      })),
      draftOnly: missingPublished
        .filter((x) => x.draftMatch)
        .map((p) => ({
          tourId: p.tourId,
          title: p.title,
          ourSlug: p.draftMatch,
          url: p.url.split('?')[0],
        })),
    }

    if (JSON_OUT) {
      console.log(JSON.stringify(report, null, 2))
      return
    }

    console.log('=== Tatilsepeti vs bizim kruvaziyer kataloğu ===')
    console.log(`Tatilsepeti: ${ts.totalDepartures} kalkış / ${ts.uniqueProducts} benzersiz ürün (${ts.totalPages} sayfa)`)
    console.log(`Bizde cruise: ${ours.length} toplam, ${published.length} yayında`)
    console.log(`Eşleşen ürün: ${matched.length}`)
    console.log(`Tamamen eksik: ${missingAny.length}`)
    console.log(`Taslakta var, yayında yok: ${report.match.draftOnlyMatches}`)
    console.log('')
    if (missingAny.length) {
      console.log('--- Tatilsepeti\'de olup bizde hiç olmayanlar ---')
      for (const p of report.missingCompletely.slice(0, 40)) {
        console.log(`  [${p.tourId}] ${p.title} (${p.departures} kalkış)`)
        console.log(`    ${p.url}`)
      }
      if (missingAny.length > 40) console.log(`  ... +${missingAny.length - 40} daha`)
    }
    if (report.draftOnly.length) {
      console.log('')
      console.log('--- Bizde taslak, Tatilsepeti\'de yayında ---')
      for (const p of report.draftOnly.slice(0, 20)) {
        console.log(`  [${p.tourId}] ${p.title} → ${p.ourSlug}`)
      }
      if (report.draftOnly.length > 20) console.log(`  ... +${report.draftOnly.length - 20} daha`)
    }
  } finally {
    await pg.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
