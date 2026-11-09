import fs from 'node:fs/promises';
import {fetchWtatilToken,fetchAllTours} from './lib/wtatil-api.mjs';
const id=Number(process.argv[2]);if(!Number.isSafeInteger(id)||id<=0)throw Error('Invalid supplier id');
const auth=await fetchWtatilToken();const rows=await fetchAllTours(auth.userName,auth.token,50,[id]);
const matches=rows.filter(x=>Number(x.id??x.tourId)===id);
await fs.mkdir('/root/provider-pricing-fix-20261109',{recursive:true,mode:0o700});
await fs.writeFile('/root/provider-pricing-fix-20261109/wtatil-'+id+'-catalog.json',JSON.stringify({checkedAt:new Date().toISOString(),requestedId:id,returned:rows.length,matches},null,2),{mode:0o600});
console.log(JSON.stringify({requestedId:id,returned:rows.length,found:matches.length,tours:matches.map(x=>({id:x.id??x.tourId,name:x.name,isActive:x.isActive,status:x.status,currency:x.currencyCode,price:x.price,cheapestPrice:x.cheapestPrice}))}));
