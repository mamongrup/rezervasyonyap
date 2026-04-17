import type { TravelIdea } from '@/lib/travel-api'

/** API `travel_ideas_json` alanı string veya dizi olabilir. */
export function parseTravelIdeas(raw: unknown): TravelIdea[] {
  if (raw == null) return []
  if (Array.isArray(raw)) return raw as TravelIdea[]
  if (typeof raw === 'string') {
    const s = raw.trim()
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
