import { providerPublicationQuery } from './lib/provider-publication-query.mjs'
import { createPgClient } from './lib/pg-client.mjs'
const apply=process.argv.includes('--apply')
const pg=createPgClient()
await pg.connect()
try {
  await pg.query('BEGIN')
  await pg.query("SET LOCAL statement_timeout = '30s'")
  const result=await pg.query(providerPublicationQuery,[['tr','en','de','ru','zh','fr'],process.env.PROVIDER_PUBLICATION_LISTING_ID || null])
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
