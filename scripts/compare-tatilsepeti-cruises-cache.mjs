import fs from 'node:fs'

const ts = JSON.parse(fs.readFileSync('tmp-tatilsepeti-cruise-pages.json', 'utf8'))

function decodeHtml(s) {
  return String(s || '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&')
    .trim()
}

function normalizeTitle(title) {
  return decodeHtml(title)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[’']/g, '')
    .replace(/\d+\s*gece/gi, '')
    .replace(/\d+\s*yıldızlı/gi, '')
    .replace(/^\d+\*/g, '')
    .trim()
}

function baseTitle(title) {
  return normalizeTitle(title)
    .replace(/\s+ile\s+.*$/, (m) => m) // keep route part
    .replace(/\s+\d{1,2}\s+(ocak|subat|şubat|mart|nisan|mayis|mayıs|haziran|temmuz|agustos|ağustos|eylul|eylül|ekim|kasim|kasım|aralik|aralık).*/, '')
    .trim()
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

async function fetchAllOurs() {
  const rows = []
  let offset = 0
  const limit = 100
  let total = Infinity
  while (offset < total) {
    const url = `https://rezervasyonyap.tr/api/v1/catalog/public/listings?category_code=cruise&limit=${limit}&offset=${offset}`
    const r = await fetch(url)
    const j = await r.json()
    total = j.total ?? rows.length
    rows.push(...(j.listings || []))
    offset += limit
    if (!j.listings?.length) break
  }
  return rows
}

function groupTatilsepeti(products) {
  const byBase = new Map()
  for (const p of products) {
    const k = baseTitle(p.title)
    if (!byBase.has(k)) {
      byBase.set(k, {
        baseKey: k,
        title: p.title,
        tourIds: [],
        departures: 0,
        sampleUrl: p.url.split('?')[0],
      })
    }
    const g = byBase.get(k)
    g.tourIds.push(p.tourId)
    g.departures += p.departures || 1
  }
  return [...byBase.values()]
}

const ours = await fetchAllOurs()
const tsGrouped = groupTatilsepeti(ts.products)

const matchedTsBases = new Set()
const matchedOurs = new Set()

for (const g of tsGrouped) {
  let best = null
  let bestScore = 0
  for (const o of ours) {
    const score = titleSimilarity(g.title, o.title)
    if (score > bestScore) {
      bestScore = score
      best = o
    }
  }
  if (best && bestScore >= 0.55) {
    matchedTsBases.add(g.baseKey)
    matchedOurs.add(best.slug)
    g.matched = { slug: best.slug, title: best.title, score: bestScore }
  }
}

const missingGroups = tsGrouped.filter((g) => !matchedTsBases.has(g.baseKey))
const missingOurs = ours.filter((o) => !matchedOurs.has(o.slug))

const report = {
  tatilsepeti: {
    departureProducts: ts.uniqueProducts,
    uniqueTitles: tsGrouped.length,
  },
  ours: { published: ours.length },
  overlap: {
    matchedUniqueTitles: matchedTsBases.size,
    matchedOurListings: matchedOurs.size,
    missingUniqueTitles: missingGroups.length,
    onlyOurs: missingOurs.length,
  },
  missingOnOurs: missingGroups
    .sort((a, b) => a.title.localeCompare(b.title, 'tr'))
    .map((g) => ({
      title: g.title,
      departures: g.departures,
      tourIds: g.tourIds,
      sampleUrl: g.sampleUrl,
    })),
  onlyOnOurs: missingOurs.map((o) => ({ slug: o.slug, title: o.title })),
}

fs.writeFileSync('tmp-tatilsepeti-cruise-audit.json', JSON.stringify(report, null, 2))

console.log('=== Özet (ürün/tur başlığı bazında) ===')
console.log(`Tatilsepeti: ${ts.uniqueProducts} kalkış satırı → ${tsGrouped.length} benzersiz tur başlığı`)
console.log(`Bizde yayında: ${ours.length} kruvaziyer ilanı`)
console.log(`Ortak (başlık eşleşmesi): ${matchedTsBases.size} tur`)
console.log(`Tatilsepeti'de olup bizde yok: ${missingGroups.length} benzersiz tur`)
console.log(`Bizde olup Tatilsepeti'de yok: ${missingOurs.length} ilan`)
console.log('')
console.log('--- Tatilsepeti\'de olup bizde olmayan turlar ---')
for (const g of missingGroups) {
  const dep = g.departures > 1 ? ` (${g.departures} kalkış)` : ''
  console.log(`• ${g.title}${dep}`)
  console.log(`  ${g.sampleUrl}`)
}
