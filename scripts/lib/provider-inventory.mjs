import fs from 'node:fs/promises';
import path from 'node:path';
export async function quarantineProviderListing(pg,{organizationId,listingId,provider,externalRef,reason='supplier_catalog_missing',backupDir='/var/lib/travel/provider-inventory'}) {
  await pg.query('BEGIN');
  try {
    const {rows}=await pg.query('SELECT to_jsonb(l) AS listing FROM listings l WHERE id=$1::uuid AND organization_id=$2::uuid AND external_provider_code=$3 AND external_listing_ref::text=$4 FOR UPDATE',[listingId,organizationId,provider,String(externalRef)]);
    if(rows.length!==1)throw Error('provider_listing_scope_mismatch');
    const tour=await pg.query('SELECT to_jsonb(t) AS tour FROM listing_tour_details t WHERE listing_id=$1::uuid',[listingId]);
    await fs.mkdir(backupDir,{recursive:true,mode:0o700});
    const file=path.join(backupDir,listingId+'-before-withdrawal.json');
    try {await fs.writeFile(file,JSON.stringify({listing:rows[0].listing,tour:tour.rows[0]?.tour??null}),{flag:'wx',mode:0o600})}catch(e){if(e.code!=='EEXIST')throw e}
    const checkedAt=new Date().toISOString();
    await pg.query("INSERT INTO listing_attributes(listing_id,group_code,key,value_json) VALUES($1::uuid,'provider_inventory','status',$2::jsonb) ON CONFLICT(listing_id,group_code,key) DO UPDATE SET value_json=EXCLUDED.value_json",[listingId,JSON.stringify({status:'withdrawn',provider,external_ref:String(externalRef),reason,checked_at:checkedAt})]);
    await pg.query("UPDATE listings SET status='draft',vitrin_price=NULL,last_synced_at=now(),updated_at=now() WHERE id=$1::uuid AND organization_id=$2::uuid",[listingId,organizationId]);
    await pg.query("UPDATE listing_tour_details SET program_days_json=coalesce(program_days_json,'{}'::jsonb)||jsonb_build_object('periods','[]'::jsonb,'period_prices','[]'::jsonb,'cheapest_price',NULL,'supplier_inventory_status','withdrawn','supplier_inventory_checked_at',$2::text) WHERE listing_id=$1::uuid",[listingId,checkedAt]);
    await pg.query('COMMIT');return {listingId,status:'withdrawn',backup:file};
  }catch(e){await pg.query('ROLLBACK');throw e}
}
