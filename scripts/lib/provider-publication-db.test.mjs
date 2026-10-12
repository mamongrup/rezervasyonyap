import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import { providerPublicationQuery } from './provider-publication-query.mjs'
const require=createRequire(new URL('../../frontend/package.json',import.meta.url))
const { Client }=require('pg')

test('publication SQL rejects incomplete languages, old prices and request-only inventory',async()=>{
  const pg=new Client({host:'127.0.0.1',user:'postgres',database:process.env.PUBLICATION_TEST_DB || 'ryt_test',connectionTimeoutMillis:5000})
  await pg.connect()
  const id=randomUUID()
  try {
    await pg.query('BEGIN')
    await pg.query(`INSERT INTO listings(id,organization_id,category_id,slug,currency_code,status,
      listing_source,external_provider_code,external_listing_ref,last_synced_at,vitrin_price)
      SELECT $1::uuid,(SELECT id FROM organizations LIMIT 1),pc.id,$2,'TRY','draft',
      'api','wtatil',$2,now(),115 FROM product_categories pc WHERE pc.code='tour'`,[id,`publication-test-${id}`])
    await pg.query(`INSERT INTO listing_attributes(listing_id,group_code,key,value_json)
      VALUES($1::uuid,'publication_quality','requested','{"requested":true}')`,[id])
    await pg.query(`INSERT INTO ai_listing_content_batches(listing_id,category_code,status,phase)
      VALUES($1::uuid,'tour','done','done')`,[id])
    await pg.query(`INSERT INTO listing_translations(listing_id,locale_id,title,description)
      SELECT $1::uuid,id,'Test title '||code,'<h2>Test heading '||code||'</h2><p>'||repeat('Fixture content '||code||' ',12)||'</p>'
      FROM locales WHERE code=ANY($2::text[])`,[id,['tr','en','de','ru','zh','fr']])
    await pg.query(`INSERT INTO seo_metadata(entity_type,entity_id,locale_id,title,description)
      SELECT 'listing',$1::uuid,id,'Test title '||code,repeat('Fixture SEO '||code||' ',8)
      FROM locales WHERE code=ANY($2::text[])`,[id,['tr','en','de','ru','zh','fr']])
    await pg.query(`INSERT INTO listing_images(listing_id,storage_key,sort_order,original_mime)
      VALUES($1::uuid,'https://example.test/supplier.jpg',0,'image/jpeg')`,[id])
    const future=new Date(Date.now()+86400000*5).toISOString().slice(0,10)
    await pg.query(`INSERT INTO listing_tour_details(listing_id,program_days_json)
      VALUES($1::uuid,$2::jsonb)`,[id,JSON.stringify({pricing:{markup_percent:15},period_prices:[{startDate:future,isActive:true,askSell:false,double:115}]})])
    const check=async()=> (await pg.query(providerPublicationQuery,[['tr','en','de','ru','zh','fr'],id])).rows[0]
    let row=await check()
    for(const key of ['editorial_complete','languages_complete','languages_distinct','seo_complete','media_complete','rooms_complete','fresh_price','inventory_complete','markup_complete']) assert.equal(row[key],true,key)
    await pg.query(`DELETE FROM listing_translations WHERE listing_id=$1::uuid AND locale_id=(SELECT id FROM locales WHERE code='fr')`,[id])
    assert.equal((await check()).languages_complete,false)
    await pg.query(`UPDATE listings SET last_synced_at=now()-interval '2 days' WHERE id=$1::uuid`,[id])
    assert.equal((await check()).fresh_price,false)
    await pg.query(`UPDATE listing_tour_details SET program_days_json=jsonb_set(program_days_json,'{period_prices,0,askSell}','true') WHERE listing_id=$1::uuid`,[id])
    assert.equal((await check()).inventory_complete,false)
  } finally {
    await pg.query('ROLLBACK')
    await pg.end()
  }
})
