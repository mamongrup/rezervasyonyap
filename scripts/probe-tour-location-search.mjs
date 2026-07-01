import { createPgClient } from './lib/pg-client.mjs'

const c = createPgClient()
await c.connect()
try {
  const tourPrice = await c.query(`
    SELECT count(*)::int AS total,
           count(*) FILTER (WHERE coalesce(l.vitrin_price, 0) > 0)::int AS priced
    FROM listings l
    JOIN product_categories pc ON pc.id = l.category_id
    WHERE pc.code = 'tour' AND l.status = 'published'
  `)
  console.log('tour vitrin_price stats:', tourPrice.rows[0])

  const balkanVisible = await c.query(`
    SELECT count(*)::int AS n FROM listings l
    JOIN product_categories pc ON pc.id = l.category_id
    WHERE pc.code = 'tour' AND l.status = 'published'
    AND (
      coalesce(l.vitrin_price, l.first_charge_amount, 0) > 0
      OR exists (
        select 1 from listing_tour_details td
        where td.listing_id = l.id
          and td.program_days_json is not null
          and td.program_days_json::text not in ('{}', 'null')
      )
    )
    AND translate(lower(coalesce(l.location_name,'')), 'üğışöç', 'ugisoc') LIKE '%balkan%'
  `)
  console.log('balkan visible with new gate:', balkanVisible.rows[0].n)

  const allToursVisible = await c.query(`
    SELECT count(*)::int AS n FROM listings l
    JOIN product_categories pc ON pc.id = l.category_id
    WHERE pc.code = 'tour' AND l.status = 'published'
    AND (
      coalesce(l.vitrin_price, l.first_charge_amount, 0) > 0
      OR exists (
        select 1 from listing_tour_details td
        where td.listing_id = l.id
          and td.program_days_json is not null
          and td.program_days_json::text not in ('{}', 'null')
      )
    )
  `)
  console.log('all tours visible with new gate:', allToursVisible.rows[0].n)
} finally {
  await c.end()
}
