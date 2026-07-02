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
    .replace(/[’'*]/g, '')
    .replace(/\d+\s*yıldızlı/gi, '')
    .replace(/\d+\s*yildizli/gi, '')
    .replace(/\bncl\b/g, 'norwegian')
    .replace(/\s+ile\b/g, ' ile')
    .replace(/\s+/g, ' ')
    .trim()
}

function shipKey(title) {
  const n = normalizeTitle(title)
  const m =
    n.match(/(?:^|ile\s+)([a-z0-9][a-z0-9\s.'-]{2,40}?)\s+ile\b/) ||
    n.match(/\b(amadeus\s+\w+|msc\s+\w+|costa\s+\w+|celebrity\s+\w+|norwegian\s+\w+|brilliance[^,]*|harmony[^,]*|odyssey[^,]*)/)
  return m ? m[1].replace(/\s+/g, ' ').trim() : n.slice(0, 40)
}

function tokenSet(s) {
  return new Set(
    normalizeTitle(s)
      .split(/[^a-z0-9çğıöşü]+/i)
      .filter((w) => w.length > 2 && !['ile', 'turu', 'turlari', 'gece', 'hareketli', 'varisli', 'varışlı'].includes(w)),
  )
}

function titleSimilarity(a, b) {
  const ta = tokenSet(a)
  const tb = tokenSet(b)
  if (!ta.size || !tb.size) return 0
  let inter = 0
  for (const w of ta) if (tb.has(w)) inter++
  const jaccard = inter / new Set([...ta, ...tb]).size
  const cover = inter / Math.max(ta.size, tb.size)
  const shipBonus = shipKey(a) && shipKey(b) && shipKey(a) === shipKey(b) ? 0.15 : 0
  return Math.min(1, cover * 0.75 + jaccard * 0.25 + shipBonus)
}

function groupTatilsepeti(products) {
  const byBase = new Map()
  for (const p of products) {
    const k = shipKey(p.title) + '|' + normalizeTitle(p.title).replace(/,\s*\d.*$/, '')
    if (!byBase.has(k)) {
      byBase.set(k, { title: p.title, tourIds: [], sampleUrl: p.url.split('?')[0] })
    }
    const g = byBase.get(k)
    g.tourIds.push(p.tourId)
  }
  return [...byBase.values()]
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

const ours = await fetchAllOurs()
const tsGrouped = groupTatilsepeti(ts.products)

const matched = []
const missing = []

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
  if (best && bestScore >= 0.42) matched.push({ ts: g, ours: best, score: bestScore })
  else missing.push(g)
}

console.log('Gelişmiş eşleştirme:')
console.log('Tatilsepeti gruplu:', tsGrouped.length)
console.log('Bizde:', ours.length)
console.log('Eşleşen:', matched.length)
console.log('Gerçek eksik:', missing.length)
console.log('')
console.log('Gerçek eksik örnekler (ilk 25):')
for (const g of missing.slice(0, 25)) {
  console.log('•', g.title)
  console.log(' ', g.sampleUrl)
}

fs.writeFileSync(
  'tmp-tatilsepeti-cruise-audit-v2.json',
  JSON.stringify({ matched: matched.length, missing: missing.length, missingList: missing }, null, 2),
)
