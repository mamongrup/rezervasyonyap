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
