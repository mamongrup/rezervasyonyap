/**
 * Tatilsepeti kültür tur listesi + Gezinomi + yerel katalog karşılaştırması.
 *   node scripts/audit-tatilsepeti-kultur-tours.mjs
 *   node scripts/audit-tatilsepeti-kultur-tours.mjs --json
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPgClient } from './lib/pg-client.mjs'
import {
  KULTUR_REGIONS,
  fetchAllGezinomiKulturTours,
} from './lib/gezinomi-kultur-catalog.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BASE = 'https://www.tatilsepeti.com/kultur-turlari?liste=hepsi'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 TravelAudit/1.0'
const JSON_OUT = process.argv.includes('--json')
const CACHE = path.join(__dirname, '..', 'tmp-tatilsepeti-kultur-pages.json')
const SKIP_GEIZ = process.argv.includes('--skip-gezinomi')

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

async function fetchAllTatilsepeti({ useCache = true } = {}) {
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

async function loadOurTours(pg) {
  const r = await pg.query(`
    SELECT l.id,
           l.slug,
           l.status,
           l.external_provider_code,
           l.external_listing_ref,
           COALESCE(lt.title, l.slug) AS title,
           la.value_json AS tour_attr
    FROM listings l
    JOIN product_categories pc ON pc.id = l.category_id
    LEFT JOIN listing_translations lt ON lt.listing_id = l.id
    JOIN locales lo ON lo.id = lt.locale_id AND lo.code = 'tr'
    LEFT JOIN listing_attributes la ON la.listing_id = l.id
      AND la.group_code = 'vertical_tour' AND la.key = 'v1'
    WHERE pc.code = 'tour'
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
    const attr = row.tour_attr || {}
    const data = attr.data || attr
    if (data.product_id) refs.add(String(data.product_id))
    if (attr.product_id) refs.add(String(attr.product_id))
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
  let gez = { uniqueProducts: 0, byRegion: {} }
  if (!SKIP_GEIZ) {
    if (!JSON_OUT) process.stderr.write('→ Gezinomi kültür katalog çekiliyor…\n')
    const rows = await fetchAllGezinomiKulturTours()
    gez.uniqueProducts = rows.length
    for (const r of KULTUR_REGIONS) gez.byRegion[r.code] = 0
    for (const row of rows) {
      const code = row.tourRegion || 'unknown'
      gez.byRegion[code] = (gez.byRegion[code] || 0) + 1
    }
  }

  const pg = createPgClient()
  await pg.connect()
  try {
    const ours = await loadOurTours(pg)
    const idx = buildOurIndexes(ours)
    const published = ours.filter((r) => r.status === 'published')
    const gezinomiPublished = published.filter((r) => r.external_provider_code === 'gezinomi')

    const missingAny = []
    const matched = []
    for (const p of ts.products) {
      const hit = findOurMatch(p, idx)
      if (!hit) {
        missingAny.push(p)
        continue
      }
      matched.push({ tatilsepeti: p, ours: hit.row, method: hit.method })
    }

    const report = {
      tatilsepeti: {
        totalDepartures: ts.totalDepartures,
        departureRowsScraped: ts.departureRows,
        uniqueProducts: ts.uniqueProducts,
        pages: ts.totalPages,
      },
      gezinomi: gez,
      ours: {
        total: ours.length,
        published: published.length,
        gezinomiPublished: gezinomiPublished.length,
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
      },
      missingCompletely: missingAny.slice(0, 50).map((p) => ({
        tourId: p.tourId,
        title: p.title,
        departures: p.departures,
        url: p.url.split('?')[0],
      })),
    }

    if (JSON_OUT) {
      console.log(JSON.stringify(report, null, 2))
      return
    }

    console.log('=== Tatilsepeti kültür vs Gezinomi vs bizim tur kataloğu ===')
    console.log(`Tatilsepeti: ${ts.totalDepartures} kalkış / ${ts.uniqueProducts} benzersiz ürün`)
    if (!SKIP_GEIZ) {
      console.log(`Gezinomi kültür: ${gez.uniqueProducts} benzersiz ürün`)
      for (const r of KULTUR_REGIONS) {
        console.log(`  ${r.nameTr}: ${gez.byRegion[r.code] || 0}`)
      }
    }
    console.log(`Bizde tour: ${ours.length} toplam, ${published.length} yayında (${gezinomiPublished.length} gezinomi)`)
    console.log(`Tatilsepeti eşleşen: ${matched.length}, tamamen eksik: ${missingAny.length}`)
  } finally {
    await pg.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
