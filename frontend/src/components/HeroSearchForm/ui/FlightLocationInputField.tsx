'use client'

import { useInteractOutside } from '@/hooks/useInteractOutside'
import {
  airportDisplayName,
  findAirportByCode,
  FLIGHT_AIRPORTS,
  POPULAR_FLIGHT_AIRPORTS,
  resolveFlightAirportCode,
  searchFlightAirports,
  type FlightAirport,
} from '@/lib/flight-airports'
import { Divider } from '@/shared/divider'
import { useAppLocale } from '@/hooks/useAppLocale'
import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  Transition,
} from '@headlessui/react'
import { AirplaneLandingIcon, AirplaneTakeOffIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import { FC, useCallback, useEffect, useRef, useState } from 'react'
import { ClearDataButton } from './ClearDataButton'

type AirportOption = {
  id: string
  code: string
  label: string
}

function toOption(a: FlightAirport): AirportOption {
  return { id: a.code, code: a.code, label: airportDisplayName(a) }
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
    base: 'absolute start-0 top-full z-[200] mt-3 hidden-scrollbar max-h-96 overflow-y-auto rounded-3xl bg-white py-3 shadow-xl ring-1 ring-black/5 transition duration-150 data-closed:translate-y-1 data-closed:opacity-0 dark:bg-neutral-800 dark:ring-white/10',
    default: 'w-lg sm:py-6',
    small: 'w-md sm:py-5',
  },
}

interface Props {
  placeholder?: string
  description?: string
  className?: string
  inputName?: string
  fieldStyle: 'default' | 'small'
  /** URL veya IATA/şehir adı */
  defaultValue?: string
  icon?: typeof AirplaneTakeOffIcon
}

export const FlightLocationInputField: FC<Props> = ({
  placeholder,
  description,
  className = 'flex-1',
  inputName = 'flying-from-location',
  fieldStyle = 'default',
  defaultValue,
  icon = AirplaneTakeOffIcon,
}) => {
  const { messages } = useAppLocale()
  const hf = messages.HeroSearchForm
  const resolvedPlaceholder = placeholder ?? hf['Flying from']
  const resolvedDescription = description ?? hf['Where are you flying from?']

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [showPopover, setShowPopover] = useState(false)
  const [selected, setSelected] = useState<AirportOption | null>(null)
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState<AirportOption[]>([])

  const popularOptions = POPULAR_FLIGHT_AIRPORTS.map((code) => toOption(findAirportByCode(code)!))

  useEffect(() => {
    if (!defaultValue?.trim()) return
    const code = resolveFlightAirportCode(defaultValue)
    if (!code) return
    const apt = findAirportByCode(code)
    if (apt) setSelected(toOption(apt))
  }, [defaultValue])

  useEffect(() => {
    const t = setTimeout(() => {
      if (showPopover && inputRef.current) inputRef.current.focus()
    }, 200)
    return () => clearTimeout(t)
  }, [showPopover])

  const closePopover = useCallback(() => setShowPopover(false), [])
  useInteractOutside(containerRef, closePopover)

  useEffect(() => {
    const list = query.trim() ? searchFlightAirports(query) : FLIGHT_AIRPORTS.slice(0, 8)
    setOptions(list.map(toOption))
  }, [query])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setShowPopover(true)
    const val = e.target.value
    setQuery(val)
    if (!val.trim()) {
      setSelected(null)
      return
    }
    const code = resolveFlightAirportCode(val)
    if (code) {
      const apt = findAirportByCode(code)
      if (apt) setSelected(toOption(apt))
    } else {
      setSelected(null)
    }
  }, [])

  const suggestsToShow = query.trim() ? options : popularOptions

  return (
    <div
      className={`group relative z-10 flex ${className}`}
      ref={containerRef}
      {...(showPopover && { 'data-open': 'true' })}
    >
      <input type="hidden" name={inputName} value={selected?.code ?? ''} />
      <Combobox
        value={selected}
        onChange={(value) => {
          setSelected(value)
          setQuery('')
          if (value?.code) {
            setShowPopover(false)
            setTimeout(() => inputRef.current?.blur(), 50)
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
              icon={icon}
              className="size-5 shrink-0 text-neutral-400 lg:size-6 dark:text-neutral-500"
              strokeWidth={1.75}
            />
          )}

          <div className="min-w-0 grow">
            <ComboboxInput
              ref={inputRef}
              aria-label={resolvedPlaceholder}
              className={clsx(styles.input.base, styles.input[fieldStyle])}
              placeholder={resolvedPlaceholder}
              autoComplete="off"
              displayValue={(item?: AirportOption) => item?.label || query}
              onChange={handleInputChange}
            />
            <div
              aria-hidden={!!selected?.code}
              className={clsx(
                'mt-0.5 text-start text-xs leading-tight font-normal text-neutral-700 dark:text-neutral-300',
                selected?.code && 'pointer-events-none invisible select-none',
              )}
            >
              <span className="block truncate">{resolvedDescription}</span>
            </div>

            <ClearDataButton
              className={clsx(!selected?.code && 'sr-only')}
              onClick={() => {
                setSelected(null)
                setQuery('')
                setShowPopover(false)
                inputRef.current?.focus()
              }}
            />
          </div>
        </div>

        <Transition show={showPopover} unmount={false}>
          <div className={clsx(styles.panel.base, styles.panel[fieldStyle])}>
            {!query.trim() && (
              <>
                <p className="mt-2 mb-3 px-4 text-xs/6 font-normal text-neutral-600 sm:mt-0 sm:px-8 dark:text-neutral-400">
                  {hf['Suggested locations']}
                </p>
                <Divider className="opacity-50" />
              </>
            )}
            <ComboboxOptions static unmount={false}>
              {suggestsToShow.map((item) => (
                <ComboboxOption
                  key={item.id}
                  value={item}
                  className="flex cursor-pointer items-center gap-3 p-4 data-focus:bg-neutral-100 sm:gap-4.5 sm:px-8 dark:data-focus:bg-neutral-700"
                >
                  <HugeiconsIcon
                    icon={icon}
                    className="size-4 text-neutral-400 sm:size-6 dark:text-neutral-500"
                  />
                  <span className="block font-medium text-neutral-700 dark:text-neutral-200">{item.label}</span>
                </ComboboxOption>
              ))}
            </ComboboxOptions>
          </div>
        </Transition>
      </Combobox>
    </div>
  )
}
