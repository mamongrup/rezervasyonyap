'use client'

import type { SearchSuggestion } from '@/app/api/listing-search/route'
import type { LocationSuggestion } from '@/app/api/location-search/route'
import { useInteractOutside } from '@/hooks/useInteractOutside'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { useAppLocale } from '@/hooks/useAppLocale'
import { SEARCH_MIN_QUERY_LEN } from '@/lib/search-listings-display'
import { Divider } from '@/shared/divider'
import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from '@headlessui/react'
import {
  BeachIcon,
  Building03Icon,
  EiffelTowerIcon,
  HutIcon,
  LakeIcon,
  Location01Icon,
  MapPinIcon,
  TwinTowerIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon, IconSvgElement } from '@hugeicons/react'
import clsx from 'clsx'
import { useRouter } from 'next/navigation'
import { FC, useCallback, useEffect, useRef, useState } from 'react'
import { ClearDataButton } from './ClearDataButton'

type Suggest = {
  id: string
  name: string
  icon?: IconSvgElement
  /** İlan önerisi: seçilince detay sayfasına gider */
  href?: string
  subtitle?: string
  kind?: 'location' | 'listing'
}

// Popüler şehirler — API yüklenene kadar gösterilir
const POPULAR_SUGGESTS: Suggest[] = [
  { id: 'pop-1', name: 'Antalya',            icon: BeachIcon },
  { id: 'pop-2', name: 'İstanbul',           icon: TwinTowerIcon },
  { id: 'pop-3', name: 'Bodrum, Muğla',      icon: BeachIcon },
  { id: 'pop-4', name: 'Kapadokya, Nevşehir', icon: HutIcon },
  { id: 'pop-5', name: 'İzmir',              icon: EiffelTowerIcon },
  { id: 'pop-6', name: 'Fethiye, Muğla',     icon: LakeIcon },
]

function apiToSuggest(s: LocationSuggestion): Suggest {
  return { id: s.id, name: s.name, kind: 'location' }
}

function listingToSuggest(s: SearchSuggestion): Suggest {
  return {
    id: `listing-${s.id}`,
    name: s.title,
    subtitle: s.subtitle,
    href: s.href,
    icon: Building03Icon,
    kind: 'listing',
  }
}

const styles = {
  button: {
    base: 'relative z-10 shrink-0 w-full cursor-pointer flex items-center gap-x-3 focus:outline-hidden text-start',
    focused: 'rounded-full bg-transparent focus-visible:outline-hidden dark:bg-white/5 custom-shadow-1',
    default: 'px-5 py-6 sm:px-6 lg:px-7 xl:py-7',
    small: 'py-3 px-7 xl:px-8',
  },
  input: {
    base: 'block w-full min-w-0 truncate border-none bg-transparent p-0 font-semibold text-neutral-900 placeholder:text-neutral-900 placeholder:font-semibold focus:placeholder:text-neutral-400 focus:ring-0 focus:outline-hidden dark:text-neutral-100 dark:placeholder:text-neutral-100 dark:focus:placeholder:text-neutral-400',
    default: 'text-lg leading-tight xl:text-xl',
    small: 'text-base',
  },
  panel: {
    base: 'z-[9999] hidden-scrollbar max-h-96 overflow-y-auto rounded-3xl bg-white py-3 shadow-xl transition duration-150 data-closed:translate-y-1 data-closed:opacity-0 dark:bg-neutral-800',
    default: 'w-lg sm:py-6',
    small: 'w-md sm:py-5',
  },
}

interface Props {
  placeholder?: string
  description?: string
  className?: string
  inputName?: string
  initSuggests?: Suggest[]
  searchingSuggests?: Suggest[]
  fieldStyle: 'default' | 'small'
  /** Araç kiralama: Yolcu360 konum önerileri (`/api/location-search?type=car`) */
  locationSearchType?: 'car'
  /** listing-search kategori filtresi (hotel, holiday_home, yacht_charter, …) */
  listingCategoryCode?: string
  /** URL veya son aramadan ön doldurma */
  defaultName?: string
}

export const LocationInputField: FC<Props> = ({
  placeholder,
  description,
  className = 'flex-1',
  inputName = 'location',
  fieldStyle = 'default',
  locationSearchType,
  listingCategoryCode,
  defaultName,
}) => {
  const { messages, locale } = useAppLocale()
  const hf = messages.HeroSearchForm
  const isCar = locationSearchType === 'car'
  const resolvedPlaceholder =
    placeholder ?? (isCar ? hf['City or Airport'] : hf['Search destinations'])
  const resolvedDescription = description ?? hf['Where are you going?']
  const router = useRouter()
  const vitrinHref = useVitrinHref()

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [showPopover, setShowPopover] = useState(false)
  const [selected, setSelected] = useState<Suggest | null>(() => {
    const n = defaultName?.trim()
    return n ? { id: 'prefill', name: n } : null
  })
  const [searchResults, setSearchResults] = useState<Suggest[]>([])
  const [listingResults, setListingResults] = useState<Suggest[]>([])
  const [loadingSearch, setLoadingSearch] = useState(false)
  const locationSearchQs = isCar ? '?type=car' : ''

  // Açılışta popüler şehirleri yükle
  const [initSuggests, setInitSuggests] = useState<Suggest[]>(POPULAR_SUGGESTS)
  useEffect(() => {
    fetch(`/api/location-search${locationSearchQs}`)
      .then((r) => r.json())
      .then((d: { suggestions: LocationSuggestion[] }) => {
        if (d.suggestions?.length) setInitSuggests(d.suggestions.map(apiToSuggest))
      })
      .catch(() => {/* sessiz hata — statik liste kalır */})
  }, [locationSearchQs])

  useEffect(() => {
    const n = defaultName?.trim()
    if (n) setSelected({ id: 'prefill', name: n })
  }, [defaultName])

  useEffect(() => {
    const t = setTimeout(() => {
      if (showPopover && inputRef.current) inputRef.current.focus()
    }, 200)
    return () => clearTimeout(t)
  }, [showPopover])

  const closePopover = useCallback(() => setShowPopover(false), [])
  useInteractOutside(containerRef, closePopover)

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const listingAbortRef = useRef<AbortController | null>(null)

  const runCombinedSearch = useCallback(async (q: string) => {
    const trimmed = q.trim()
    if (!trimmed) {
      setSearchResults([])
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
        .then((d) => (d.suggestions ?? []).map(apiToSuggest))
        .catch(() => [] as Suggest[])

      const catQs = listingCategoryCode
        ? `&category_code=${encodeURIComponent(listingCategoryCode)}`
        : ''
      const listingPromise =
        !isCar && trimmed.length >= SEARCH_MIN_QUERY_LEN
          ? fetch(
              `/api/listing-search?q=${encodeURIComponent(trimmed)}&locale=${locale}&limit=6${catQs}`,
              { signal: listingController.signal },
            )
              .then((r) => r.json() as Promise<{ suggestions: SearchSuggestion[] }>)
              .then((d) =>
                (d.suggestions ?? [])
                  .filter((s) => s.type === 'listing')
                  .map(listingToSuggest),
              )
              .catch((error) => {
                if (error instanceof DOMException && error.name === 'AbortError') return null
                return [] as Suggest[]
              })
          : Promise.resolve([] as Suggest[])

      const [locations, listings] = await Promise.all([locationPromise, listingPromise])
      setSearchResults(locations)
      if (listings != null) setListingResults(listings)
    } finally {
      setLoadingSearch(false)
    }
  }, [isCar, listingCategoryCode, locale])

  useEffect(
    () => () => {
      if (searchDebounceRef.current != null) clearTimeout(searchDebounceRef.current)
      listingAbortRef.current?.abort()
    },
    [],
  )

  const scheduleLocationSearch = useCallback((q: string) => {
    if (searchDebounceRef.current != null) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      searchDebounceRef.current = null
      void runCombinedSearch(q)
    }, 280)
  }, [runCombinedSearch])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setShowPopover(true)
    const val = e.target.value
    if (val) {
      setSelected({ id: Date.now().toString(), name: val })
      scheduleLocationSearch(val)
    } else {
      if (searchDebounceRef.current != null) clearTimeout(searchDebounceRef.current)
      setSelected(null)
      setSearchResults([])
      setListingResults([])
    }
  }, [scheduleLocationSearch])

  const isShowInitSuggests = !selected?.id
  const locationSuggests = isShowInitSuggests
    ? initSuggests
    : searchResults.length
      ? searchResults
      : initSuggests
  const showListings = !isShowInitSuggests && !isCar && listingResults.length > 0

  return (
    <div
      className={`group relative z-10 flex ${className}`}
      ref={containerRef}
      {...(showPopover && {
        'data-open': 'true',
      })}
    >
      <Combobox
        value={selected}
        onChange={(value) => {
          if (value?.href) {
            setShowPopover(false)
            router.push(vitrinHref(value.href))
            return
          }
          setSelected(value || { id: '', name: '' })
          // Close the popover when a value is selected
          if (value?.id) {
            setShowPopover(false)
            setTimeout(() => {
              inputRef.current?.blur()
            }, 50)
          }
        }}
      >
        <div
          onMouseDown={() => setShowPopover(true)}
          onTouchStart={() => setShowPopover(true)}
          className={clsx(styles.button.base, styles.button[fieldStyle], showPopover && styles.button.focused)}
        >
          {fieldStyle === 'default' && (
            <HugeiconsIcon
              icon={MapPinIcon}
              className="size-5 shrink-0 text-neutral-400 lg:size-6 dark:text-neutral-500"
              strokeWidth={1.75}
            />
          )}

          <div className="min-w-0 grow">
            <ComboboxInput
              ref={inputRef}
              aria-label="Search for a location"
              className={clsx(styles.input.base, styles.input[fieldStyle])}
              key={`${inputName}:${defaultName ?? ''}`}
              placeholder={resolvedPlaceholder}
              autoComplete="off"
              displayValue={(item?: Suggest) => item?.name || ''}
              onChange={handleInputChange}
            />
            <input type="hidden" name={inputName} value={selected?.name ?? ''} />
            <div
              aria-hidden={!!selected?.name?.trim()}
              className={clsx(
                'mt-0.5 text-start text-xs leading-tight font-normal text-neutral-700 dark:text-neutral-300',
                selected?.name?.trim() && 'invisible pointer-events-none select-none'
              )}
            >
              <span className="block truncate">{resolvedDescription}</span>
            </div>

            <ClearDataButton
              className={clsx(!selected?.id && 'sr-only')}
              onClick={() => {
                setSelected({ id: '', name: '' })
                setShowPopover(false)
                setListingResults([])
                inputRef.current?.focus()
              }}
            />
          </div>
        </div>

        {showPopover ? (
          <ComboboxOptions
            static
            unmount={false}
            portal
            anchor={{ to: 'bottom start', gap: 12 }}
            transition
            className={clsx(styles.panel.base, styles.panel[fieldStyle])}
          >
            {isShowInitSuggests && (
              <p className="mt-2 mb-3 px-4 text-xs/6 font-normal text-neutral-600 sm:mt-0 sm:px-8 dark:text-neutral-400">
                {hf['Suggested locations']}
              </p>
            )}
            {isShowInitSuggests && <Divider className="opacity-50" />}
            {loadingSearch && (
              <p className="px-8 py-3 text-xs text-neutral-400">{hf.searchingLocations}</p>
            )}
            {!isShowInitSuggests && locationSuggests.length > 0 ? (
              <p className="mt-1 mb-1 px-4 text-xs/6 font-semibold text-neutral-500 sm:px-8 dark:text-neutral-400">
                {hf.Destinations}
              </p>
            ) : null}
            {locationSuggests.map((item) => (
              <ComboboxOption
                key={item.id}
                value={item}
                className="flex items-center gap-3 p-4 data-focus:bg-neutral-100 sm:gap-4.5 sm:px-8 dark:data-focus:bg-neutral-700"
              >
                <HugeiconsIcon
                  icon={item.icon || Location01Icon}
                  className="size-4 text-neutral-400 sm:size-6 dark:text-neutral-500"
                />
                <span className="block font-medium text-neutral-700 dark:text-neutral-200">{item.name}</span>
              </ComboboxOption>
            ))}
            {showListings ? (
              <>
                <Divider className="my-2 opacity-50" />
                <p className="mt-1 mb-1 px-4 text-xs/6 font-semibold text-neutral-500 sm:px-8 dark:text-neutral-400">
                  {hf.Listings}
                </p>
                {listingResults.map((item) => (
                  <ComboboxOption
                    key={item.id}
                    value={item}
                    className="flex items-center gap-3 p-4 data-focus:bg-neutral-100 sm:gap-4.5 sm:px-8 dark:data-focus:bg-neutral-700"
                  >
                    <HugeiconsIcon
                      icon={item.icon || Building03Icon}
                      className="size-4 shrink-0 text-neutral-400 sm:size-6 dark:text-neutral-500"
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-neutral-700 dark:text-neutral-200">
                        {item.name}
                      </span>
                      {item.subtitle ? (
                        <span className="block truncate text-xs text-neutral-500">{item.subtitle}</span>
                      ) : null}
                    </span>
                  </ComboboxOption>
                ))}
              </>
            ) : null}
          </ComboboxOptions>
        ) : null}
      </Combobox>
    </div>
  )
}
