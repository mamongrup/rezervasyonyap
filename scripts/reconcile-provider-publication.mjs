import { createPgClient } from './lib/pg-client.mjs'
const apply=process.argv.includes('--apply')
const pg=createPgClient()
await pg.connect()
try {
  await pg.query('BEGIN')
  await pg.query("SET LOCAL statement_timeout = '30s'")
  const result=await pg.query(`WITH candidates AS (
    SELECT l.*,pc.code category_code FROM listings l
    JOIN product_categories pc ON pc.id=l.category_id
    JOIN listing_attributes req ON req.listing_id=l.id
      AND req.group_code='publication_quality' AND req.key='requested'
      AND req.value_json->>'requested'='true'
    WHERE l.status='draft' AND l.external_provider_code IN ('travelrobot','wtatil','yolcu360')
    ORDER BY l.created_at LIMIT 100
  ) SELECT l.id::text,l.slug,l.external_provider_code,l.category_code,
    EXISTS(SELECT 1 FROM ai_listing_content_batches b WHERE b.listing_id=l.id
      AND b.status='done' AND b.phase='done') editorial_complete,
    (SELECT count(DISTINCT lo.code) FROM listing_translations lt JOIN locales lo ON lo.id=lt.locale_id
      WHERE lt.listing_id=l.id AND lo.code=ANY($1::text[])
      AND length(trim(coalesce(lt.title,'')))>=2 AND length(coalesce(lt.description,''))>=120
      AND lower(lt.description) ~ '<p([[:space:]]|>)'
      AND lower(lt.description) ~ '<(h2|h3|ul|ol)([[:space:]]|>)')=6 languages_complete,
    (SELECT count(DISTINCT lt.description) FROM listing_translations lt JOIN locales lo ON lo.id=lt.locale_id
      WHERE lt.listing_id=l.id AND lo.code=ANY($1::text[]))=6 languages_distinct,
    (SELECT count(DISTINCT lo.code) FROM seo_metadata sm JOIN locales lo ON lo.id=sm.locale_id
      WHERE sm.entity_type='listing' AND sm.entity_id=l.id AND lo.code=ANY($1::text[])
      AND length(trim(coalesce(sm.title,'')))>10 AND length(trim(coalesce(sm.description,'')))>40)=6 seo_complete,
    (SELECT count(DISTINCT li.storage_key) FROM listing_images li WHERE li.listing_id=l.id
      AND li.storage_key ~ '^https://')>=CASE WHEN l.category_code='hotel' THEN 2 ELSE 1 END media_complete,
    (l.category_code<>'hotel' OR (EXISTS(SELECT 1 FROM hotel_rooms hr WHERE hr.listing_id=l.id)
      AND NOT EXISTS(SELECT 1 FROM hotel_rooms hr WHERE hr.listing_id=l.id
        AND coalesce(hr.meta_json->>'image','')='' AND coalesce(jsonb_array_length(
          CASE WHEN jsonb_typeof(hr.meta_json->'images')='array' THEN hr.meta_json->'images' ELSE '[]'::jsonb END),0)=0))) rooms_complete,
    (l.vitrin_price>0 AND l.last_synced_at>now()-interval '1 day') fresh_price,
    CASE WHEN l.category_code='hotel' THEN EXISTS(
      SELECT 1 FROM hotel_rooms hr JOIN hotel_room_availability_calendar c ON c.hotel_room_id=hr.id
      WHERE hr.listing_id=l.id AND c.day>=current_date AND c.available_units>0 AND c.price_override>0)
    WHEN l.external_provider_code='wtatil' THEN EXISTS(
      SELECT 1 FROM listing_tour_details td,LATERAL jsonb_array_elements(
        CASE WHEN jsonb_typeof(td.program_days_json->'period_prices')='array'
        THEN td.program_days_json->'period_prices' ELSE '[]'::jsonb END) p
      WHERE td.listing_id=l.id AND p->>'isActive'='true' AND p->>'askSell'='false'
      AND p->>'startDate' ~ '^\\d{4}-\\d{2}-\\d{2}' AND left(p->>'startDate',10)>=current_date::text)
    ELSE false END inventory_complete,
    CASE WHEN l.category_code='hotel' THEN EXISTS(SELECT 1 FROM listing_attributes la
      WHERE la.listing_id=l.id AND la.group_code='travelrobot' AND la.key='hotel_commission'
      AND la.value_json->>'percent'='15')
    WHEN l.external_provider_code='wtatil' THEN EXISTS(SELECT 1 FROM listing_tour_details td
      WHERE td.listing_id=l.id AND td.program_days_json->'pricing'->>'markup_percent'='15')
    ELSE false END markup_complete
    FROM candidates l`,[['tr','en','de','ru','zh','fr']])
  const gates=['editorial_complete','languages_complete','languages_distinct','seo_complete','media_complete','rooms_complete','fresh_price','inventory_complete','markup_complete']
  const rows=result.rows.map(r=>({...r,issues:gates.filter(k=>r[k]!==true)}))
  const ready=rows.filter(r=>!r.issues.length)
  if(apply && ready.length) await pg.query("UPDATE listings SET status='published',updated_at=now() WHERE status='draft' AND id=ANY($1::uuid[])",[ready.map(r=>r.id)])
  await pg.query(apply?'COMMIT':'ROLLBACK')
  console.log(JSON.stringify({apply,checked:rows.length,ready:ready.length,published:apply?ready.length:0,rows},null,2))
} catch(e) {
  await pg.query('ROLLBACK')
  throw e
} finally { await pg.end() }
