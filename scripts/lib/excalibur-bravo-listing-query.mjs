/** Excalibur Bravo tatil evleri — external_listing_ref sayısal legacy id. */
export const BRAVO_HOLIDAY_LISTING_SQL = `
  SELECT l.id::text AS id, l.slug, l.external_listing_ref,
         l.status, l.currency_code, l.min_stay_nights,
         l.map_lat, l.map_lng, l.location_name, l.share_to_social,
         l.instant_book, l.vitrin_price, l.first_charge_amount,
         l.listing_source, l.organization_id::text AS organization_id,
         l.category_id
  FROM listings l
  JOIN product_categories pc ON pc.id = l.category_id AND pc.code = 'holiday_home'
  WHERE l.external_listing_ref IS NOT NULL
    AND btrim(l.external_listing_ref) <> ''
    AND l.external_listing_ref ~ '^[0-9]+$'
  ORDER BY l.external_listing_ref::int
`

export function isBravoLegacyRef(ref) {
  return /^[0-9]+$/.test(String(ref || '').trim())
}
