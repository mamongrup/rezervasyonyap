'use client'

import { Loader2, MapPin, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { loadGoogleMaps, onGoogleMapsAuthFail } from '@/lib/google-maps-loader'

export interface PlaceResult {
  address: string
  lat: number
  lng: number
  placeId?: string
}

interface PlacesAutocompleteInputProps {
  value?: string
  placeholder?: string
  className?: string
  /** Called whenever the text changes (for controlled input) */
  onChange?: (value: string) => void
  /** Called when user selects a place from the dropdown */
  onPlaceSelect?: (place: PlaceResult) => void
  /** Restrict to a country (e.g. 'tr') */
  country?: string
  /** Show a map pin icon inside the input */
  showIcon?: boolean
}

export default function PlacesAutocompleteInput({
  value,
  placeholder = 'Adres veya konum ara…',
  className = '',
  onChange,
  onPlaceSelect,
  country = 'tr',
  showIcon = true,
}: PlacesAutocompleteInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<any>(null)
  const [apiKey, setApiKey] = useState(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '')
  const [ready, setReady] = useState(false)
  const [authError, setAuthError] = useState(false)
  const [internalValue, setInternalValue] = useState(value ?? '')

  // Sync external value
  useEffect(() => {
    if (value !== undefined) setInternalValue(value)
  }, [value])

  // Fetch API key from maps-config if not in env
  useEffect(() => {
    if (apiKey) return
    fetch('/api/maps-config')
      .then((r) => r.json())
      .then((d: { apiKey?: string }) => { if (d.apiKey) setApiKey(d.apiKey) })
      .catch(() => undefined)
  }, [apiKey])

  // Subscribe to auth failure
  useEffect(() => {
    return onGoogleMapsAuthFail(() => setAuthError(true))
  }, [])

  // Load Maps + attach Autocomplete
  useEffect(() => {
    if (!apiKey || authError) return

    loadGoogleMaps(
      apiKey,
      () => {
        if (!inputRef.current || !window.google?.maps?.places) return
        const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
          types: ['geocode', 'establishment'],
          componentRestrictions: country ? { country } : undefined,
          fields: ['geometry', 'formatted_address', 'place_id', 'name'],
        })
        autocompleteRef.current = ac

        ac.addListener('place_changed', () => {
          const place = ac.getPlace()
          if (!place.geometry?.location) return

          const result: PlaceResult = {
            address: place.formatted_address ?? place.name ?? '',
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            placeId: place.place_id,
          }
          setInternalValue(result.address)
          onChange?.(result.address)
          onPlaceSelect?.(result)
        })

        setReady(true)
      },
      () => setAuthError(true),
    )
  }, [apiKey, authError, country, onChange, onPlaceSelect])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInternalValue(e.target.value)
    onChange?.(e.target.value)
  }

  const handleClear = () => {
    setInternalValue('')
    onChange?.('')
    inputRef.current?.focus()
  }

  return (
    <div className="relative">
      {showIcon && (
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
      )}
      <input
        ref={inputRef}
        type="text"
        value={internalValue}
        onChange={handleChange}
        placeholder={
          authError
            ? 'Google Maps bağlanamadı — manuel giriş'
            : !ready
            ? 'Yükleniyor…'
            : placeholder
        }
        disabled={authError}
        className={[
          'w-full rounded-xl border border-neutral-200 py-2 pr-8 text-sm',
          'placeholder:text-neutral-400 focus:border-[color:var(--manage-primary)]',
          'focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100',
          showIcon ? 'pl-9' : 'pl-3',
          authError ? 'opacity-60 cursor-not-allowed' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      />

      {/* Loading spinner */}
      {!ready && !authError && apiKey && (
        <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-neutral-400" />
      )}

      {/* Clear button */}
      {ready && internalValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-300 hover:text-neutral-600 dark:hover:text-neutral-300"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
