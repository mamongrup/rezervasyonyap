/**
 * bravo_space_dates → listing_availability_calendar (günlük müsaitlik + fiyat override).
 */

/**
 * @param {import('pg').Client} pgClient
 * @param {import('mysql2/promise').Connection} mysql
 * @param {string} listingId
 * @param {number} legacyId
 * @returns {Promise<{ days: number, blocked: number, skipped: boolean }>}
 */
export async function importBravoAvailabilityCalendar(pgClient, mysql, listingId, legacyId) {
  const [dates] = await mysql.query(
    `SELECT DATE(start_date) AS day, active, price
     FROM bravo_space_dates
     WHERE target_id = ?
     ORDER BY start_date`,
    [legacyId],
  )
  if (!dates.length) return { days: 0, blocked: 0, skipped: true }

  await pgClient.query(`DELETE FROM listing_availability_calendar WHERE listing_id = $1::uuid`, [
    listingId,
  ])

  const BATCH = 400
  let inserted = 0
  let blocked = 0
  for (let i = 0; i < dates.length; i += BATCH) {
    const chunk = dates.slice(i, i + BATCH)
    const values = []
    const params = [listingId]
    let p = 2
    for (const d of chunk) {
      const available = Number(d.active) === 1
      if (!available) blocked++
      values.push(`($1::uuid, $${p}::date, $${p + 1}, $${p + 1}, $${p + 1}, $${p + 2})`)
      params.push(d.day, available, d.price != null ? String(d.price) : null)
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
  return { days: inserted, blocked, skipped: false }
}
