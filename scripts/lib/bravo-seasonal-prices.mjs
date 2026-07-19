/**
 * bravo_space_dates → listing_price_rules (valid_from, valid_to, gecelik, haftalık).
 */

/** @param {string | Date} d */
export function toYmd(d) {
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10)
  const dt = d instanceof Date ? d : new Date(d)
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const day = String(dt.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** @param {string} ymd */
export function addDaysYmd(ymd, n) {
  const dt = new Date(`${ymd}T12:00:00`)
  dt.setDate(dt.getDate() + n)
  return toYmd(dt)
}

/**
 * Ardışık günler + aynı fiyat → dönem bantları.
 * Aynı fiyatta gün atlanırsa (rezervasyon / müsait değil) bandı BÖLMEZ —
 * sezon satırı fiyat değişene kadar devam eder.
 * @param {{ day: unknown, price: unknown }[]} rows — tarih sıralı
 * @param {{ splitOnGaps?: boolean }} [opts] — splitOnGaps:true eski davranış (gap’te böl)
 */
export function compressBravoDateBands(rows, opts = {}) {
  const splitOnGaps = opts.splitOnGaps === true
  const bands = []
  /** @type {{ price: number, from: string, to: string } | null} */
  let cur = null

  for (const row of rows) {
    const price = Number(row.price)
    if (!Number.isFinite(price) || price <= 0) continue
    const day = toYmd(row.day)

    const priceChanged = !cur || cur.price !== price
    const gapBreak =
      splitOnGaps && cur && addDaysYmd(cur.to, 1) !== day

    if (!cur || priceChanged || gapBreak) {
      if (cur) bands.push(cur)
      cur = { price, from: day, to: day }
    } else {
      // Aynı fiyat: gap olsa bile to’yu ileri al (rezervasyon ara satır açmaz)
      if (day > cur.to) cur.to = day
    }
  }
  if (cur) bands.push(cur)
  return bands
}

/**
 * @param {{ price: number, from: string, to: string }} band
 * @param {{ minNights?: string | number | null, label?: string }} opts
 */
export function buildSeasonalRuleJson(band, opts = {}) {
  const nightly = band.price
  const weekly = nightly * 7
  const obj = {
    base_nightly: formatMoney(nightly),
    weekly_total: formatMoney(weekly),
    weekend_nightly: '',
  }
  if (opts.label != null && String(opts.label).trim()) {
    obj.label = String(opts.label).trim()
  }
  if (opts.minNights != null && String(opts.minNights).trim() !== '') {
    obj.min_nights = String(opts.minNights).trim()
  }
  return obj
}

function formatMoney(n) {
  const rounded = Math.round(n * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2)
}

/**
 * @param {import('pg').Client} pgClient
 * @param {import('mysql2/promise').Connection} mysql
 * @param {string} listingId
 * @param {number} legacyId
 * @param {{ min_day_stays?: unknown }} space
 */
export async function importBravoSeasonalPriceRules(pgClient, mysql, listingId, legacyId, space = {}) {
  const [dates] = await mysql.query(
    `SELECT DATE(start_date) AS day, price
     FROM bravo_space_dates
     WHERE target_id = ?
       AND start_date >= DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01')
     ORDER BY start_date`,
    [legacyId],
  )

  await pgClient.query(`DELETE FROM listing_price_rules WHERE listing_id = $1::uuid`, [listingId])

  if (!dates.length) return { periods: 0, skipped: true }

  const bands = compressBravoDateBands(dates)
  if (!bands.length) return { periods: 0, skipped: true }

  const minNights = space.min_day_stays != null ? String(space.min_day_stays) : ''
  let i = 0
  for (const band of bands) {
    i += 1
    const ruleJson = buildSeasonalRuleJson(band, {
      minNights: i === 1 ? minNights : '',
    })
    await pgClient.query(
      `INSERT INTO listing_price_rules (listing_id, rule_json, valid_from, valid_to)
       VALUES ($1::uuid, $2::jsonb, $3::date, $4::date)`,
      [listingId, JSON.stringify(ruleJson), band.from, band.to],
    )
  }
  return { periods: bands.length, skipped: false }
}
