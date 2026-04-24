'use client'

import { useInteractOutside } from '@/hooks/useInteractOutside'
import { Divider } from '@/shared/divider'
import T from '@/utils/getT'
import * as Headless from '@headlessui/react'
import {
  BeachIcon,
  EiffelTowerIcon,
  HutIcon,
  LakeIcon,
  Location01Icon,
  MapPinIcon,
  TwinTowerIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon, IconSvgElement } from '@hugeicons/react'
import clsx from 'clsx'
import debounce from 'lodash/debounce'
import { FC, useCallback, useEffect, useRef, useState } from 'react'
import { ClearDataButton } from './ClearDataButton'
import type { LocationSuggestion } from '@/app/api/location-search/route'

type Suggest = {
  id: string
  name: string
  icon?: IconSvgElement
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
  return { id: s.id, name: s.name }
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
    base: 'absolute start-0 top-full z-40 mt-3 hidden-scrollbar max-h-96  overflow-y-auto rounded-3xl bg-white py-3 shadow-xl transition duration-150 data-closed:translate-y-1 data-closed:opacity-0  dark:bg-neutral-800',
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
}

export const LocationInputField: FC<Props> = ({
  placeholder = T['HeroSearchForm']['Location'],
  description = T['HeroSearchForm']['Where are you going?'],
  className = 'flex-1',
  inputName = 'location',
  fieldStyle = 'default',
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [showPopover, setShowPopover] = useState(false)
  const [selected, setSelected] = useState<Suggest | null>(null)
  const [searchResults, setSearchResults] = useState<Suggest[]>([])
  const [loadingSearch, setLoadingSearch] = useState(false)

  // Açılışta popüler şehirleri yükle
  const [initSuggests, setInitSuggests] = useState<Suggest[]>(POPULAR_SUGGESTS)
  useEffect(() => {
    fetch('/api/location-search')
      .then((r) => r.json())
      .then((d: { suggestions: LocationSuggestion[] }) => {
        if (d.suggestions?.length) setInitSuggests(d.suggestions.map(apiToSuggest))
      })
      .catch(() => {/* sessiz hata — statik liste kalır */})
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      if (showPopover && inputRef.current) inputRef.current.focus()
    }, 200)
    return () => clearTimeout(t)
  }, [showPopover])

  const closePopover = useCallback(() => setShowPopover(false), [])
  useInteractOutside(containerRef, closePopover)

  const fetchSearch = useCallback(
    debounce(async (q: string) => {
      if (!q.trim()) { setSearchResults([]); return }
      setLoadingSearch(true)
      try {
        const r = await fetch(`/api/location-search?q=${encodeURIComponent(q)}`)
        const d = (await r.json()) as { suggestions: LocationSuggestion[] }
        setSearchResults((d.suggestions ?? []).map(apiToSuggest))
      } catch {
        setSearchResults([])
      } finally {
        setLoadingSearch(false)
      }
    }, 300),
    []
  )

  useEffect(() => () => fetchSearch.cancel(), [fetchSearch])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setShowPopover(true)
    const val = e.target.value
    if (val) {
      setSelected({ id: Date.now().toString(), name: val })
      void fetchSearch(val)
    } else {
      setSelected(null)
      setSearchResults([])
    }
  }, [fetchSearch])

  const isShowInitSuggests = !selected?.id
  const suggestsToShow = isShowInitSuggests ? initSuggests : (searchResults.length ? searchResults : initSuggests)
  return (
    <div
      className={`group relative z-10 flex ${className}`}
      ref={containerRef}
      {...(showPopover && {
        'data-open': 'true',
      })}
    >
      <Headless.Combobox
        value={selected}
        onChange={(value) => {
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
            <Headless.ComboboxInput
              ref={inputRef}
              aria-label="Search for a location"
              className={clsx(styles.input.base, styles.input[fieldStyle])}
              name={inputName}
              placeholder={placeholder}
              autoComplete="off"
              displayValue={(item?: Suggest) => item?.name || ''}
              onChange={handleInputChange}
            />
            <div
              aria-hidden={!!selected?.name?.trim()}
              className={clsx(
                'mt-0.5 text-start text-xs leading-tight font-normal text-neutral-700 dark:text-neutral-300',
                selected?.name?.trim() && 'invisible pointer-events-none select-none'
              )}
            >
              <span className="block truncate">{description}</span>
            </div>

            <ClearDataButton
              className={clsx(!selected?.id && 'sr-only')}
              onClick={() => {
                setSelected({ id: '', name: '' })
                setShowPopover(false)
                inputRef.current?.focus()
              }}
            />
          </div>
        </div>

        <Headless.Transition show={showPopover} unmount={false}>
          <div className={clsx(styles.panel.base, styles.panel[fieldStyle])}>
            {isShowInitSuggests && (
              <p className="mt-2 mb-3 px-4 text-xs/6 font-normal text-neutral-600 sm:mt-0 sm:px-8 dark:text-neutral-400">
                {T['HeroSearchForm']['Suggested locations']}
              </p>
            )}
            {isShowInitSuggests && <Divider className="opacity-50" />}
            {loadingSearch && (
              <p className="px-8 py-3 text-xs text-neutral-400">Aranıyor…</p>
            )}
            <Headless.ComboboxOptions static unmount={false}>
              {suggestsToShow.map((item) => (
                <Headless.ComboboxOption
                  key={item.id}
                  value={item}
                  className="flex items-center gap-3 p-4 data-focus:bg-neutral-100 sm:gap-4.5 sm:px-8 dark:data-focus:bg-neutral-700"
                >
                  <HugeiconsIcon
                    icon={item.icon || Location01Icon}
                    className="size-4 text-neutral-400 sm:size-6 dark:text-neutral-500"
                  />
                  <span className="block font-medium text-neutral-700 dark:text-neutral-200">{item.name}</span>
                </Headless.ComboboxOption>
              ))}
            </Headless.ComboboxOptions>
          </div>
        </Headless.Transition>
      </Headless.Combobox>
    </div>
  )
}
