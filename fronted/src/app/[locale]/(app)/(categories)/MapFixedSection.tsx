'use client'

import CarCard from '@/components/CarCard'
import ExperiencesCard from '@/components/ExperiencesCard'
import StayCard from '@/components/StayCard'
import { Map, MapControls, MapMarker, MarkerContent, MarkerPopup, useMap } from '@/components/ui/map'
import { useConvertedListingPrice } from '@/contexts/preferred-currency-context'
import type { TListingBase } from '@/types/listing-types'
import { TCarListing, TExperienceListing } from '@/data/listings'
import { Button } from '@/shared/Button'
import ButtonClose from '@/shared/ButtonClose'
import { ListingType } from '@/type'
import T from '@/utils/getT'
import { Cancel01Icon, Settings01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { LngLatBounds } from 'maplibre-gl'
import { useEffect, useMemo, useRef, useState } from 'react'

type ListingPriceFields = {
  price?: string
  priceAmount?: number
  priceCurrency?: string
}

function MapMarkerPriceLabel({
  isHovered,
  listing,
}: {
  isHovered: boolean
  listing: ListingPriceFields
}) {
  const label = useConvertedListingPrice(listing.price, listing.priceAmount, listing.priceCurrency)
  return (
    <p
      className={`flex min-w-max cursor-pointer items-center justify-center rounded-full px-3 py-1.5 text-sm font-semibold shadow-[0_2px_8px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.06] transition-all duration-150 dark:ring-white/10 ${
        isHovered
          ? 'scale-105 bg-neutral-900 text-white ring-black/20 dark:bg-white dark:text-neutral-900'
          : 'bg-white text-neutral-900 hover:scale-[1.02] dark:bg-neutral-700 dark:text-white'
      }`}
    >
      {label}
    </p>
  )
}

type ListingWithMap = {
  id: string
  map?: { lat: number; lng: number }
}

function MapFitListingBounds({ listings }: { listings: ListingWithMap[] }) {
  const { map, isLoaded } = useMap()
  const listingsKey = useMemo(
    () =>
      listings
        .filter((l) => l.map)
        .map((l) => `${l.id}:${l.map!.lng.toFixed(5)},${l.map!.lat.toFixed(5)}`)
        .join('|'),
    [listings],
  )

  useEffect(() => {
    if (!isLoaded || !map || !listingsKey) return
    const pts: [number, number][] = []
    for (const l of listings) {
      if (!l.map) continue
      const { lng, lat } = l.map
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue
      pts.push([lng, lat])
    }
    if (pts.length === 0) return

    const run = () => {
      map.resize()
      if (pts.length === 1) {
        map.jumpTo({ center: pts[0], zoom: 11 })
        return
      }
      const b = new LngLatBounds(pts[0], pts[0])
      for (let i = 1; i < pts.length; i++) {
        b.extend(pts[i])
      }
      map.fitBounds(b, {
        padding: 48,
        maxZoom: 12,
        duration: 0,
        essential: true,
      })
      map.resize()
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(run)
    })
  }, [isLoaded, listingsKey, map, listings])

  return null
}

function MapHoverEaseToListing({ hoverId, listings }: { hoverId: string; listings: ListingWithMap[] }) {
  const { map, isLoaded } = useMap()
  const listingsRef = useRef(listings)
  listingsRef.current = listings

  useEffect(() => {
    if (!isLoaded || !map || !hoverId) return
    const listing = listingsRef.current.find((l) => l.id === hoverId)
    const m = listing?.map
    if (!m || !Number.isFinite(m.lng) || !Number.isFinite(m.lat)) return
    map.stop()
    const z = map.getZoom()
    map.easeTo({
      center: [m.lng, m.lat],
      zoom: z < 10.5 ? 11 : Math.min(z, 14),
      duration: 420,
      essential: true,
    })
  }, [hoverId, isLoaded, map])

  return null
}

interface Props {
  currentHoverID: string
  listings: TListingBase[] | TExperienceListing[] | TCarListing[]
  listingType: ListingType
  closeButtonHref: string
}

const MapFixedSection = ({ closeButtonHref, currentHoverID: selectedID, listings, listingType }: Props) => {
  const [currentHoverID, setCurrentHoverID] = useState<string>('')
  const [mapTheme, setMapTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    setCurrentHoverID(selectedID)
  }, [selectedID])

  const first = listings.find((l) => l.map)?.map
  const initialCenter: [number, number] = first ? [first.lng, first.lat] : [28.9784, 41.0082]

  return (
    <div
      className={
        'flex w-full min-w-0 flex-col overflow-hidden ' +
        'max-lg:fixed max-lg:inset-0 max-lg:z-[18] max-lg:h-[100dvh] max-lg:bg-white dark:max-lg:bg-neutral-900 ' +
        'lg:sticky lg:top-16 lg:z-[18] lg:self-start lg:w-full ' +
        'lg:h-[calc(100dvh-4rem)] lg:max-h-[calc(100dvh-4rem)] ' +
        'lg:bg-neutral-100/50 dark:lg:bg-neutral-900/30'
      }
    >
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="relative min-h-[min(52dvh,520px)] flex-1 overflow-hidden lg:min-h-0 lg:flex-1">
          <Map
            center={initialCenter}
            zoom={11}
            theme={mapTheme}
            className="absolute inset-0 min-h-0 h-full w-full max-w-full min-w-0"
          >
            <MapFitListingBounds listings={listings} />
            <MapHoverEaseToListing hoverId={currentHoverID} listings={listings} />
            <MapControls position="bottom-right" showFullscreen={false} showZoom />
            {listings.map((listing) => {
              const coords = listing.map
              if (!coords) return null
              return (
                <MapMarker key={listing.id} longitude={coords.lng} latitude={coords.lat} anchor="center">
                  <MarkerContent>
                    <MapMarkerPriceLabel
                      isHovered={currentHoverID === listing.id}
                      listing={listing}
                    />
                  </MarkerContent>
                  <MarkerPopup className="rounded-2xl! p-0!">
                    <div className="w-60 focus:outline-none sm:w-80">
                      {listingType === 'Stays' && <StayCard size="small" data={listing as TListingBase} />}
                      {listingType === 'Experiences' && (
                        <ExperiencesCard
                          size="small"
                          data={listing as TExperienceListing}
                          ratioClass="aspect-w-12 aspect-h-10"
                          className="rounded-3xl bg-white dark:bg-neutral-900"
                        />
                      )}
                      {listingType === 'Cars' && (
                        <CarCard className="border-0!" size="small" data={listing as TCarListing} />
                      )}
                    </div>
                  </MarkerPopup>
                </MapMarker>
              )
            })}
          </Map>
        </div>

        <div className="pointer-events-none absolute inset-0 z-20">
          <div className="pointer-events-auto absolute top-4 left-4">
            <ButtonClose
              color="white"
              href={closeButtonHref}
              className="size-11 shadow-[0_2px_12px_rgba(0,0,0,0.12)] ring-1 ring-black/8"
            />
          </div>
          <div className="pointer-events-auto absolute top-4 right-4">
            <button
              type="button"
              className="flex size-11 items-center justify-center rounded-full border border-neutral-200/90 bg-white text-neutral-700 shadow-[0_2px_12px_rgba(0,0,0,0.12)] ring-1 ring-black/5 transition hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:ring-white/10 dark:hover:bg-neutral-700"
              onClick={() => setMapTheme((t) => (t === 'light' ? 'dark' : 'light'))}
              aria-label={mapTheme === 'light' ? 'Koyu harita' : 'Açık harita'}
              title={mapTheme === 'light' ? 'Koyu harita' : 'Açık harita'}
            >
              <HugeiconsIcon icon={Settings01Icon} className="size-5" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        <div className="pointer-events-auto absolute bottom-6 left-1/2 z-[21] -translate-x-1/2 lg:hidden">
          <Button
            color="white"
            href={closeButtonHref}
            className="shadow-[0_4px_16px_rgba(0,0,0,0.12)] ring-1 ring-black/8"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="size-5" strokeWidth={1.75} />
            <span className="text-sm font-medium">{T['common']['Hide map']}</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default MapFixedSection
