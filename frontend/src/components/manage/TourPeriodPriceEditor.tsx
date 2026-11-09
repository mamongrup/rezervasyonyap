'use client'
import {mergeTourPeriodOptions} from '@/lib/tour-periods'
import {tourPeriodPriceCopy} from '@/lib/tour-admin-period-prices'
import type {ProviderSourceInfo} from '@/lib/provider-listing-source'
export default function TourPeriodPriceEditor({source,values,onChange,locale,currency}:{source:ProviderSourceInfo;values:Record<string,string>;onChange:(v:Record<string,string>)=>void;locale:string;currency:string}){
 const copy=tourPeriodPriceCopy(locale)
 const periods=mergeTourPeriodOptions({currency_code:currency,periods:source.periods??[],period_prices:source.period_prices??[]})
 return <section className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-700">
  <h3 className="text-lg font-semibold">{copy.title}</h3><p className="mt-2 text-sm text-neutral-500">{copy.hint}</p>
  {periods.length===0?<p className="mt-4 text-sm" role="status">{copy.empty}</p>:<div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="py-2">{copy.date}</th><th>{copy.current}</th><th>{copy.edit} ({currency})</th></tr></thead><tbody>
  {periods.map(p=><tr key={p.id} className="border-t border-neutral-100 dark:border-neutral-800"><td className="py-3 pr-4">{p.startDate} — {p.endDate}</td><td className="pr-4">{p.price!=null?new Intl.NumberFormat(locale,{style:'currency',currency}).format(p.price):'—'}</td><td><input type="number" min="0.01" step="0.01" value={values[p.id]??''} onChange={e=>onChange({...values,[p.id]:e.target.value})} aria-label={copy.edit+' '+p.startDate} placeholder={p.price?.toFixed(2)??'—'} className="w-40 rounded-xl border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-600"/></td></tr>)}
  </tbody></table></div>}
 </section>
}
