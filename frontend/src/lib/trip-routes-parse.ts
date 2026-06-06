import { asTrimmedString } from '@/lib/travel-ideas-parse'

export type TripRouteStop = {
  name: string
  summary?: string
  duration_hours?: number
}

export type TripRouteDay = {
  day: number
  title: string
  stops?: TripRouteStop[]
  overnight?: string
}

export type TripRoute = {
  id?: string
  title: string
  duration_days?: number
  difficulty?: string
  best_season?: string[]
  summary?: string
  days?: TripRouteDay[]
}

export type BlueCruiseLeg = {
  day: number
  from: string
  to: string
  anchor_type?: string
  highlights?: string[]
}

export type BlueCruiseRoute = {
  id?: string
  title: string
  duration_nights?: number
  summary?: string
  embarkation?: { port?: string }
  disembarkation?: { port?: string }
  vessel_types?: string[]
  legs?: BlueCruiseLeg[]
}

function parseJsonArray<T>(raw: unknown): T[] {
  if (raw == null) return []
  let arr: unknown = raw
  if (typeof raw === 'string') {
    const s = asTrimmedString(raw)
    if (!s) return []
    try {
      arr = JSON.parse(s) as unknown
    } catch {
      return []
    }
  }
  return Array.isArray(arr) ? (arr as T[]) : []
}

export function parseTripRoutes(raw: unknown): TripRoute[] {
  return parseJsonArray<TripRoute>(raw).filter((r) => asTrimmedString(r?.title) !== '')
}

export function parseBlueCruiseRoutes(raw: unknown): BlueCruiseRoute[] {
  return parseJsonArray<BlueCruiseRoute>(raw).filter((r) => asTrimmedString(r?.title) !== '')
}
