/**
 * Bravo attr_id=6 (ilan tipi) + başlık/slug heuristik → property_type slug.
 */

/** Bravo `bravo_terms.slug` (attr_id=6) → travel `listing_meta.property_type` */
export const BRAVO_TERM_SLUG_TO_PROPERTY_TYPE = {
  villa: 'villa',
  apart: 'apart',
  bungalov: 'bungalov',
}

const TITLE_PRIORITY = ['bungalov', 'villa', 'daire', 'apart']

/**
 * @param {{ attr_id?: number, slug?: string }[]} terms
 * @param {{ title?: string, slug?: string }} space
 */
const TERM_PRIORITY = ['bungalov', 'apart', 'daire', 'villa']

export function resolveHolidayPropertyType(terms, space) {
  const fromTerms = []
  for (const t of terms) {
    if (Number(t.attr_id) !== 6) continue
    const slug = String(t.slug || '').trim().toLowerCase()
    const mapped = BRAVO_TERM_SLUG_TO_PROPERTY_TYPE[slug] || slug
    if (mapped && !fromTerms.includes(mapped)) fromTerms.push(mapped)
  }
  for (const p of TERM_PRIORITY) {
    if (fromTerms.includes(p)) return p
  }
  const hay = `${space.title || ''} ${space.slug || ''}`.toLowerCase()
  if (/\bbungalov\b|bungalow/.test(hay)) return 'bungalov'
  if (/\bdaire\b|duplex|triplex|rezidans|residence\s+\d|studio/.test(hay)) return 'daire'
  if (/\bapart\b/.test(hay) && !/\bvilla\b/.test(hay)) return 'apart'
  if (/\bvilla\b/.test(hay)) return 'villa'
  if (/\bapart\b/.test(hay)) return 'apart'
  return ''
}

/**
 * @param {import('pg').Client} pgClient
 * @param {string} listingId
 * @param {string} propertyType slug: villa | apart | daire | bungalov
 */
export async function applyListingPropertyType(pgClient, listingId, propertyType) {
  const pt = String(propertyType || '').trim().toLowerCase()
  if (!pt) return

  const cur = await pgClient.query(
    `SELECT value_json::text AS j
     FROM listing_attributes
     WHERE listing_id = $1::uuid AND group_code = 'listing_meta' AND key = 'v1'
     LIMIT 1`,
    [listingId],
  )
  let meta = {}
  if (cur.rows[0]?.j) {
    try {
      meta = JSON.parse(cur.rows[0].j)
    } catch {
      meta = {}
    }
  }
  meta.property_type = pt

  await pgClient.query(
    `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
     VALUES ($1::uuid, 'listing_meta', 'v1', $2::jsonb)
     ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = excluded.value_json`,
    [listingId, JSON.stringify(meta)],
  )

  await pgClient.query(
    `DELETE FROM listing_attributes
     WHERE listing_id = $1::uuid AND group_code = 'ilan_tipi'`,
    [listingId],
  )
  await pgClient.query(
    `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
     VALUES ($1::uuid, 'ilan_tipi', $2, 'true'::jsonb)
     ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = excluded.value_json`,
    [listingId, pt],
  )
}
