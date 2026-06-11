'use client'

import { useInteractOutside } from '@/hooks/useInteractOutside'
import { Divider } from '@/shared/divider'
import { useAppLocale } from '@/hooks/useAppLocale'
import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from '@headlessui/react'
import {
  Location01Icon,
  MapPinIcon,
  MapsLocation01Icon,
  RouteIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import { FC, useCallback, useEffect, useRef, useState } from 'react'
import { ClearDataButton } from './ClearDataButton'
import type { LocationSuggestion } from '@/app/api/location-search/route'

/**
 * Tur arama için özelleştirilmiş konum alanı.
 * İki öneri türü döner:
 *  - tour_hub  → Hub kategorisi (Balkanlar, Batı Avrupa…) — seçince direkt navigate
 *  - region/static → Destinasyon (Budva, Paris…) — seçince form ile arama (tarih+kişi)
 *
 * `onHubSelect(path)` callback'i doldurulursa hub seçiminde çağrılır.
 */

export type TourSuggest = {
  id: string
  name: string
  type: 'hub' | 'destination'
  hubPath?: string
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

function apiToTourSuggest(s: LocationSuggestion): TourSuggest {
  if (s.type === 'tour_hub') {
    return { id: s.id, name: s.name, type: 'hub', hubPath: s.hubPath }
  }
  return { id: s.id, name: s.name, type: 'destination' }
}

/** Varsayılan popüler tur destinasyonları (API yüklenene dek) */
const DEFAULT_DEST: TourSuggest[] = [
  { id: 'd-istanbul', name: 'İstanbul', type: 'destination' },
  { id: 'd-kapadokya', name: 'Kapadokya', type: 'destination' },
  { id: 'd-antalya', name: 'Antalya', type: 'destination' },
  { id: 'd-pamukkale', name: 'Pamukkale', type: 'destination' },
  { id: 'd-trabzon', name: 'Trabzon', type: 'destination' },
]

interface Props {
  className?: string
  fieldStyle: 'default' | 'small'
  defaultName?: string
  /** Hub seçiminde çağrılır — parent router.push yapar */
  onHubSelect: (path: string) => void
}

export const TourLocationInputField: FC<Props> = ({
  className = 'flex-1',
  fieldStyle = 'default',
  defaultName,
  onHubSelect,
}) => {
  const { messages } = useAppLocale()
  const hf = messages.HeroSearchForm

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [showPopover, setShowPopover] = useState(false)
  const [selected, setSelected] = useState<TourSuggest | null>(() => {
    const n = defaultName?.trim()
    return n ? { id: 'prefill', name: n, type: 'destination' } : null
  })
  const [hubs, setHubs] = useState<TourSuggest[]>([])
  const [destinations, setDestinations] = useState<TourSuggest[]>(DEFAULT_DEST)
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  // Açılışta hub kategorilerini yükle
  useEffect(() => {
    fetch('/api/location-search?type=tour')
      .then((r) => r.json())
      .then((d: { suggestions: LocationSuggestion[] }) => {
        const all = (d.suggestions ?? []).map(apiToTourSuggest)
        setHubs(all.filter((s) => s.type === 'hub'))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const n = defaultName?.trim()
    if (n) setSelected({ id: 'prefill', name: n, type: 'destination' })
  }, [defaultName])

  useEffect(() => {
    const t = setTimeout(() => {
      if (showPopover && inputRef.current) inputRef.current.focus()
    }, 200)
    return () => clearTimeout(t)
  }, [showPopover])

  const closePopover = useCallback(() => setShowPopover(false), [])
  useInteractOutside(containerRef, closePopover)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const runSearch = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const r = await fetch(`/api/location-search?q=${encodeURIComponent(q)}&type=tour`)
      const d = (await r.json()) as { suggestions: LocationSuggestion[] }
      const all = (d.suggestions ?? []).map(apiToTourSuggest)
      setHubs(all.filter((s) => s.type === 'hub'))
      setDestinations(all.filter((s) => s.type === 'destination'))
      setHasSearched(true)
    } catch {
      setHasSearched(true)
    } finally {
      setLoading(false)
    }
  }, [])

  const scheduleSearch = useCallback((q: string) => {
    if (debounceRef.current != null) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null
      void runSearch(q)
    }, 280)
  }, [runSearch])

  useEffect(() => () => { if (debounceRef.current != null) clearTimeout(debounceRef.current) }, [])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setShowPopover(true)
    const val = e.target.value
    if (val) {
      setSelected({ id: Date.now().toString(), name: val, type: 'destination' })
      scheduleSearch(val)
    } else {
      if (debounceRef.current != null) clearTimeout(debounceRef.current)
      setSelected(null)
      setDestinations(DEFAULT_DEST)
      setHubs([])
      setHasSearched(false)
    }
  }, [scheduleSearch])

  const handleSelect = useCallback((value: TourSuggest | null) => {
    if (!value) return
    if (value.type === 'hub' && value.hubPath) {
      // Hub seçimi → direkt navigate, formu bypass et
      setShowPopover(false)
      onHubSelect(value.hubPath)
      return
    }
    setSelected(value)
    setShowPopover(false)
    setTimeout(() => inputRef.current?.blur(), 50)
  }, [onHubSelect])

  const isInitView = !selected?.id || !hasSearched
  const showHubs = hubs.length > 0
  const showDests = destinations.length > 0

  return (
    <div
      className={`group relative z-10 flex ${className}`}
      ref={containerRef}
      {...(showPopover && { 'data-open': 'true' })}
    >
      <Combobox value={selected} onChange={handleSelect}>
        <div
          onMouseDown={() => setShowPopover(true)}
          onTouchStart={() => setShowPopover(true)}
          className={clsx(
            styles.button.base,
            styles.button[fieldStyle],
            showPopover && styles.button.focused,
          )}
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
              aria-label="Tur konumu veya kategorisi"
              className={clsx(styles.input.base, styles.input[fieldStyle])}
              key={`tour-loc:${defaultName ?? ''}`}
              placeholder={hf.Location}
              autoComplete="off"
              displayValue={(item?: TourSuggest) => {
                if (!item?.name) return ''
                // Hub adından " — KategoriAdı" kısmını sil (temiz görüntü)
                return item.name.replace(/\s—\s.+$/, '')
              }}
              onChange={handleInputChange}
            />
            <input
              type="hidden"
              name="location"
              value={selected?.type === 'destination' ? (selected?.name ?? '') : ''}
            />
            <div
              aria-hidden={!!selected?.name?.trim()}
              className={clsx(
                'mt-0.5 text-start text-xs leading-tight font-normal text-neutral-700 dark:text-neutral-300',
                selected?.name?.trim() && 'invisible pointer-events-none select-none',
              )}
            >
              <span className="block truncate">Nereye gidiyorsunuz?</span>
            </div>

            <ClearDataButton
              className={clsx(!selected?.id && 'sr-only')}
              onClick={() => {
                setSelected(null)
                setDestinations(DEFAULT_DEST)
                setHubs([])
                setHasSearched(false)
                setShowPopover(false)
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
            {loading && (
              <p className="px-8 py-3 text-xs text-neutral-400">{hf.searchingLocations}</p>
            )}

            {/* Hub Kategorileri */}
            {showHubs && (
              <>
                <p className="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-neutral-400 sm:px-8">
                  Tur Kategorileri
                </p>
                {hubs.map((item) => (
                  <ComboboxOption
                    key={item.id}
                    value={item}
                    className="flex cursor-pointer items-center gap-3 p-4 data-focus:bg-neutral-100 sm:gap-4.5 sm:px-8 dark:data-focus:bg-neutral-700"
                  >
                    <HugeiconsIcon
                      icon={RouteIcon}
                      className="size-4 shrink-0 text-primary-500 sm:size-5 dark:text-primary-400"
                      strokeWidth={1.75}
                    />
                    <div className="min-w-0">
                      <span className="block font-medium text-neutral-700 dark:text-neutral-200">
                        {item.name}
                      </span>
                      <span className="text-xs text-neutral-400">Tur kategorisi</span>
                    </div>
                  </ComboboxOption>
                ))}
              </>
            )}

            {/* Ayraç */}
            {showHubs && showDests && <Divider className="my-1 opacity-40" />}

            {/* Destinasyonlar */}
            {showDests && (
              <>
                <p className="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-neutral-400 sm:px-8">
                  {isInitView ? 'Popüler destinasyonlar' : 'Destinasyonlar'}
                </p>
                {destinations.map((item) => (
                  <ComboboxOption
                    key={item.id}
                    value={item}
                    className="flex cursor-pointer items-center gap-3 p-4 data-focus:bg-neutral-100 sm:gap-4.5 sm:px-8 dark:data-focus:bg-neutral-700"
                  >
                    <HugeiconsIcon
                      icon={item.id.startsWith('d-') ? MapsLocation01Icon : Location01Icon}
                      className="size-4 text-neutral-400 sm:size-5 dark:text-neutral-500"
                      strokeWidth={1.75}
                    />
                    <span className="block font-medium text-neutral-700 dark:text-neutral-200">
                      {item.name}
                    </span>
                  </ComboboxOption>
                ))}
              </>
            )}
          </ComboboxOptions>
        ) : null}
      </Combobox>
    </div>
  )
}
