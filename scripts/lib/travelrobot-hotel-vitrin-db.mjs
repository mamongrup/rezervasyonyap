/**
 * Travelrobot otel vitrin alanlarını DB'ye yazar.
 */
import {
  buildTravelrobotHotelVitrinPackage,
  wrapVerticalHotelMeta,
} from './travelrobot-hotel-vitrin.mjs'

function unwrapVerticalHotel(valueJson) {
  if (!valueJson || typeof valueJson !== 'object') return {}
  const root = valueJson
  const inner = root.data
  if (inner && typeof inner === 'object' && !Array.isArray(inner)) return inner
  return root
}

function facetValueRaw(valueJsonText) {
  const t = String(valueJsonText ?? '').trim()
  if (!t || t === 'null' || t === '""') return ''
  try {
    const p = JSON.parse(t)
    if (typeof p === 'string') return p.trim()
    if (p == null) return ''
    return String(p).trim()
  } catch {
    return t.replace(/^"|"$/g, '').trim()
  }
}

async function upsertHotelFacet(pgClient, listingId, key, value, overwrite) {
  if (!value) return false
  if (!overwrite) {
    const ex = await pgClient.query(
      `SELECT value_json::text AS v FROM listing_attributes
       WHERE listing_id = $1::uuid AND group_code = 'hotel' AND key = $2`,
      [listingId, key],
    )
    if (facetValueRaw(ex.rows[0]?.v)) return false
  }
  await pgClient.query(
    `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
     VALUES ($1::uuid, 'hotel', $2, $3::jsonb)
     ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json`,
    [listingId, key, JSON.stringify(String(value))],
  )
  return true
}

/**
 * @param {import('pg').Client} pgClient
 * @param {object} opts — { overwriteFacets, overwriteMeta, localeTrId, updateDescription }
 */
export async function applyTravelrobotHotelVitrinFields(pgClient, listingId, hotel, opts = {}) {
  const pkg = buildTravelrobotHotelVitrinPackage(hotel)
  const overwriteFacets = opts.overwriteFacets === true
  const overwriteMeta = opts.overwriteMeta === true
  const stats = { facets: 0, amenities: 0, meta: false, description: false }

  if (pkg.facets.hotel_type_code) {
    if (await upsertHotelFacet(pgClient, listingId, 'hotel_type_code', pkg.facets.hotel_type_code, overwriteFacets)) {
      stats.facets++
    }
  }
  if (pkg.facets.theme_code) {
    if (await upsertHotelFacet(pgClient, listingId, 'theme_code', pkg.facets.theme_code, overwriteFacets)) {
      stats.facets++
    }
  }
  if (pkg.facets.accommodation_code) {
    if (
      await upsertHotelFacet(
        pgClient,
        listingId,
        'accommodation_code',
        pkg.facets.accommodation_code,
        overwriteFacets,
      )
    ) {
      stats.facets++
    }
  }

  if (pkg.amenities.length) {
    await pgClient.query(
      `DELETE FROM listing_attributes WHERE listing_id = $1::uuid AND group_code = 'otel_kplus'`,
      [listingId],
    )
    for (const row of pkg.amenities) {
      await pgClient.query(
        `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
         VALUES ($1::uuid, $2, $3, $4::jsonb)
         ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json`,
        [listingId, row.group_code, row.key, JSON.stringify(row.value_json)],
      )
    }
    stats.amenities = pkg.amenities.length
  }

  const incoming = pkg.verticalHotel
  const hasIncomingMeta =
    incoming.general_terms_html ||
    (incoming.facility_sections?.length ?? 0) > 0 ||
    (incoming.faq_items?.length ?? 0) > 0

  if (hasIncomingMeta) {
    const ex = await pgClient.query(
      `SELECT value_json FROM listing_attributes
       WHERE listing_id = $1::uuid AND group_code = 'vertical_hotel' AND key = 'v1'`,
      [listingId],
    )
    const prev = overwriteMeta ? {} : unwrapVerticalHotel(ex.rows[0]?.value_json)

    const merged = {
      general_terms_html:
        overwriteMeta || !String(prev.general_terms_html ?? '').trim()
          ? incoming.general_terms_html
          : prev.general_terms_html,
      facility_sections:
        overwriteMeta || !(prev.facility_sections?.length ?? 0)
          ? incoming.facility_sections
          : prev.facility_sections,
      faq_items: mergeFaqItems(prev.faq_items, incoming.faq_items, overwriteMeta),
    }

    if (
      merged.general_terms_html ||
      (merged.facility_sections?.length ?? 0) > 0 ||
      (merged.faq_items?.length ?? 0) > 0
    ) {
      await pgClient.query(
        `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
         VALUES ($1::uuid, 'vertical_hotel', 'v1', $2::jsonb)
         ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json`,
        [listingId, JSON.stringify(wrapVerticalHotelMeta(merged))],
      )
      stats.meta = true
    }
  }

  const localeTrId = opts.localeTrId
  const plain = incoming.descriptionPlain
  if (localeTrId && plain && opts.updateDescription !== false) {
    const ex = await pgClient.query(
      `SELECT description FROM listing_translations WHERE listing_id = $1::uuid AND locale_id = $2`,
      [listingId, localeTrId],
    )
    const prevDesc = String(ex.rows[0]?.description ?? '').trim()
    if (overwriteMeta || !prevDesc || prevDesc.length < 80) {
      await pgClient.query(
        `INSERT INTO listing_translations (listing_id, locale_id, title, description)
         VALUES ($1::uuid, $2, COALESCE((SELECT title FROM listing_translations WHERE listing_id = $1::uuid AND locale_id = $2), ''), $3)
         ON CONFLICT (listing_id, locale_id) DO UPDATE SET
           description = EXCLUDED.description`,
        [listingId, localeTrId, plain],
      )
      stats.description = true
    }
  }

  return stats
}

function mergeFaqItems(prev, incoming, overwrite) {
  const inc = Array.isArray(incoming) ? incoming : []
  if (overwrite || !Array.isArray(prev) || !prev.length) return inc.length ? inc : null
  const seen = new Set(prev.map((x) => String(x?.q ?? '').trim().toLowerCase()))
  const out = [...prev]
  for (const item of inc) {
    const q = String(item?.q ?? '').trim()
    if (!q) continue
    const k = q.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(item)
  }
  return out.length ? out : null
}

export function catalogHasTravelrobotVitrinSource(hotel) {
  const pkg = buildTravelrobotHotelVitrinPackage(hotel)
  return (
    pkg.amenities.length > 0 ||
    Boolean(pkg.verticalHotel.general_terms_html) ||
    (pkg.verticalHotel.facility_sections?.length ?? 0) > 0
  )
}
