/**
 * Yat ilanlarında meta `amenities` metninden vitrin filtre öznitelikleri üretir.
 * `listing_attributes` (group: yat_olanak, key: wifi | generator | …, value: true)
 *
 *   node scripts/backfill-yacht-filter-attributes.mjs
 *   node scripts/backfill-yacht-filter-attributes.mjs --dry-run
 */

import { createPgClient } from './lib/pg-client.mjs'

const YACHT_FILTER_KEYS = [
  'wifi',
  'air_conditioning',
  'generator',
  'water_toys',
  'snorkeling',
  'tender_dinghy',
]

const dryRun = process.argv.includes('--dry-run')
const GROUP = 'yat_olanak'

/** meta.amenities[] metninden filtre anahtarı çıkarımı */
const RULES = [
  { key: 'wifi', re: /wi-?fi|internet/i },
  { key: 'air_conditioning', re: /klima|air\s*cond|a\/c/i },
  { key: 'generator', re: /jenerat|generator/i },
  { key: 'water_toys', re: /paddle|kano|kanoe|jet\s*ski|wakeboard|kneeboard|\bmuz\b|banana|water\s*ski|su\s*spor/i },
  { key: 'snorkeling', re: /şnorkel|snorkel/i },
  { key: 'tender_dinghy', re: /zodyak|dinghy|tender/i },
]

function keysFromAmenities(amenities) {
  const hits = new Set()
  const list = Array.isArray(amenities) ? amenities : []
  for (const raw of list) {
    const text = String(raw ?? '')
    for (const rule of RULES) {
      if (rule.re.test(text)) hits.add(rule.key)
    }
  }
  return [...hits].filter((k) => YACHT_FILTER_KEYS.includes(k))
}

const pg = createPgClient()
await pg.connect()

const { rows } = await pg.query(`
  SELECT l.id::text AS id, la.value_json->'amenities' AS amenities
  FROM listings l
  JOIN product_categories pc ON pc.id = l.category_id AND pc.code = 'yacht_charter'
  LEFT JOIN listing_attributes la
    ON la.listing_id = l.id AND la.group_code = 'listing_meta' AND la.key = 'v1'
`)

let listings = 0
let attrs = 0

for (const row of rows) {
  const keys = keysFromAmenities(row.amenities)
  if (!keys.length) continue
  listings += 1
  for (const key of keys) {
    attrs += 1
    if (dryRun) continue
    await pg.query(
      `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
       VALUES ($1::uuid, $2, $3, 'true'::jsonb)
       ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = 'true'::jsonb`,
      [row.id, GROUP, key],
    )
  }
}

await pg.end()
console.log(
  dryRun
    ? `[dry-run] ${listings} ilan, ${attrs} öznitelik yazılacak`
    : `updated ${listings} yacht listings, ${attrs} filter attributes`,
)
