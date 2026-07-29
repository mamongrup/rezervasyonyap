'use client'

import { Search01Icon } from '@/components/Icons'
import type { LocationSuggestion } from '@/app/api/location-search/route'
import { getMessages } from '@/utils/getT'
import { MapPinIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import { useParams } from 'next/navigation'
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
  const resolvedHeading = headingText ?? m.HeroSearchForm['Where to?']
  const [value, setValue] = useState('')
  const [apiPopular, setApiPopular] = useState<string[]>([])
  const [apiResults, setApiResults] = useState<string[]>([])
  const [loadingSearch, setLoadingSearch] = useState(false)
  const containerRef = useRef(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    },
    [],
  )

  const runLocationSearch = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setApiResults([])
        return
      }
      setLoadingSearch(true)
      try {
        const typeQs = isCar ? '&type=car' : ''
        const r = await fetch(`/api/location-search?q=${encodeURIComponent(q)}${typeQs}`)
        const d = (await r.json()) as { suggestions: LocationSuggestion[] }
        setApiResults((d.suggestions ?? []).map((s) => s.name).filter(Boolean))
      } catch {
        setApiResults([])
      } finally {
        setLoadingSearch(false)
      }
    },
    [isCar],
  )

  const scheduleLocationSearch = useCallback(
    (q: string) => {
      if (searchDebounceRef.current != null) clearTimeout(searchDebounceRef.current)
      searchDebounceRef.current = setTimeout(() => {
        searchDebounceRef.current = null
        void runLocationSearch(q)
      }, 300)
    },
    [runLocationSearch],
  )

  const handleSelectLocation = (item: string) => {
    // DO NOT REMOVE SETTIMEOUT FUNC
    setTimeout(() => {
      setValue(item)
      onChange?.(item)
    }, 0)
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

  const renderSearchValues = ({ heading, items }: { heading: string; items: string[] }) => {
    return (
      <>
        <p className="block text-base font-semibold">{heading || m.HeroSearchForm['Destinations']}</p>
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

  return (
    <div className={clsx(className)} ref={containerRef}>
      <h3 className="text-xl font-semibold sm:text-2xl">{resolvedHeading}</h3>
      <div className="relative mt-5">
        <input
          className="block w-full truncate rounded-xl border border-neutral-300 bg-transparent px-4 py-3 pe-12 leading-none font-normal placeholder-neutral-500 placeholder:truncate focus:border-primary-300 focus:ring-3 focus:ring-primary-200/50 sm:text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:placeholder-neutral-300 dark:focus:ring-primary-600/25"
          placeholder={
            isCar
              ? m.HeroSearchForm['City or Airport']
              : m.HeroSearchForm['Search destinations']
          }
          value={value}
          onChange={(e) => {
            const next = e.currentTarget.value
            setValue(next)
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
          ? loadingSearch && searchItems.length === 0
            ? (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {m.HeroSearchForm['Search destinations']}…
                </p>
              )
            : renderSearchValues({
                heading: loc.destinationsHeading,
                items: searchItems,
              })
          : renderSearchValues({
              heading: loc.popularDestinationsHeading,
              items: popularItems,
            })}
      </div>
    </div>
  )
}

export default LocationInput
