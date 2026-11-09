import {createPgClient} from './lib/pg-client.mjs'
import {spawn} from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
const db=createPgClient(); await db.connect()
const dir='/var/lib/travel/kplus-commission-15'; await fs.mkdir(dir,{recursive:true,mode:0o700})
const file=path.join(dir,'state.json')
let state={completed:[],unavailable:[],errors:[]}
try {state=JSON.parse(await fs.readFile(file,'utf8'))} catch(e){if(e.code!=='ENOENT')throw e}
const passDate=new Date().toISOString().slice(0,10)
if(state.passDate!==passDate){state.unavailable=[];state.errors=[];state.passDate=passDate}
const save=async()=>{await fs.writeFile(file+'.tmp',JSON.stringify(state),{mode:0o600});await fs.rename(file+'.tmp',file)}
// Database commission markers are authoritative; a historical completion cannot suppress a missing marker.
const done=new Set(state.unavailable)
const {rows}=await db.query(`SELECT l.id,d.travelrobot_hotel_code AS code, EXISTS(SELECT 1 FROM listing_attributes a WHERE a.listing_id=l.id AND a.group_code='provider_inventory' AND a.key='status' AND a.value_json->>'reason'='commission_unverified') AS needs_verify,
  EXISTS(SELECT 1 FROM listing_meal_plans p WHERE p.listing_id=l.id AND p.is_active AND p.price_per_night>0) AS priced
  FROM listings l JOIN product_categories pc ON pc.id=l.category_id AND pc.code='hotel'
  JOIN listing_hotel_details d ON d.listing_id=l.id
  WHERE l.external_provider_code='travelrobot' AND d.travelrobot_hotel_code IS NOT NULL
    AND NOT EXISTS(SELECT 1 FROM listing_attributes a WHERE a.listing_id=l.id AND a.group_code='travelrobot'
       AND a.key='hotel_commission' AND a.value_json->>'percent'='15')
  ORDER BY needs_verify DESC, (l.status='published') DESC, priced DESC, (d.travelrobot_hotel_code LIKE 'KTR%') DESC,l.id`)
const jobs=rows.filter(r=>r.needs_verify || !done.has(r.id))
console.log(JSON.stringify({event:'queue_ready',remaining:jobs.length,completed:state.completed.length,unavailable:state.unavailable.length}))
let pos=0, saving=Promise.resolve()
const backup=async(job)=>{
  const destination=path.join(dir,job.id+'.before.json')
  try{await fs.access(destination);return}catch(e){if(e.code!=='ENOENT')throw e}
  const {rows}=await db.query(`SELECT jsonb_build_object(
    'listing',(SELECT jsonb_build_object('first_charge_amount',first_charge_amount,'vitrin_price',vitrin_price,'last_synced_at',last_synced_at) FROM listings WHERE id=$1),
    'plans',(SELECT coalesce(jsonb_agg(to_jsonb(p)),'[]') FROM listing_meal_plans p WHERE listing_id=$1),
    'rules',(SELECT coalesce(jsonb_agg(to_jsonb(p)),'[]') FROM listing_price_rules p WHERE listing_id=$1),
    'rooms',(SELECT coalesce(jsonb_agg(to_jsonb(p)),'[]') FROM hotel_rooms p WHERE listing_id=$1),
    'calendar',(SELECT coalesce(jsonb_agg(to_jsonb(c)),'[]') FROM hotel_room_availability_calendar c JOIN hotel_rooms r ON r.id=c.hotel_room_id WHERE r.listing_id=$1)
    ) AS backup`,[job.id])
  await fs.writeFile(destination,JSON.stringify(rows[0].backup),{mode:0o600,flag:'wx'})
}
const run=async(job)=>new Promise(resolve=>{
  const child=spawn(process.execPath,['scripts/sync-hotel-vitrin-prices.mjs','--code',job.code,'--force'],{cwd:process.cwd(),stdio:['ignore','pipe','pipe']})
  let output='';const capture=c=>{output=(output+c.toString()).slice(-16000)}
  child.stdout.on('data',capture);child.stderr.on('data',capture)
  const timeout=setTimeout(()=>child.kill('SIGTERM'),180000)
  child.on('error',()=>{clearTimeout(timeout);resolve('error')})
  child.on('close',code=>{clearTimeout(timeout);resolve(code===0&&/Tamamland[ıi]: 1 g[üu]ncellendi/.test(output)?'completed':code===0&&/1 stok d[ıi][şs][ıi]/.test(output)?'unavailable':'error')})
})
const workerCount = 2;
await Promise.all(Array.from({length:workerCount},async()=>{
  while(pos<jobs.length){
    const job=jobs[pos++]; await backup(job); const result=await run(job)
    state[result==='completed'?'completed':result==='unavailable'?'unavailable':'errors'].push(job.id)
    saving=saving.then(save);await saving
    console.log(JSON.stringify({code:job.code,result,processed:pos,total:jobs.length,completed:state.completed.length,unavailable:state.unavailable.length,errors:state.errors.length}))
  }
}))
console.log('KPLUS_COMMISSION_REPAIR_PASS_FINISHED')
await db.end()
