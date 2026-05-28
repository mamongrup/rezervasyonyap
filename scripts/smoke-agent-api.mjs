#!/usr/bin/env node
/**
 * Partner API smoke test — yerel veya uzak API.
 *
 *   set AGENT_API_KEY=trk_live_…
 *   set API_ORIGIN=http://127.0.0.1:8080
 *   node scripts/smoke-agent-api.mjs
 */

const origin = (process.env.API_ORIGIN || 'http://127.0.0.1:8080').replace(/\/$/, '')
const key = process.env.AGENT_API_KEY || ''

if (!key.startsWith('trk_live_')) {
  console.error('AGENT_API_KEY (trk_live_…) gerekli')
  process.exit(1)
}

const headers = {
  Authorization: `Bearer ${key}`,
  Accept: 'application/json',
}

async function get(path) {
  const url = `${origin}${path}`
  const res = await fetch(url, { headers })
  const text = await res.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    body = text
  }
  return { url, status: res.status, body }
}

function ok(label, r) {
  const pass = r.status >= 200 && r.status < 300
  console.log(`${pass ? '✓' : '✗'} ${label} → ${r.status} ${r.url}`)
  if (!pass) console.log('  ', r.body)
  return pass
}

let failed = 0

const me = await get('/api/v1/agent/me')
if (!ok('GET /agent/me', me)) failed++
else console.log('  org:', me.body.organization_id, 'scopes:', me.body.scopes?.join(', '))

const cats = await get('/api/v1/agent/catalog/categories')
if (!ok('GET /agent/catalog/categories', cats)) failed++

const search = await get('/api/v1/agent/catalog/search?category_code=holiday_home&limit=3&locale=tr')
if (!ok('GET /agent/catalog/search', search)) failed++
else {
  const first = search.body?.listings?.[0]
  if (first?.id) {
    const detail = await get(`/api/v1/agent/catalog/listings/${encodeURIComponent(first.id)}?locale=tr`)
    if (!ok('GET /agent/catalog/listings/:id', detail)) failed++
  } else {
    console.log('  (arama sonucu boş — detay atlandı)')
  }
}

const openapi = await get('/api/v1/agent/openapi.json')
if (!ok('GET /agent/openapi.json', openapi)) failed++

const resv = await get('/api/v1/agent/reservations')
if (!ok('GET /agent/reservations', resv)) failed++

const bookings = await get('/api/v1/agent/bookings?limit=5')
if (!ok('GET /agent/bookings', bookings)) failed++

if (search.body?.listings?.[0]?.id) {
  const lid = search.body.listings[0].id
  const quoteBody = JSON.stringify({
    starts_on: '2026-06-01',
    ends_on: '2026-06-04',
    quantity: 1,
    meal_plan_code: 'room_only',
  })
  const quoteRes = await fetch(`${origin}/api/v1/agent/catalog/listings/${encodeURIComponent(lid)}/stay-quote`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: quoteBody,
  })
  const quoteText = await quoteRes.text()
  let quoteJson
  try {
    quoteJson = JSON.parse(quoteText)
  } catch {
    quoteJson = quoteText
  }
  const quoteOk = quoteRes.status === 200 || quoteRes.status === 409
  console.log(`${quoteOk ? '✓' : '✗'} POST /agent/catalog/listings/:id/stay-quote → ${quoteRes.status}`)
  if (!quoteOk) {
    console.log('  ', quoteJson)
    failed++
  }
}

if (failed > 0) {
  console.error(`\n${failed} kontrol başarısız`)
  process.exit(1)
}
console.log('\nTüm smoke kontrolleri geçti.')
