'use client'

import type { SearchSuggestion } from '@/app/api/listing-search/route'
import type { LocationSuggestion } from '@/app/api/location-search/route'
import { Search01Icon } from '@/components/Icons'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { SEARCH_MIN_QUERY_LEN } from '@/lib/search-listings-display'
import { getMessages } from '@/utils/getT'
import { Building03Icon, MapPinIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import { useParams, useRouter } from 'next/navigation'
import { FC, useCallback, useEffect, useRef, useState } from 'react'

interface Props {
  onClick?: () => void
  onChange?: (value: string) => void
  className?: string
  defaultValue?: string
  headingText?: string
  imputName?: string
  /** Araç kiralama: Yolcu360 konum önerileri (`/api/location-search?type=car`) */
  locationSearchType?: 'car'
}

const POPULAR_DESTINATIONS_TR = [
  'İstanbul', 'Antalya', 'Kapadokya', 'Bodrum', 'İzmir',
]
const POPULAR_DESTINATIONS_MORE = [
  'Trabzon', 'Fethiye', 'Alanya', 'Marmaris', 'Çeşme',
]

const LocationInput: FC<Props> = ({
  onChange,
  className,
  defaultValue = '',
  headingText,
  imputName = 'location',
  locationSearchType,
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
  const [apiPopular, setApiPopular] = useState<string[]>([])
  const [apiResults, setApiResults] = useState<string[]>([])
  const [listingResults, setListingResults] = useState<SearchSuggestion[]>([])
  const [loadingSearch, setLoadingSearch] = useState(false)
  const containerRef = useRef(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const listingAbortRef = useRef<AbortController | null>(null)

  const isCar = locationSearchType === 'car'
  const locationSearchQs = isCar ? '?type=car' : ''

  useEffect(() => {
    setValue(defaultValue)
  }, [defaultValue])

  useEffect(() => {
    let cancelled = false
    fetch(`/api/location-search${locationSearchQs}`)
      .then((r) => r.json())
      .then((d: { suggestions: LocationSuggestion[] }) => {
        if (cancelled || !d.suggestions?.length) return
        setApiPopular(d.suggestions.map((s) => s.name).filter(Boolean))
      })
      .catch(() => {
        /* statik liste kalır */
      })
    return () => {
      cancelled = true
    }
  }, [locationSearchQs])

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
        setApiResults([])
        setListingResults([])
        return
      }
      setLoadingSearch(true)
      listingAbortRef.current?.abort()
      const listingController = new AbortController()
      listingAbortRef.current = listingController
      try {
        const typeQs = isCar ? '&type=car' : ''
        const locationPromise = fetch(
          `/api/location-search?q=${encodeURIComponent(trimmed)}${typeQs}`,
        )
          .then((r) => r.json() as Promise<{ suggestions: LocationSuggestion[] }>)
          .then((d) => (d.suggestions ?? []).map((s) => s.name).filter(Boolean))
          .catch(() => [] as string[])

        const listingPromise =
          !isCar && trimmed.length >= SEARCH_MIN_QUERY_LEN
            ? fetch(
                `/api/listing-search?q=${encodeURIComponent(trimmed)}&locale=${locale}&limit=6`,
                { signal: listingController.signal },
              )
                .then((r) => r.json() as Promise<{ suggestions: SearchSuggestion[] }>)
                .then((d) => (d.suggestions ?? []).filter((s) => s.type === 'listing'))
                .catch((error) => {
                  if (error instanceof DOMException && error.name === 'AbortError') return null
                  return [] as SearchSuggestion[]
                })
            : Promise.resolve([] as SearchSuggestion[])

        const [locations, listings] = await Promise.all([locationPromise, listingPromise])
        setApiResults(locations)
        if (listings != null) setListingResults(listings)
      } finally {
        setLoadingSearch(false)
      }
    },
    [isCar, locale],
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

  const handleSelectLocation = (item: string) => {
    // DO NOT REMOVE SETTIMEOUT FUNC
    setTimeout(() => {
      setValue(item)
      onChange?.(item)
    }, 0)
  }

  const handleSelectListing = (href: string) => {
    router.push(vitrinHref(href))
  }

  const popularItems =
    apiPopular.length > 0 ? apiPopular.slice(0, isCar ? 12 : 5) : POPULAR_DESTINATIONS_TR

  const filteredStatic = [...POPULAR_DESTINATIONS_TR, ...POPULAR_DESTINATIONS_MORE].filter((d) =>
    d.toLocaleLowerCase(locale).includes(value.toLocaleLowerCase(locale)),
  )

  const searchItems =
    apiResults.length > 0
      ? apiResults
      : isCar
        ? []
        : filteredStatic

  const renderLocationValues = ({ heading, items }: { heading: string; items: string[] }) => {
    if (items.length === 0) return null
    return (
      <>
        <p className="block text-base font-semibold">{heading || hf.Destinations}</p>
        <div className="mt-3">
          {items.map((item) => {
            return (
              <div
                className="mb-1 flex cursor-pointer items-center gap-x-3 py-2 text-sm"
                onClick={() => handleSelectLocation(item)}
                key={item}
              >
                <HugeiconsIcon
                  icon={MapPinIcon}
                  className="h-5 w-5 text-neutral-500 dark:text-neutral-400"
                  strokeWidth={1.75}
                />
                <span>{item}</span>
              </div>
            )
          })}
        </div>
      </>
    )
  }

  const renderListingValues = () => {
    if (isCar || listingResults.length === 0) return null
    return (
      <div className={clsx(searchItems.length > 0 && 'mt-6')}>
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
    searchItems.length === 0 &&
    listingResults.length === 0

  return (
    <div className={clsx(className)} ref={containerRef}>
      <h3 className="text-xl font-semibold sm:text-2xl">{resolvedHeading}</h3>
      <div className="relative mt-5">
        <input
          className="block w-full truncate rounded-xl border border-neutral-300 bg-transparent px-4 py-3 pe-12 leading-none font-normal placeholder-neutral-500 placeholder:truncate focus:border-primary-300 focus:ring-3 focus:ring-primary-200/50 sm:text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:placeholder-neutral-300 dark:focus:ring-primary-600/25"
          placeholder={
            isCar
              ? hf['City or Airport']
              : hf['Search destinations']
          }
          value={value}
          onChange={(e) => {
            const next = e.currentTarget.value
            setValue(next)
            if (!next.trim()) {
              setApiResults([])
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
        {value
          ? showSearching
            ? (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {hf.searchingLocations}
                </p>
              )
            : (
                <>
                  {renderLocationValues({
                    heading: loc.destinationsHeading,
                    items: searchItems,
                  })}
                  {renderListingValues()}
                </>
              )
          : renderLocationValues({
              heading: loc.popularDestinationsHeading,
              items: popularItems,
            })}
      </div>
    </div>
  )
}

export default LocationInput
