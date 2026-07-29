/**
 * bravo_space_dates → listing_availability_calendar (günlük müsaitlik + fiyat override).
 *
 * Eski Bravo/Excalibur takviminde kapalı günler 1 gün kısa tutuluyordu
 * (ör. 15–19 kapalı → gerçekte 15–20 / çıkış sabahı 20 olmalı).
 * `extendBravoInactiveBlocksByOneDay` bu eksik günü kapatır; ardından turnover
 * yarım-gün sınırlarını (giriş ÖS / çıkış ÖÖ) açar.
 */

/**
 * @param {import('pg').Client} pgClient
 * @param {import('mysql2/promise').Connection} mysql
 * @param {string} listingId
 * @param {number} legacyId
 * @returns {Promise<{ days: number, blocked: number, skipped: boolean }>}
 */
function dayKey(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value ?? '').slice(0, 10)
}

function nextDayKey(value) {
  const date = new Date(`${dayKey(value)}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

/**
 * 2+ günlük kesintisiz `active=0` bloğunun sonuna 1 gün daha kapatır.
 * Tek günlük bakım bloklarına dokunmaz.
 *
 * @param {Array<{ day: unknown, active: unknown, price?: unknown }>} dates
 */
export function extendBravoInactiveBlocksByOneDay(dates) {
  const out = dates.map((d) => ({ ...d }))
  /** @type {number[]} */
  const multiDayEnds = []
  let i = 0
  while (i < out.length) {
    if (Number(out[i].active) === 1) {
      i += 1
      continue
    }
    let j = i
    while (
      j + 1 < out.length &&
      Number(out[j + 1].active) !== 1 &&
      dayKey(out[j + 1].day) === nextDayKey(out[j].day)
    ) {
      j += 1
    }
    if (j > i) multiDayEnds.push(j)
    i = j + 1
  }

  // Sondan uygula — splice indeksleri bozmasın
  for (const j of multiDayEnds.reverse()) {
    const end = out[j]
    const want = nextDayKey(end.day)
    const next = out[j + 1]
    if (next && dayKey(next.day) === want) {
      if (Number(next.active) === 1) {
        out[j + 1] = { ...next, active: 0 }
      }
      continue
    }
    out.splice(j + 1, 0, {
      day: want,
      active: 0,
      price: end.price ?? null,
    })
  }
  return out
}

/**
 * Bravo yalnızca tam-gün `active` tutar. İki açık gün arasındaki 2+ günlük dolu
 * blokları rezervasyon kabul edip giriş/çıkış sınırlarını yarım gün olarak açar.
 */
export function applyBravoTurnoverBoundaries(dates) {
  const out = dates.map((d) => {
    const available = Number(d.active) === 1
    return { ...d, amAvailable: available, pmAvailable: available }
  })

  let i = 0
  while (i < out.length) {
    if (out[i].amAvailable || out[i].pmAvailable) {
      i += 1
      continue
    }

    let j = i
    while (
      j + 1 < out.length &&
      !out[j + 1].amAvailable &&
      !out[j + 1].pmAvailable &&
      dayKey(out[j + 1].day) === nextDayKey(out[j].day)
    ) {
      j += 1
    }

    const previous = i > 0 ? out[i - 1] : undefined
    const next = j + 1 < out.length ? out[j + 1] : undefined
    const previousOpen = previous?.amAvailable || previous?.pmAvailable
    const nextOpen = next?.amAvailable || next?.pmAvailable
    const boundedByKnownDays =
      previous &&
      next &&
      dayKey(out[i].day) === nextDayKey(previous.day) &&
      dayKey(next.day) === nextDayKey(out[j].day)

    if (j > i && boundedByKnownDays && previousOpen && nextOpen) {
      out[i].amAvailable = true
      out[j].pmAvailable = true
    }
    i = j + 1
  }

  return out
}

/** Kaynak satırları: +1 gün kapat → turnover yarım günleri. */
export function prepareBravoCalendarDays(sourceDates) {
  return applyBravoTurnoverBoundaries(extendBravoInactiveBlocksByOneDay(sourceDates))
}

export async function importBravoAvailabilityCalendar(pgClient, mysql, listingId, legacyId) {
  const [sourceDates] = await mysql.query(
    `SELECT DATE(start_date) AS day, active, price
     FROM bravo_space_dates
     WHERE target_id = ?
       AND start_date >= DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01')
     ORDER BY start_date`,
    [legacyId],
  )
  await pgClient.query(`DELETE FROM listing_availability_calendar WHERE listing_id = $1::uuid`, [
    listingId,
  ])

  if (!sourceDates.length) return { days: 0, blocked: 0, skipped: true }

  const dates = prepareBravoCalendarDays(sourceDates)

  const BATCH = 400
  let inserted = 0
  let blocked = 0
  for (let i = 0; i < dates.length; i += BATCH) {
    const chunk = dates.slice(i, i + BATCH)
    const values = []
    const params = [listingId]
    let p = 2
    for (const d of chunk) {
      if (Number(d.active) !== 1) blocked++
      values.push(
        `($1::uuid, $${p}::date, ($${p + 1}::boolean OR $${p + 2}::boolean), $${p + 1}::boolean, $${p + 2}::boolean, $${p + 3})`,
      )
      params.push(
        d.day,
        d.amAvailable,
        d.pmAvailable,
        d.price != null ? String(d.price) : null,
      )
      p += 4
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
