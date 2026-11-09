import fs from 'node:fs/promises';
export async function holdKplusHotelQuote(pg, listingId, options = {}) {
 await pg.query('BEGIN');
 try {
  const {rows}=await pg.query("SELECT l.id::text,l.organization_id::text,l.vitrin_price,l.first_charge_amount,(SELECT coalesce(jsonb_agg(to_jsonb(p)),'[]') FROM listing_meal_plans p WHERE p.listing_id=l.id AND p.notes='source:travelrobot') AS plans,(SELECT coalesce(jsonb_agg(to_jsonb(r)),'[]') FROM listing_price_rules r WHERE r.listing_id=l.id AND r.rule_json->>'source'='travelrobot') AS rules FROM listings l JOIN product_categories c ON c.id=l.category_id WHERE l.id=$1::uuid AND l.external_provider_code='travelrobot' AND l.listing_source='api' AND c.code='hotel' FOR UPDATE OF l",[listingId]);
  if(rows.length!==1)throw Error('kplus_hotel_quote_scope_mismatch');
  const dir=options.backupDir || '/var/lib/travel/provider-inventory';await fs.mkdir(dir,{recursive:true,mode:0o700});
  try {await fs.writeFile(dir+'/'+listingId+'-before-no-hotel-quote.json',JSON.stringify({checkedAt:new Date().toISOString(),...rows[0]}),{mode:0o600,flag:'wx'});}catch(e){if(e.code!=='EEXIST')throw e;}
  await pg.query("UPDATE listing_meal_plans SET is_active=false WHERE listing_id=$1::uuid AND notes='source:travelrobot'",[listingId]);
  await pg.query("DELETE FROM listing_price_rules WHERE listing_id=$1::uuid AND rule_json->>'source'='travelrobot' AND coalesce(rule_json->>'manual_starting_price','false')<>'true'",[listingId]);
  await pg.query("UPDATE listings SET vitrin_price=NULL,first_charge_amount=NULL,last_synced_at=now() WHERE id=$1::uuid",[listingId]);
  await pg.query("INSERT INTO listing_attributes(listing_id,group_code,key,value_json) VALUES($1::uuid,'provider_inventory','status',jsonb_build_object('provider','travelrobot','status','quote_unavailable','checked_at',now(),'reason',$2::text)) ON CONFLICT(listing_id,group_code,key) DO UPDATE SET value_json=EXCLUDED.value_json",[listingId,options.reason || 'no_price_in_verified_search_windows']);
  await pg.query('COMMIT');
 }catch(e){await pg.query('ROLLBACK');throw e;}
}

export async function releaseKplusHotelQuote(pg, listingId) {await pg.query("INSERT INTO listing_attributes(listing_id,group_code,key,value_json) VALUES($1::uuid,'provider_inventory','status',jsonb_build_object('provider','travelrobot','status','available','checked_at',now())) ON CONFLICT(listing_id,group_code,key) DO UPDATE SET value_json=EXCLUDED.value_json",[listingId]);}
