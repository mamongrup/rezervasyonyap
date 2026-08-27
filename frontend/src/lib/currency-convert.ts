import type { PublicCurrencyRateRow } from '@/lib/travel-api'

type Edge = { from: string; to: string; factor: number }

function buildEdges(rates: PublicCurrencyRateRow[]): Edge[] {
  // En yeni tarihli kurlar öncelikli olsun
  const sorted = [...rates].sort((a, b) => {
    const ta = a.fetched_at ? new Date(a.fetched_at).getTime() : 0
    const tb = b.fetched_at ? new Date(b.fetched_at).getTime() : 0
    return tb - ta
  })

  const directMap = new Map<string, Edge>()
  const invertedMap = new Map<string, Edge>()

  for (const r of sorted) {
    const b = r.base_code?.trim().toUpperCase()
    const q = r.quote_code?.trim().toUpperCase()
    if (!b || !q || !Number.isFinite(r.rate) || r.rate <= 0) continue

    const keyDirect = `${b}->${q}`
    if (!directMap.has(keyDirect)) {
      directMap.set(keyDirect, { from: b, to: q, factor: r.rate })
    }

    const keyInverted = `${q}->${b}`
    if (!invertedMap.has(keyInverted)) {
      invertedMap.set(keyInverted, { from: q, to: b, factor: 1 / r.rate })
    }
  }

  // Önce doğrudan kurlar, ardından doğrudan karşılığı olmayan çiftler için ters kurlar
  const edges: Edge[] = Array.from(directMap.values())
  for (const [key, inv] of invertedMap.entries()) {
    if (!directMap.has(key)) {
      edges.push(inv)
    }
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
