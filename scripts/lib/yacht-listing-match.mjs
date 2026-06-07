import { stripYachtTypeFromTitle } from './yacht-title-tr.mjs'

export function normalizeYachtNameKey(title) {
  return stripYachtTypeFromTitle(title)
    .replace(/^#\d+,?\s*/i, '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function parseIntMeta(raw) {
  const m = String(raw ?? '').match(/(\d+)/)
  if (!m) return null
  const n = parseInt(m[1], 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

/**
 * Mevcut yacht_charter ilanı — isim + kapasite ile eşleştir.
 */
export async function findMatchingYachtListing(pgClient, orgId, { title, pax, cabinCount }) {
  const key = normalizeYachtNameKey(title)
  if (!key || key.length < 2) return null

  const { rows } = await pgClient.query(
    `SELECT l.id::text, l.slug, lt.title, la.value_json AS meta,
            l.external_provider_code, l.external_listing_ref
     FROM listings l
     JOIN product_categories pc ON pc.id = l.category_id AND pc.code = 'yacht_charter'
     JOIN listing_translations lt ON lt.listing_id = l.id
       AND lt.locale_id = (SELECT id FROM locales WHERE code = 'tr' AND is_active = true LIMIT 1)
     LEFT JOIN listing_attributes la ON la.listing_id = l.id
       AND la.group_code = 'listing_meta' AND la.key = 'v1'
     WHERE l.organization_id = $1::uuid`,
    [orgId],
  )

  let best = null
  let bestScore = 0
  for (const row of rows) {
    const rowKey = normalizeYachtNameKey(row.title)
    if (!rowKey) continue

    let score = 0
    if (rowKey === key) score = 90
    else if (rowKey.includes(key) || key.includes(rowKey)) score = 70
    else {
      const qTokens = key.split(' ').filter((t) => t.length >= 1)
      const rTokens = rowKey.split(' ').filter((t) => t.length >= 1)
      const rSet = new Set(rTokens)
      const qSet = new Set(qTokens)
      const onlyQ = qTokens.filter((t) => !rSet.has(t))
      const onlyR = rTokens.filter((t) => !qSet.has(t))
      // "Albatros Q" ≠ "Albatros M" — her iki tarafta da ayırt edici token varsa eşleştirme.
      if (onlyQ.length && onlyR.length) continue
      const overlap = qTokens.filter((t) => rSet.has(t)).length
      if (!qTokens.length || overlap < Math.ceil(qTokens.length * 0.7)) continue
      score = 55 + overlap * 5
    }

    const meta = row.meta || {}
    const rowPax = parseIntMeta(meta.max_guests)
    const rowCabins = parseIntMeta(meta.room_count) ?? meta.cabin_count
    if (pax && rowPax && pax === rowPax) score += 8
    if (cabinCount && rowCabins && cabinCount === rowCabins) score += 8

    if (score > bestScore) {
      bestScore = score
      best = { ...row, match_score: score }
    }
  }

  return bestScore >= 60 ? best : null
}
