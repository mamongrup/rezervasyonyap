import type { PublicCurrencyRateRow } from '@/lib/travel-api'

type Edge = { from: string; to: string; factor: number }

function buildEdges(rates: PublicCurrencyRateRow[]): Edge[] {
  const edges: Edge[] = []
  for (const r of rates) {
    const b = r.base_code.trim().toUpperCase()
    const q = r.quote_code.trim().toUpperCase()
    if (!b || !q || !Number.isFinite(r.rate) || r.rate <= 0) continue
    edges.push({ from: b, to: q, factor: r.rate })
    edges.push({ from: q, to: b, factor: 1 / r.rate })
  }
  return edges
}

/**
 * `rates`: 1 `base_code` = `rate` adet `quote_code` (TCMB tarzı).
 * BFS ile en kısa yoldan dönüştürür; yol yoksa `null`.
 */
export function convertAmountWithRates(
  amount: number,
  fromCode: string,
  toCode: string,
  rates: PublicCurrencyRateRow[],
): number | null {
  if (!Number.isFinite(amount)) return null
  const F = fromCode.trim().toUpperCase()
  const T = toCode.trim().toUpperCase()
  if (!F || !T) return null
  if (F === T) return amount
  const edges = buildEdges(rates)
  const queue: { cur: string; val: number }[] = [{ cur: F, val: amount }]
  const visited = new Set<string>([F])
  while (queue.length > 0) {
    const { cur, val } = queue.shift()!
    if (cur === T) return val
    for (const e of edges) {
      if (e.from === cur && !visited.has(e.to)) {
        visited.add(e.to)
        queue.push({ cur: e.to, val: val * e.factor })
      }
    }
  }
  return null
}

export type DisplayMoney = {
  amount: number
  currencyCode: string
  converted: boolean
}

/**
 * Vitrinde tutar ile para birimi simgesinin ayrışmasını önler.
 * Kur yolu yoksa kaynak tutarı ve kaynak para birimini birlikte korur.
 */
export function resolveDisplayMoney(
  amount: number,
  fromCode: string,
  preferredCode: string,
  rates: PublicCurrencyRateRow[],
): DisplayMoney | null {
  if (!Number.isFinite(amount)) return null
  const source = fromCode.trim().toUpperCase()
  const target = preferredCode.trim().toUpperCase() || source
  if (!source) return null
  if (source === target) return { amount, currencyCode: source, converted: false }

  const converted = convertAmountWithRates(amount, source, target, rates)
  return converted == null
    ? { amount, currencyCode: source, converted: false }
    : { amount: converted, currencyCode: target, converted: true }
}
