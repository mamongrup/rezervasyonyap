/** Wtatil DB dönemleri ↔ Gezinomi tourPeriods karşılaştırması */

function isoDateOnly(raw) {
  if (!raw) return ''
  const s = String(raw).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const m = s.match(/(\d{2})\.(\d{2})\.(\d{4})/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  return s.slice(0, 10)
}

export function summarizeWtatilPeriods(programDaysJson) {
  let program = programDaysJson
  if (typeof program === 'string') {
    try {
      program = JSON.parse(program)
    } catch {
      program = null
    }
  }
  if (!program || typeof program !== 'object') return []

  const periods = Array.isArray(program.periods) ? program.periods : []
  return periods.map((p) => ({
    id: p.id ?? p.periodId ?? p.tourPeriodId ?? null,
    start: isoDateOnly(p.startDate || p.periodStartDate),
    end: isoDateOnly(p.endDate || p.periodEndDate),
    price: p.totalPrice ?? p.tourPrice ?? p.double ?? null,
    quota: p.quota ?? null,
    source: 'wtatil',
  }))
}

export function periodRangeKey(p) {
  return `${p.start || '?'}_${p.end || '?'}`
}

/**
 * İki dönem listesini tarih aralığına göre karşılaştırır.
 * @returns {{ matched, onlyWtatil, onlyGezinomi, wtatilCount, gezinomiCount }}
 */
export function compareTourPeriods(wtatilPeriods, gezinomiPeriods) {
  const wMap = new Map()
  for (const p of wtatilPeriods || []) {
    const key = periodRangeKey(p)
    if (key !== '?_?') wMap.set(key, p)
  }

  const gMap = new Map()
  for (const p of gezinomiPeriods || []) {
    const key = periodRangeKey(p)
    if (key !== '?_?') gMap.set(key, p)
  }

  const matched = []
  const onlyWtatil = []
  const onlyGezinomi = []

  for (const [key, w] of wMap) {
    const g = gMap.get(key)
    if (g) {
      matched.push({ key, wtatil: w, gezinomi: g })
      gMap.delete(key)
    } else {
      onlyWtatil.push(w)
    }
  }
  for (const g of gMap.values()) {
    onlyGezinomi.push(g)
  }

  return {
    wtatilCount: wMap.size,
    gezinomiCount: (gezinomiPeriods || []).filter((p) => periodRangeKey(p) !== '?_?').length,
    matchedCount: matched.length,
    onlyWtatilCount: onlyWtatil.length,
    onlyGezinomiCount: onlyGezinomi.length,
    matched,
    onlyWtatil,
    onlyGezinomi,
    inSync: onlyWtatil.length === 0 && onlyGezinomi.length === 0 && matched.length > 0,
  }
}

export function formatPeriodCompareSummary(compare) {
  if (!compare.matchedCount && !compare.wtatilCount && !compare.gezinomiCount) {
    return 'dönem yok'
  }
  if (compare.inSync) {
    return `uyumlu (${compare.matchedCount} dönem)`
  }
  const parts = [`eşleşen ${compare.matchedCount}`]
  if (compare.onlyWtatilCount) parts.push(`yalnız wtatil ${compare.onlyWtatilCount}`)
  if (compare.onlyGezinomiCount) parts.push(`yalnız gezinomi ${compare.onlyGezinomiCount}`)
  return parts.join(', ')
}
