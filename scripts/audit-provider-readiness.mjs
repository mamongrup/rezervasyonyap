import { createPgClient } from './lib/pg-client.mjs'
const pg=createPgClient()
await pg.connect()
try {
  await pg.query("SET statement_timeout='30s'")
  const settings=(await pg.query(`SELECT value_json FROM site_settings
    WHERE key='listing_api_providers' AND organization_id IS NULL ORDER BY id DESC LIMIT 1`)).rows[0]?.value_json || {}
  const providers=['travelrobot','wtatil','yolcu360','turna']
  const configuration=Object.fromEntries(providers.map(code=>[code,{
    enabled:settings[code]?.enabled===true,
    base_url:settings[code]?.base_url || null,
    sales_markup_percent:settings[code]?.sales_markup_percent ?? null,
    hotel_commission_percent:settings[code]?.hotel_commission_percent ?? null,
    staging:/staging|sandbox/i.test(settings[code]?.base_url || ''),
  }]))
  const counts=(await pg.query(`SELECT external_provider_code provider,status,count(*)::int listings,
    count(*) FILTER(WHERE vitrin_price>0)::int priced,
    count(*) FILTER(WHERE last_synced_at>now()-interval '1 day')::int fresh
    FROM listings WHERE external_provider_code=ANY($1::text[])
    GROUP BY external_provider_code,status`,[providers])).rows
  const sample=(await pg.query(`WITH providers AS (SELECT unnest($1::text[]) code)
    SELECT p.code provider,l.id::text,l.slug,l.status,l.vitrin_price,l.last_synced_at,
    (SELECT count(DISTINCT lo.code) FROM listing_translations lt JOIN locales lo ON lo.id=lt.locale_id
      WHERE lt.listing_id=l.id AND lo.code=ANY($2::text[]) AND length(coalesce(lt.description,''))>=120
      AND lower(lt.description) ~ '<p([[:space:]]|>)'
      AND lower(lt.description) ~ '<(h2|h3|ul|ol)([[:space:]]|>)')::int editorial_languages,
    (SELECT count(*) FROM listing_images li WHERE li.listing_id=l.id)::int images,
    (SELECT count(*) FROM hotel_rooms hr WHERE hr.listing_id=l.id)::int rooms
    FROM providers p JOIN LATERAL(SELECT id,slug,status,vitrin_price,last_synced_at FROM listings
      WHERE external_provider_code=p.code AND status IN('published','draft') LIMIT 3) l ON true`,
    [providers,['tr','en','de','ru','zh','fr']])).rows
  const content=(await pg.query(`SELECT l.external_provider_code provider,b.status,count(*)::int batches
    FROM ai_listing_content_batches b JOIN listings l ON l.id=b.listing_id
    WHERE l.external_provider_code=ANY($1::text[]) GROUP BY l.external_provider_code,b.status`,[providers])).rows
  console.log(JSON.stringify({checked_at:new Date().toISOString(),configuration,counts,sample,content,
    note:'Database readiness only; successful supplier authentication does not prove booking or availability.'},null,2))
} finally { await pg.end() }
