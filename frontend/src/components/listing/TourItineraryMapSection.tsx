'use client'

import type { TourDayPin } from '@/lib/tour-itinerary-geocoder'
import { Map, MapControls, MapMarker, MarkerContent, MarkerPopup, MapRoute, useMap } from '@/components/ui/map'
import { getMessages } from '@/utils/getT'
import { LngLatBounds } from 'maplibre-gl'
import { useEffect, useRef, useState } from 'react'
import { LISTING_SECTION_STACKED } from '@/app/[locale]/(app)/(listings)/listing-section-classes'
import { SectionHeading } from '@/app/[locale]/(app)/(listings)/components/SectionHeading'
import { Divider } from '@/shared/divider'
import { MapPin } from 'lucide-react'

// ─── Harita iç controller (bounds fit için) ────────────────────────────────

function TourMapController({ pins, activePinDay }: { pins: TourDayPin[]; activePinDay: number | null }) {
  const { map, isLoaded } = useMap()

  // İlk yüklemede tüm pin'lere sığdır
  useEffect(() => {
    if (!isLoaded || !map || pins.length === 0) return
    if (pins.length === 1) {
      map.flyTo({ center: [pins[0].lng, pins[0].lat], zoom: 8, duration: 800 })
      return
    }
    const bounds = new LngLatBounds()
    pins.forEach((p) => bounds.extend([p.lng, p.lat]))
    map.fitBounds(bounds, { padding: 60, duration: 800, maxZoom: 9 })
  }, [isLoaded, map, pins])

  // Aktif güne uç
  useEffect(() => {
    if (!isLoaded || !map || activePinDay === null) return
    const pin = pins.find((p) => p.day === activePinDay)
    if (pin) {
      map.flyTo({ center: [pin.lng, pin.lat], zoom: 8, duration: 600 })
    }
  }, [isLoaded, map, activePinDay, pins])

  return null
}

// ─── Ana bölüm ────────────────────────────────────────────────────────────

export default function TourItineraryMapSection({
  pins,
  locale = 'tr',
}: {
  pins: TourDayPin[]
  locale?: string
}) {
  const m = getMessages(locale)
  const td = m.listing.tourDetail
  const [activePinDay, setActivePinDay] = useState<number | null>(null)

  const dayListRef = useRef<HTMLDivElement>(null)

  if (pins.length === 0) return null

  const routeCoords: [number, number][] = pins.map((p) => [p.lng, p.lat])

  const handleMarkerClick = (day: number) => {
    setActivePinDay((prev) => (prev === day ? null : day))
    // Listedeki ilgili öğeye scroll
    const el = dayListRef.current?.querySelector(`[data-day="${day}"]`) as HTMLElement | null
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  const handleDayClick = (day: number) => {
    setActivePinDay((prev) => (prev === day ? null : day))
  }

  const mapSectionTitle = td?.itineraryMapTitle ?? 'Güzergâh Haritası'

  return (
    <section id="tour-section-map" className={LISTING_SECTION_STACKED}>
      <SectionHeading>{mapSectionTitle}</SectionHeading>
      <Divider className="w-14!" />

      <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
        {/* Sol: Gün listesi */}
        <div
          ref={dayListRef}
          className="flex flex-row gap-2 overflow-x-auto pb-1 lg:w-56 lg:shrink-0 lg:flex-col lg:overflow-x-visible lg:overflow-y-auto lg:pb-0"
          style={{ maxHeight: '420px' }}
        >
          {pins.map((pin) => (
            <button
              key={pin.day}
              data-day={pin.day}
              type="button"
              onClick={() => handleDayClick(pin.day)}
              className={`flex min-w-[9rem] shrink-0 cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 text-left text-sm transition-all lg:min-w-0 lg:w-full ${
                activePinDay === pin.day
                  ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm dark:border-primary-400 dark:bg-primary-900/30 dark:text-primary-200'
                  : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:border-neutral-600'
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  activePinDay === pin.day
                    ? 'bg-primary-500 text-white dark:bg-primary-400 dark:text-neutral-900'
                    : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200'
                }`}
              >
                {pin.day}
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold leading-tight">{pin.place}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-neutral-500 dark:text-neutral-400">{pin.title}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Sağ: Harita */}
        <div className="relative overflow-hidden rounded-2xl lg:flex-1" style={{ minHeight: '360px', height: '420px' }}>
          <Map className="h-full w-full">
            <TourMapController pins={pins} activePinDay={activePinDay} />
            <MapControls showZoom position="bottom-right" />

            {/* Güzergâh çizgisi */}
            {routeCoords.length > 1 && (
              <MapRoute
                coordinates={routeCoords}
                color="#6366f1"
                width={2.5}
                opacity={0.7}
                dashArray={[4, 3]}
              />
            )}

            {/* Gün marker'ları */}
            {pins.map((pin) => {
              const isActive = activePinDay === pin.day
              return (
                <MapMarker
                  key={pin.day}
                  longitude={pin.lng}
                  latitude={pin.lat}
                  anchor="center"
                  onClick={() => handleMarkerClick(pin.day)}
                >
                  <MarkerContent>
                    <div
                      className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-2 text-sm font-bold shadow-md transition-transform duration-150 ${
                        isActive
                          ? 'scale-125 border-white bg-primary-500 text-white shadow-lg'
                          : 'border-white bg-indigo-600 text-white hover:scale-110'
                      }`}
                    >
                      {pin.day}
                    </div>
                  </MarkerContent>
                  <MarkerPopup>
                    <div className="rounded-xl bg-white px-3 py-2 shadow-lg dark:bg-neutral-900">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-primary-500" />
                        <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-100">
                          {pin.day}. gün
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-medium text-neutral-600 dark:text-neutral-300">{pin.place}</p>
                      <p className="mt-0.5 max-w-[180px] text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-2">{pin.title}</p>
                    </div>
                  </MarkerPopup>
                </MapMarker>
              )
            })}
          </Map>
        </div>
      </div>
    </section>
  )
}
