import type { TravelIdea } from '@/lib/travel-api'

/** JSON/DB bazen sayı veya başka tipte döner; `.trim()` çağrılarında güvenli metin. */
export function asTrimmedString(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v.trim()
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  return String(v).trim()
}

/** API `travel_ideas_json` alanı string veya dizi olabilir. */
export function parseTravelIdeas(raw: unknown): TravelIdea[] {
  if (raw == null) return []
  if (Array.isArray(raw)) return raw as TravelIdea[]
  if (typeof raw === 'string') {
    const s = asTrimmedString(raw)
    if (s === '') return []
    try {
      const parsed = JSON.parse(s) as unknown
      return Array.isArray(parsed) ? (parsed as TravelIdea[]) : []
    } catch {
      return []
    }
  }
  return []
}
