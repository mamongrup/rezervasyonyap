import type { PublicCurrencyRateRow } from '@/lib/travel-api'

type Edge = { from: string; to: string; factor: number }

function buildEdges(rates: PublicCurrencyRateRow[]): Edge[] {
  const edges: Edge[] = []
  for (const r of rates) {
    const b = r.base_code.toUpperCase()
    const q = r.quote_code.toUpperCase()
    if (!b || !q || !Number.isFinite(r.rate) || r.rate === 0) continue
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
  const F = fromCode.toUpperCase()
  const T = toCode.toUpperCase()
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
