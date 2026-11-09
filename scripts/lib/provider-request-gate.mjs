export function createSupplierRequestGate({intervalMs=1500,maxAttempts=4,now=Date.now,sleep=ms=>new Promise(r=>setTimeout(r,ms))}={}) {
  let lane=Promise.resolve(),nextAt=0;
  return function request(send,{retryable=false}={}) {
    const result=lane.then(async()=>{
      for(let attempt=0;;attempt++) {
        const wait=nextAt-now(); if(wait>0) await sleep(wait);
        nextAt=now()+intervalMs;
        const response=await send();
        if(![429,502,503,504].includes(response.status)) return response;
        const header=response.headers?.get?.('retry-after') ?? response.headers?.['retry-after'];
        const seconds=Number(header);
        const dated=header && !Number.isFinite(seconds) ? Date.parse(header)-now() : null;
        const requested=header && Number.isFinite(seconds) ? seconds*1000 : dated;
        const delay=Number.isFinite(requested)?Math.max(intervalMs,requested):Math.min(300000,Math.max(intervalMs,60000*2**attempt));
        nextAt=Math.max(nextAt,now()+delay);
        if(!retryable || attempt+1>=maxAttempts) return response;
        await response.text();
      }
    });
    lane=result.catch(()=>{});return result;
  };
}
