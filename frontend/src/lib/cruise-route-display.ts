/**
 * Kruvaziyer rota metinleri — slug/port listelerini okunur etiketlere çevirir.
 */

const REGION_SLUG_STOPWORDS = new Set([
  'gemi',
  'turlari',
  'turlar',
  'turu',
  'cruise',
  'cruises',
  'adalari',
  'adalar',
  'baskentleri',
  'balear',
])

function titleCaseTrWord(word: string): string {
  const w = word.trim()
  if (!w) return ''
  const lower = w.toLocaleLowerCase('tr')
  return lower.charAt(0).toLocaleUpperCase('tr') + lower.slice(1)
}

/** Tek liman / bölge adı (ör. kopenhag → Kopenhag, palma-de-mallorca → Palma De Mallorca) */
export function formatCruisePlaceName(raw: string): string {
  const s = String(raw ?? '').trim()
  if (!s) return ''
  if (s.includes(' ') && !s.includes('-')) {
    return s
      .split(/\s+/)
      .filter(Boolean)
      .map(titleCaseTrWord)
      .join(' ')
  }
  return s
    .split(/[-_/]+/)
    .filter(Boolean)
    .map(titleCaseTrWord)
    .join(' ')
}

/** route_summary içindeki durakları sırayla döndürür */
export function parseCruiseRouteStops(routeSummary: string): string[] {
  const raw = String(routeSummary ?? '').trim()
  if (!raw) return []

  if (raw.includes('->') || raw.includes('→')) {
    const sep = raw.includes('→') ? '→' : '->'
    return raw
      .split(sep)
      .map((p) => p.trim())
      .filter(Boolean)
  }

  if (!raw.includes(' ') && raw.includes('-')) {
    return raw
      .split('-')
      .map((p) => p.trim())
      .filter((p) => p && !REGION_SLUG_STOPWORDS.has(p.toLowerCase()))
  }

  return [raw]
}

/** Kalkış limanı (ilk durak) */
export function cruiseRouteStartLabel(routeSummary: string): string {
  const stops = parseCruiseRouteStops(routeSummary)
  if (stops.length === 0) return ''
  return formatCruisePlaceName(stops[0]!)
}

/** Tam rota — okunur bağlaçlarla */
export function formatCruiseRouteSummary(routeSummary: string): string {
  const stops = parseCruiseRouteStops(routeSummary)
  if (stops.length === 0) return ''
  if (stops.length === 1) return formatCruisePlaceName(stops[0]!)
  return stops.map(formatCruisePlaceName).join(' → ')
}

export function cruiseNightCountLabel(nights: number, locale: string): string {
  const en = locale === 'en' || locale.startsWith('en-')
  if (en) return nights === 1 ? '1 night' : `${nights} nights`
  return `${nights} gece`
}

/** Gemi hattı kısa etiketi (hub kartları) */
export function formatCruiseBrandLabel(cruiseLine: string): string {
  const line = String(cruiseLine ?? '').trim()
  if (!line) return ''
  const lower = line.toLowerCase()
  if (lower.includes('msc')) return 'MSC'
  if (lower.includes('costa')) return 'Costa'
  if (lower.includes('royal')) return 'Royal Caribbean'
  if (lower.includes('celebrity')) return 'Celebrity'
  if (lower.includes('princess')) return 'Princess'
  if (lower.includes('celestyal')) return 'Celestyal'
  if (lower.includes('norwegian')) return 'Norwegian'
  if (lower.includes('carnival')) return 'Carnival'
  if (lower.includes('disney')) return 'Disney'
  if (lower.includes('aroya')) return 'Aroya'
  if (lower.includes('selectum')) return 'Selectum Blu'
  if (lower.includes('amadeus')) return 'Amadeus'
  return formatCruisePlaceName(line)
}

export function hubOfferMetaLabel(parts: string[]): string {
  return parts.filter(Boolean).join(' · ')
}
