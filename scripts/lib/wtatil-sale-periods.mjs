export function supplierDate(value) {
  const s=String(value || '').trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0,10)
  const m=s.match(/^(\d{2})[./](\d{2})[./](\d{4})$/)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null
}

export function saleableWtatilEnrichment(enrich, today=new Date().toISOString().slice(0,10)) {
  if (!enrich) return enrich
  const periods=(enrich.periods || []).filter(p=> {
    const start=supplierDate(p.startDate ?? p.periodStartDate)
    return p.isActive === true && start != null && start >= today
  })
  const ids=new Set(periods.map(p=>String(p.id ?? p.periodId ?? p.tourPeriodId)))
  const periodPrices=(enrich.periodPrices || []).filter(p=> {
    const start=supplierDate(p.startDate)
    return p.isActive === true && ids.has(String(p.tourPeriodId ?? p.periodId ?? p.id))
      && start != null && start >= today
  })
  // An undated cheapest price cannot establish live availability.
  return {...enrich, periods, periodPrices, cheapestPrice:null,
    supplier_inventory_checked_at:new Date().toISOString()}
}
