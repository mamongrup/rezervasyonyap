import type { CruiseVerticalMeta } from '@/lib/cruise-meta'
import type { TourDayPin } from '@/lib/tour-itinerary-geocoder'
import { geocodeFromText, geocodePlaceName } from '@/lib/tour-itinerary-geocoder'
import { formatCruisePlaceName, parseCruiseRouteStops } from '@/lib/cruise-route-display'

/** Kruvaziyer programı veya rota özetinden harita pin'leri */
export function parseCruiseItineraryPins(meta: CruiseVerticalMeta | null): TourDayPin[] {
  if (!meta) return []
  const pins: TourDayPin[] = []

  for (const d of meta.program_days ?? []) {
    const day = Number(d.day) || 0
    if (!day) continue
    const blob = `${d.title ?? ''} ${d.description ?? ''}`.trim()
    if (!blob) continue
    const city = geocodeFromText(blob)
    if (!city) continue
    if (pins.some((p) => p.day === day)) continue
    pins.push({
      day,
      title: d.title?.trim() || `Gün ${day}`,
      place: city.name,
      lat: city.lat,
      lng: city.lng,
    })
  }

  if (pins.length > 0) {
    return pins.sort((a, b) => a.day - b.day)
  }

  const stops = parseCruiseRouteStops(meta.route_summary ?? '')
  let day = 0
  for (const stop of stops) {
    const city = geocodePlaceName(stop)
    if (!city) continue
    const last = pins[pins.length - 1]
    if (last && last.place === city.name && last.lat === city.lat) continue
    day += 1
    const label = formatCruisePlaceName(stop)
    pins.push({
      day,
      title: label,
      place: city.name,
      lat: city.lat,
      lng: city.lng,
    })
  }

  return pins
}
