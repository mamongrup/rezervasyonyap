import {supplierDate,supplierBusinessDate,isWtatilPeriodSellable} from '../../frontend/src/lib/supplier-tour-price.mjs';
export {supplierDate};
export function saleableWtatilEnrichment(enrich,today=supplierBusinessDate()) {
  if(!enrich)return enrich;
  const source=enrich.provider_net_prices?{...enrich,...enrich.provider_net_prices}:enrich;
  const periods=(source.periods||[]).filter(p=>{const start=supplierDate(p.startDate??p.periodStartDate);return isWtatilPeriodSellable(p)&&start!=null&&start>=today});
  const parent=new Map(periods.map(p=>[String(p.id??p.periodId??p.tourPeriodId),p]));
  const periodPrices=(source.periodPrices||[]).filter(p=>{const period=parent.get(String(p.tourPeriodId??p.periodId??p.id));const start=supplierDate(p.startDate??p.periodStartDate??period?.startDate??period?.periodStartDate);return period&&isWtatilPeriodSellable(p)&&start!=null&&start>=today});
  return {...enrich,periods,periodPrices,cheapestPrice:null,...enrich.provider_net_prices?{provider_net_prices:{periods,periodPrices,cheapestPrice:null}}:{},supplier_inventory_checked_at:new Date().toISOString()};
}
