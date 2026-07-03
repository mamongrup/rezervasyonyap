/**
 * Akdeniz Villam RSC gömülü availabilitys_data → listing_availability_calendar.
 */

function sliceRscSection(html, startKey, endKeys) {
  const start = html.indexOf(startKey)
  if (start < 0) return ''
  let end = html.length
  for (const k of endKeys) {
    const i = html.indexOf(k, start + startKey.length)
    if (i >= 0 && i < end) end = i
  }
  return html.slice(start, end)
}

/**
 * @param {string} html
 * @returns {{ check_in: string, check_out: string }[]}
 */
export function parseAvailabilityBookings(html) {
  const chunk = sliceRscSection(html, 'availabilitys_data', [
    'total_price',
    'short_term_data',
    'set_currency',
    'prices_data',
  ])
  if (!chunk) return []

  const seen = new Set()
  const bookings = []
  for (const m of chunk.matchAll(
    /\\"check_in\\":\\"(\d{4}-\d{2}-\d{2})\\"[\s\S]*?\\"check_out\\":\\"(\d{4}-\d{2}-\d{2})\\"/g,
  )) {
    const key = `${m[1]}|${m[2]}`
    if (seen.has(key)) continue
    seen.add(key)
    bookings.push({ check_in: m[1], check_out: m[2] })
  }
  return bookings
}

function addDays(iso, delta) {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

function* iterateDays(from, to) {
  let day = from
  while (day <= to) {
    yield day
    day = addDays(day, 1)
  }
}

function isBlocked(day, bookings) {
  for (const b of bookings) {
    if (day >= b.check_in && day < b.check_out) return true
  }
  return false
}

function priceForDay(day, seasonalPrices) {
  for (const band of seasonalPrices) {
    if (day >= band.from && day <= band.to) return band.baseNightly
  }
  return null
}

/**
 * @param {{ from: string, to: string, baseNightly: number }[]} seasonalPrices
 * @param {{ check_in: string, check_out: string }[]} bookings
 * @returns {{ day: string, is_available: boolean, price_override: number }[]}
 */
export function buildCalendarDays(seasonalPrices, bookings = []) {
  if (!seasonalPrices?.length) return []

  const from = seasonalPrices.reduce((min, b) => (b.from < min ? b.from : min), seasonalPrices[0].from)
  const to = seasonalPrices.reduce((max, b) => (b.to > max ? b.to : max), seasonalPrices[0].to)

  const days = []
  for (const day of iterateDays(from, to)) {
    const price = priceForDay(day, seasonalPrices)
    if (price == null) continue
    days.push({
      day,
      is_available: !isBlocked(day, bookings),
      price_override: price,
    })
  }
  return days
}

/**
 * @param {import('pg').Client} pgClient
 * @param {string} listingId
 * @param {{ day: string, is_available: boolean, price_override: number | null }[]} days
 */
export async function upsertAvailabilityCalendar(pgClient, listingId, days) {
  await pgClient.query(`DELETE FROM listing_availability_calendar WHERE listing_id = $1::uuid`, [listingId])
  if (!days.length) return { days: 0, blocked: 0 }

  const BATCH = 400
  let inserted = 0
  let blocked = 0
  for (let i = 0; i < days.length; i += BATCH) {
    const chunk = days.slice(i, i + BATCH)
    const values = []
    const params = [listingId]
    let p = 2
    for (const d of chunk) {
      const available = d.is_available !== false
      if (!available) blocked++
      values.push(`($1::uuid, $${p}::date, $${p + 1}, $${p + 1}, $${p + 1}, $${p + 2})`)
      params.push(d.day, available, d.price_override != null ? String(d.price_override) : null)
      p += 3
      inserted++
    }
    await pgClient.query(
      `INSERT INTO listing_availability_calendar (listing_id, day, is_available, am_available, pm_available, price_override)
       VALUES ${values.join(', ')}
       ON CONFLICT (listing_id, day) DO UPDATE SET
         is_available = EXCLUDED.is_available,
         am_available = EXCLUDED.am_available,
         pm_available = EXCLUDED.pm_available,
         price_override = EXCLUDED.price_override`,
      params,
    )
  }
  return { days: inserted, blocked }
}
