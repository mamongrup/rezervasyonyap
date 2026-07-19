/**
 * Villasepeti villa sayfası → fiyat + uygunluk (GraphQL, Playwright).
 */
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { compressBravoDateBands, buildSeasonalRuleJson } from './bravo-seasonal-prices.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function loadPlaywright() {
  const roots = [
    path.join(__dirname, '..', '..', 'frontend'),
    path.join(__dirname, '..'),
  ]
  let last
  for (const root of roots) {
    try {
      return createRequire(path.join(root, 'package.json'))('playwright')
    } catch (e) {
      last = e
    }
  }
  throw new Error(
    `playwright bulunamadı — cd frontend && npx playwright install chromium. ${last?.message || ''}`,
  )
}

function addDaysYmd(ymd, n) {
  const d = new Date(`${ymd}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function* iterateDays(from, to) {
  let day = from
  while (day <= to) {
    yield day
    day = addDaysYmd(day, 1)
  }
}

function parseDepositFromHtml(html) {
  const m =
    String(html || '').match(/([\d.]+)\s*₺[^<]{0,80}hasar\s*depozito/i) ||
    String(html || '').match(/hasar\s*depozito[^<]{0,80}([\d.]+)\s*₺/i)
  if (!m) return null
  const n = Number(String(m[1]).replace(/\./g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

function parseMinistryLicense(html) {
  const m = String(html || '').match(/Belge\s*Numaras[ıi]\s*:\s*([0-9\-]+)/i)
  return m ? m[1].trim() : ''
}

function extractHomeId(text) {
  const s = String(text || '')
  const m =
    s.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_TRY/i) ||
    s.match(/"id"\s*:\s*"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})"/i)
  return m ? m[1] : null
}

function currentMinStay(rules = [], onDate = new Date().toISOString().slice(0, 10)) {
  for (const r of rules) {
    const period = String(r.period || '')
    const m = period.match(/\[(\d{4}-\d{2}-\d{2}),(\d{4}-\d{2}-\d{2})\)/)
    if (!m) continue
    if (onDate >= m[1] && onDate < m[2]) return Number(r.minRentalDays) || null
  }
  const upcoming = rules
    .map((r) => {
      const m = String(r.period || '').match(/\[(\d{4}-\d{2}-\d{2}),(\d{4}-\d{2}-\d{2})\)/)
      if (!m) return null
      return { from: m[1], min: Number(r.minRentalDays) || null }
    })
    .filter((x) => x && x.from >= onDate)
    .sort((a, b) => a.from.localeCompare(b.from))
  return upcoming[0]?.min || 3
}

/**
 * @param {string} pageUrl
 */
export async function scrapeVillasepetiListing(pageUrl) {
  const { chromium } = loadPlaywright()
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  try {
    const page = await (
      await browser.newContext({
        locale: 'tr-TR',
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      })
    ).newPage()

    /** @type {string | null} */
    let homeId = null
    page.on('request', (req) => {
      if (!/graphql/i.test(req.url())) return
      const post = req.postData() || ''
      const id = extractHomeId(post)
      if (id) homeId = id
    })
    page.on('response', async (res) => {
      try {
        if (!/graphql/i.test(res.url()) || res.status() !== 200) return
        const post = res.request().postData() || ''
        const id = extractHomeId(post)
        if (id) homeId = id
      } catch {
        /* ignore */
      }
    })

    await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 })
    for (let i = 0; i < 40 && !homeId; i++) await page.waitForTimeout(250)
    const html = await page.content()
    if (!homeId) homeId = extractHomeId(html)
    if (!homeId) throw new Error(`Villasepeti homeId bulunamadı: ${pageUrl}`)

    const payload = await page.evaluate(async (HOME_ID) => {
      async function gql(body) {
        const r = await fetch('/api/graphql', {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify(body),
        })
        const json = await r.json()
        if (!r.ok || json.errors) {
          throw new Error(`GraphQL ${r.status}: ${JSON.stringify(json.errors || json).slice(0, 300)}`)
        }
        return json.data
      }
      const prices = await gql({
        operationName: 'HomePricesByPk',
        variables: { id: `${HOME_ID}_TRY` },
        query: `query HomePricesByPk($id: String!) { homePricesByPk(id: $id) { value } }`,
      })
      const home = await gql({
        operationName: 'GetHomesByPk',
        variables: { id: HOME_ID },
        query: `query GetHomesByPk($id: uuid!) {
          homesByPk(id: $id) {
            calendars {
              reservationRulesView { minRentalDays minRentalDaysForFreeCleaning period maxGapDays }
              availableDays(limit: 800, orderBy: { date: ASC }) {
                date vsPrice discountedVsPrice
              }
              discounts { date vsDiscount }
            }
          }
        }`,
      })
      return { prices, home }
    }, homeId)

    const availableDays = payload.home?.homesByPk?.calendars?.[0]?.availableDays || []
    const rules = payload.home?.homesByPk?.calendars?.[0]?.reservationRulesView || []
    if (!availableDays.length) throw new Error('Villasepeti availableDays boş')

    const dayRows = availableDays
      .map((d) => ({
        day: String(d.date).slice(0, 10),
        price: Number(d.discountedVsPrice ?? d.vsPrice),
        listPrice: Number(d.vsPrice),
      }))
      .filter((d) => Number.isFinite(d.price) && d.price > 0)

    const fromAvail = dayRows[0].day
    const toAvail = dayRows[dayRows.length - 1].day
    // Ay başına/sonuna genişlet — rezervasyonlu günler de sezon fiyatına dahil
    const from = `${fromAvail.slice(0, 8)}01`
    const toY = Number(toAvail.slice(0, 4))
    const toM = Number(toAvail.slice(5, 7))
    const toLast = new Date(Date.UTC(toY, toM, 0)).getUTCDate()
    const to = `${toAvail.slice(0, 8)}${String(toLast).padStart(2, '0')}`
    const byDay = new Map(dayRows.map((d) => [d.day, d]))

    /** Boş (rezervasyon) gün: aynı ay içindeki en yakın fiyatlı güne bak */
    function priceForGapDay(day) {
      const month = day.slice(0, 7)
      let best = null
      let bestDist = Infinity
      for (const row of dayRows) {
        if (row.day.slice(0, 7) !== month) continue
        const dist = Math.abs(
          (new Date(`${day}T12:00:00Z`).getTime() - new Date(`${row.day}T12:00:00Z`).getTime()) /
            86400000,
        )
        if (dist < bestDist) {
          bestDist = dist
          best = row.price
        }
      }
      return best
    }

    const calendarDays = []
    const pricedForBands = []
    for (const day of iterateDays(from, to)) {
      const hit = byDay.get(day)
      if (hit) {
        calendarDays.push({ day, is_available: true, price_override: hit.price })
        pricedForBands.push({ day, price: hit.price })
      } else {
        const filled = priceForGapDay(day)
        calendarDays.push({ day, is_available: false, price_override: filled })
        if (filled != null) pricedForBands.push({ day, price: filled })
      }
    }

    const bands = compressBravoDateBands(pricedForBands).map((b) => ({
      from: b.from,
      to: b.to,
      baseNightly: b.price,
    }))

    const minPrice = dayRows.reduce((m, d) => (m == null || d.price < m ? d.price : m), null)
    const maxPrice = dayRows.reduce((m, d) => (m == null || d.price > m ? d.price : m), null)
    const deposit = parseDepositFromHtml(html) || 50000
    const license = parseMinistryLicense(html)
    const minStay = currentMinStay(rules, from) || 3

    return {
      sourceUrl: pageUrl.split('?')[0],
      homeId,
      deposit,
      ministryLicense: license,
      minStayNights: minStay,
      reservationRules: rules,
      seasonalPrices: bands,
      calendarDays,
      availableCount: dayRows.length,
      blockedCount: calendarDays.filter((d) => !d.is_available).length,
      minPrice,
      maxPrice,
      currency: 'TRY',
      rawPriceValue: payload.prices?.homePricesByPk?.value || null,
    }
  } finally {
    await browser.close()
  }
}

export function seasonalRulesForDb(pkg) {
  return (pkg.seasonalPrices || []).map((band, i) => ({
    ...band,
    ruleJson: buildSeasonalRuleJson(
      { price: band.baseNightly, from: band.from, to: band.to },
      { minNights: i === 0 ? String(pkg.minStayNights || '') : '' },
    ),
  }))
}
