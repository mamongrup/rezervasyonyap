/** Adult tour fares are per person; child and unqualified group totals are never substitutes. */
export function pickTourPeriodPersonPrice(row) {
  for(const key of ['double','triple','adultPrice','doublePrice','price','amount','singlePrice']) {
    let raw=row?.[key];if(raw&&typeof raw==='object')raw=raw.value??raw.amount;
    if(raw==null||raw===''||typeof raw==='boolean')continue;
    const n=Number(String(raw).replaceAll(' ','').replace(',','.'));
    if(Number.isFinite(n)&&n>0)return n;
  }
  return null;
}
export function isWtatilPeriodSellable(row) {
  if(row.isActive===false||row.IsActive===false)return false;
  if(['isStopSale','IsStopSale','stopSale','StopSale','is_stop_sale'].some(k=>row[k]===true))return false;
  if(row.askSell===true||row.AskSell===true)return false;
  const quota=row.remainingQuota??row.RemainingQuota??row.quota??row.Quota;
  if(quota!=null&&quota!==''&&(!Number.isFinite(Number(quota))||Number(quota)<=0))return false;
  return true;
}
export function supplierDate(value) {
  const s=String(value??'').trim();let iso=null;
  const dotted=s.match(/^([0-9]{1,2})[./]([0-9]{1,2})[./]([0-9]{4})$/);
  if(dotted)iso=dotted[3]+'-'+dotted[2].padStart(2,'0')+'-'+dotted[1].padStart(2,'0');
  else if(/^[0-9]{4}-[0-9]{2}-[0-9]{2}/.test(s))iso=s.slice(0,10);
  if(!iso)return null;const d=new Date(iso+'T00:00:00Z');
  return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===iso?iso:null;
}
export function supplierBusinessDate(date=new Date()) {
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const part=k=>parts.find(p=>p.type===k).value;return part('year')+'-'+part('month')+'-'+part('day');
}
