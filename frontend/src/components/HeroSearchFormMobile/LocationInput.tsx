'use client'

import type { SearchSuggestion } from '@/app/api/listing-search/route'
import type { LocationSuggestion } from '@/app/api/location-search/route'
import { Search01Icon } from '@/components/Icons'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import {
  airportDisplayName,
  POPULAR_FLIGHT_AIRPORTS,
  findAirportByCode,
  searchFlightAirports,
  type FlightAirport,
} from '@/lib/flight-airports'
import { SEARCH_MIN_QUERY_LEN } from '@/lib/search-listings-display'
import { getMessages } from '@/utils/getT'
import {
  Airplane01Icon,
  Building03Icon,
  MapPinIcon,
  Route01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import { useParams, useRouter } from 'next/navigation'
import { FC, useCallback, useEffect, useRef, useState } from 'react'

export type LocationSearchMode = 'stay' | 'car' | 'tour' | 'flight'

interface Props {
  onClick?: () => void
  onChange?: (value: string) => void
  className?: string
  defaultValue?: string
  headingText?: string
  imputName?: string
  /**
   * stay: bölge + ilan
   * tour: hub + destinasyon + tur/aktivite ilanı
   * car: Yolcu360 / şehir
   * flight: havalimanı IATA
   */
  locationSearchType?: LocationSearchMode
  /** listing-search `category_code` (otel, tur, …) */
  listingCategoryCode?: string
}

type PlaceRow = {
  id: string
  name: string
  hubPath?: string
  kind: 'place' | 'hub' | 'airport'
}

const POPULAR_DESTINATIONS_TR = [
  'İstanbul', 'Antalya', 'Kapadokya', 'Bodrum', 'İzmir',
]
const POPULAR_DESTINATIONS_MORE = [
  'Trabzon', 'Fethiye', 'Alanya', 'Marmaris', 'Çeşme',
]

function airportRow(a: FlightAirport): PlaceRow {
  return {
    id: `airport-${a.code}`,
    name: airportDisplayName(a),
    kind: 'airport',
  }
}

function placeFromSuggestion(s: LocationSuggestion): PlaceRow {
  if (s.type === 'tour_hub') {
    return { id: s.id, name: s.name, hubPath: s.hubPath, kind: 'hub' }
  }
  return { id: s.id, name: s.name, kind: 'place' }
}

const LocationInput: FC<Props> = ({
  onChange,
  className,
  defaultValue = '',
  headingText,
  imputName = 'location',
  locationSearchType = 'stay',
  listingCategoryCode,
}) => {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const m = getMessages(locale)
  const loc = m.mobile.location
  const hf = m.HeroSearchForm
  const resolvedHeading = headingText ?? hf['Where to?']
  const router = useRouter()
  const vitrinHref = useVitrinHref()
  const [value, setValue] = useState('')
  const [placeResults, setPlaceResults] = useState<PlaceRow[]>([])
  const [popularPlaces, setPopularPlaces] = useState<PlaceRow[]>([])
  const [listingResults, setListingResults] = useState<SearchSuggestion[]>([])
  const [loadingSearch, setLoadingSearch] = useState(false)
  const containerRef = useRef(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const listingAbortRef = useRef<AbortController | null>(null)

  const isCar = locationSearchType === 'car'
  const isTour = locationSearchType === 'tour'
  const isFlight = locationSearchType === 'flight'
  const includeListings = !isCar && !isFlight

  const locationSearchQs = isCar ? '?type=car' : isTour ? '?type=tour' : ''

  useEffect(() => {
    setValue(defaultValue)
  }, [defaultValue])

  useEffect(() => {
    if (isFlight) {
      setPopularPlaces(
        POPULAR_FLIGHT_AIRPORTS.map((code) => findAirportByCode(code)).flatMap((a) =>
          a ? [airportRow(a)] : [],
        ),
      )
      return
    }
    let cancelled = false
    fetch(`/api/location-search${locationSearchQs}`)
      .then((r) => r.json())
      .then((d: { suggestions: LocationSuggestion[] }) => {
        if (cancelled || !d.suggestions?.length) return
        setPopularPlaces(d.suggestions.map(placeFromSuggestion))
      })
      .catch(() => {
        /* statik liste kalır */
      })
    return () => {
      cancelled = true
    }
  }, [locationSearchQs, isFlight])

  useEffect(
    () => () => {
      if (searchDebounceRef.current != null) clearTimeout(searchDebounceRef.current)
      listingAbortRef.current?.abort()
    },
    [],
  )

  const runCombinedSearch = useCallback(
    async (q: string) => {
      const trimmed = q.trim()
      if (!trimmed) {
        setPlaceResults([])
        setListingResults([])
        return
      }

      if (isFlight) {
        setLoadingSearch(true)
        try {
          setPlaceResults(searchFlightAirports(trimmed, 10).map(airportRow))
          setListingResults([])
        } finally {
          setLoadingSearch(false)
        }
        return
      }

      setLoadingSearch(true)
      listingAbortRef.current?.abort()
      const listingController = new AbortController()
      listingAbortRef.current = listingController
      try {
        const typeQs = isCar ? '&type=car' : isTour ? '&type=tour' : ''
        const locationPromise = fetch(
          `/api/location-search?q=${encodeURIComponent(trimmed)}${typeQs}`,
        )
          .then((r) => r.json() as Promise<{ suggestions: LocationSuggestion[] }>)
          .then((d) => (d.suggestions ?? []).map(placeFromSuggestion))
          .catch(() => [] as PlaceRow[])

        const catQs =
          listingCategoryCode
            ? `&category_code=${encodeURIComponent(listingCategoryCode)}`
            : ''
        const listingPromise =
          includeListings && trimmed.length >= SEARCH_MIN_QUERY_LEN
            ? fetch(
                `/api/listing-search?q=${encodeURIComponent(trimmed)}&locale=${locale}&limit=6${catQs}`,
                { signal: listingController.signal },
              )
                .then((r) => r.json() as Promise<{ suggestions: SearchSuggestion[] }>)
                .then((d) => (d.suggestions ?? []).filter((s) => s.type === 'listing'))
                .catch((error) => {
                  if (error instanceof DOMException && error.name === 'AbortError') return null
                  return [] as SearchSuggestion[]
                })
            : Promise.resolve([] as SearchSuggestion[])

        const [places, listings] = await Promise.all([locationPromise, listingPromise])
        setPlaceResults(places)
        if (listings != null) setListingResults(listings)
      } finally {
        setLoadingSearch(false)
      }
    },
    [includeListings, isCar, isFlight, isTour, listingCategoryCode, locale],
  )

  const scheduleLocationSearch = useCallback(
    (q: string) => {
      if (searchDebounceRef.current != null) clearTimeout(searchDebounceRef.current)
      searchDebounceRef.current = setTimeout(() => {
        searchDebounceRef.current = null
        void runCombinedSearch(q)
      }, 280)
    },
    [runCombinedSearch],
  )

  const handleSelectPlace = (item: PlaceRow) => {
    if (item.kind === 'hub' && item.hubPath) {
      router.push(vitrinHref(item.hubPath))
      return
    }
    const next =
      item.kind === 'airport'
        ? (item.id.replace(/^airport-/, '') || item.name)
        : item.name
    setTimeout(() => {
      setValue(item.kind === 'airport' ? item.name : next)
      onChange?.(next)
    }, 0)
  }

  const handleSelectListing = (href: string) => {
    router.push(vitrinHref(href))
  }

  const filteredStaticPlaces: PlaceRow[] = [...POPULAR_DESTINATIONS_TR, ...POPULAR_DESTINATIONS_MORE]
    .filter((d) => d.toLocaleLowerCase(locale).includes(value.toLocaleLowerCase(locale)))
    .map((name) => ({ id: `static-${name}`, name, kind: 'place' as const }))

  const popularItems =
    popularPlaces.length > 0
      ? popularPlaces.slice(0, isCar || isFlight ? 12 : 6)
      : POPULAR_DESTINATIONS_TR.map((name) => ({
          id: `static-${name}`,
          name,
          kind: 'place' as const,
        }))

  const searchPlaces =
    placeResults.length > 0
      ? placeResults
      : isCar || isFlight || isTour
        ? placeResults
        : filteredStaticPlaces

  const hubs = searchPlaces.filter((p) => p.kind === 'hub')
  const destinations = searchPlaces.filter((p) => p.kind !== 'hub')

  const renderPlaceGroup = ({
    heading,
    items,
    hubStyle,
  }: {
    heading: string
    items: PlaceRow[]
    hubStyle?: boolean
  }) => {
    if (items.length === 0) return null
    return (
      <div className="mb-5 last:mb-0">
        <p className="block text-base font-semibold">{heading}</p>
        <div className="mt-3">
          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              className="mb-1 flex w-full cursor-pointer items-center gap-x-3 py-2 text-start text-sm"
              onClick={() => handleSelectPlace(item)}
            >
              <HugeiconsIcon
                icon={
                  hubStyle
                    ? Route01Icon
                    : isFlight
                      ? Airplane01Icon
                      : MapPinIcon
                }
                className={clsx(
                  'h-5 w-5 shrink-0',
                  hubStyle
                    ? 'text-primary-500 dark:text-primary-400'
                    : 'text-neutral-500 dark:text-neutral-400',
                )}
                strokeWidth={1.75}
              />
              <span className="min-w-0 truncate">{item.name.replace(/\s—\s.+$/, '')}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const renderListingValues = () => {
    if (!includeListings || listingResults.length === 0) return null
    return (
      <div>
        <p className="block text-base font-semibold">
          {loc.listingsHeading ?? hf.Listings}
        </p>
        <div className="mt-3">
          {listingResults.map((item) => (
            <button
              type="button"
              key={`${item.type}-${item.id}`}
              className="mb-1 flex w-full cursor-pointer items-center gap-x-3 py-2 text-start text-sm"
              onClick={() => handleSelectListing(item.href)}
            >
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.image}
                  alt=""
                  className="h-9 w-9 shrink-0 rounded-lg object-cover"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
              ) : (
                <HugeiconsIcon
                  icon={Building03Icon}
                  className="h-5 w-5 shrink-0 text-neutral-500 dark:text-neutral-400"
                  strokeWidth={1.75}
                />
              )}
              <span className="min-w-0">
                <span className="block truncate font-medium">{item.title}</span>
                {item.subtitle ? (
                  <span className="block truncate text-xs text-neutral-500">{item.subtitle}</span>
                ) : null}
              </span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const showSearching =
    Boolean(value) &&
    loadingSearch &&
    searchPlaces.length === 0 &&
    listingResults.length === 0

  const placeholder = isCar
    ? hf['City or Airport']
    : isFlight
      ? hf['City or Airport']
      : hf['Search destinations']

  return (
    <div className={clsx(className)} ref={containerRef}>
      <h3 className="text-xl font-semibold sm:text-2xl">{resolvedHeading}</h3>
      <div className="relative mt-5">
        <input
          className="block w-full truncate rounded-xl border border-neutral-300 bg-transparent px-4 py-3 pe-12 leading-none font-normal placeholder-neutral-500 placeholder:truncate focus:border-primary-300 focus:ring-3 focus:ring-primary-200/50 sm:text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:placeholder-neutral-300 dark:focus:ring-primary-600/25"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            const next = e.currentTarget.value
            setValue(next)
            if (!next.trim()) {
              setPlaceResults([])
              setListingResults([])
            }
            scheduleLocationSearch(next)
          }}
          ref={inputRef}
          name={imputName}
          autoComplete="off"
          autoFocus
          data-autofocus
        />
        <span className="absolute end-2.5 top-1/2 -translate-y-1/2">
          <Search01Icon className="h-5 w-5 text-neutral-700 dark:text-neutral-400" />
        </span>
      </div>
      <div className="mt-7">
        {value ? (
          showSearching ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {hf.searchingLocations}
            </p>
          ) : (
            <>
              {renderPlaceGroup({
                heading: isTour
                  ? (loc.tourCategoriesHeading ?? 'Tur kategorileri')
                  : loc.destinationsHeading,
                items: isTour ? hubs : [],
                hubStyle: true,
              })}
              {renderPlaceGroup({
                heading: isFlight
                  ? (loc.airportsHeading ?? hf['City or Airport'])
                  : loc.destinationsHeading,
                items: isTour ? destinations : searchPlaces.filter((p) => p.kind !== 'hub'),
              })}
              {renderListingValues()}
            </>
          )
        ) : (
          renderPlaceGroup({
            heading: isFlight
              ? (loc.airportsHeading ?? hf['City or Airport'])
              : loc.popularDestinationsHeading,
            items: popularItems,
          })
        )}
      </div>
    </div>
  )
}

export default LocationInput
