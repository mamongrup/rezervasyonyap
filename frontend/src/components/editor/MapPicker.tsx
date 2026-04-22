'use client'

import clsx from 'clsx'
import { Crosshair, MapPin, Search, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    google?: any
    initMapPickerCallback?: () => void
    gm_authFailure?: () => void
  }
}

interface LatLng { lat: number; lng: number }

interface MapClickEventLike {
  latLng?: { lat: () => number; lng: () => number } | null
}

interface MapPickerProps {
  lat: string
  lng: string
  zoom?: number
  onChange: (lat: string, lng: string) => void
  className?: string
}

// ─── Suppress Google Maps billing console errors in dev overlay ───────────────
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const _origError = console.error.bind(console)
  console.error = (...args: unknown[]) => {
    const msg = String(args[0] ?? '')
    if (msg.includes('BillingNotEnabled') || msg.includes('Google Maps JavaScript API')) return
    _origError(...args)
  }
}

// ─── Google Maps Script loader ────────────────────────────────────────────────
let scriptLoaded = false
let scriptLoading = false
let gmAuthFailed = false
const readyCallbacks: (() => void)[] = []
const authFailListeners = new Set<() => void>()

// Set gm_authFailure once at module level so it catches the event regardless of timing
if (typeof window !== 'undefined') {
  window.gm_authFailure = () => {
    gmAuthFailed = true
    scriptLoading = false
    authFailListeners.forEach((fn) => fn())
    authFailListeners.clear()
  }
}

function loadGoogleMaps(apiKey: string, cb: () => void) {
  if (typeof window === 'undefined') return
  if (gmAuthFailed) return  // already known to be failed — authFailListeners will handle it
  if (scriptLoaded) { cb(); return }
  readyCallbacks.push(cb)
  if (scriptLoading) return
  scriptLoading = true

  window.initMapPickerCallback = () => {
    scriptLoaded = true
    scriptLoading = false
    readyCallbacks.forEach((fn) => fn())
    readyCallbacks.length = 0
  }
  const script = document.createElement('script')
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initMapPickerCallback`
  script.async = true
  script.defer = true
  script.onerror = () => {
    gmAuthFailed = true
    scriptLoading = false
    authFailListeners.forEach((fn) => fn())
    authFailListeners.clear()
  }
  document.head.appendChild(script)
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function MapPicker({ lat, lng, zoom = 12, onChange, className }: MapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [ready, setReady] = useState(false)
  const [mapError, setMapError] = useState(false)
  const [searching, setSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [apiKey, setApiKey] = useState(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '')
  const [manualLat, setManualLat] = useState(lat)
  const [manualLng, setManualLng] = useState(lng)

  // If no key in env, try the settings API
  useEffect(() => {
    if (apiKey) return
    fetch('/api/maps-config')
      .then((r) => r.json())
      .then((d: { apiKey?: string }) => { if (d.apiKey) setApiKey(d.apiKey) })
      .catch(() => undefined)
  }, [apiKey])

  const initMap = useCallback(() => {
    if (!mapRef.current || !window.google) return

    const defaultLat = parseFloat(lat) || 39.9208
    const defaultLng = parseFloat(lng) || 32.8541

    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: defaultLat, lng: defaultLng },
      zoom,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControlOptions: { position: window.google.maps.ControlPosition.RIGHT_CENTER },
      styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
      ],
    })
    mapInstance.current = map

    // Pin
    const marker = new window.google.maps.Marker({
      map,
      draggable: true,
      animation: window.google.maps.Animation.DROP,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: 'var(--manage-primary, #0ea5e9)',
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 2,
      },
    })
    markerRef.current = marker

    if (lat && lng) {
      const pos = { lat: parseFloat(lat), lng: parseFloat(lng) }
      marker.setPosition(pos)
    } else {
      marker.setVisible(false)
    }

    // Click on map → place pin
    map.addListener('click', (e: MapClickEventLike) => {
      if (!e.latLng) return
      const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() }
      marker.setPosition(pos)
      marker.setVisible(true)
      onChange(pos.lat.toFixed(6), pos.lng.toFixed(6))
    })

    // Drag marker → update
    marker.addListener('dragend', () => {
      const pos = marker.getPosition()
      if (pos) onChange(pos.lat().toFixed(6), pos.lng().toFixed(6))
    })

    setReady(true)
  }, [lat, lng, zoom, onChange])

  // Subscribe to auth failure events
  useEffect(() => {
    if (gmAuthFailed) { setMapError(true); return }
    const handler = () => setMapError(true)
    authFailListeners.add(handler)
    return () => { authFailListeners.delete(handler) }
  }, [])

  useEffect(() => {
    if (!apiKey || gmAuthFailed) { setReady(false); return }
    loadGoogleMaps(apiKey, initMap)
  }, [apiKey, initMap])

  // When lat/lng props change externally, sync the marker
  useEffect(() => {
    if (!ready || !markerRef.current || !mapInstance.current) return
    if (lat && lng) {
      const pos = { lat: parseFloat(lat), lng: parseFloat(lng) }
      markerRef.current.setPosition(pos)
      markerRef.current.setVisible(true)
      mapInstance.current.panTo(pos)
    }
  }, [lat, lng, ready])

  const handleSearch = async () => {
    if (!searchQuery.trim() || !window.google || !mapInstance.current) return
    setSearching(true)
    try {
      const geocoder = new window.google.maps.Geocoder()
      const res = await geocoder.geocode({ address: searchQuery })
      if (res.results[0]) {
        const { lat: rLat, lng: rLng } = res.results[0].geometry.location
        const pos: LatLng = { lat: rLat(), lng: rLng() }
        mapInstance.current.setCenter(pos)
        mapInstance.current.setZoom(13)
        markerRef.current?.setPosition(pos)
        markerRef.current?.setVisible(true)
        onChange(pos.lat.toFixed(6), pos.lng.toFixed(6))
      }
    } finally {
      setSearching(false)
    }
  }

  const handleCenterOnPin = () => {
    if (!mapInstance.current || !markerRef.current) return
    const pos = markerRef.current.getPosition()
    if (pos) mapInstance.current.panTo(pos)
  }

  const handleClear = () => {
    markerRef.current?.setVisible(false)
    onChange('', '')
  }

  // ─── Fallback: billing error or no key ────────────────────────────────────
  if (mapError || !apiKey) {
    return (
      <div className={clsx('overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700', className)}>
        <div className="flex items-start gap-3 bg-amber-50 px-4 py-3 dark:bg-amber-950/20">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              {mapError ? 'Google Maps yüklenemedi (Fatura etkin değil)' : 'Google Maps API anahtarı bulunamadı'}
            </p>
            <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">
              {mapError
                ? 'Google Cloud Console\'da Maps JavaScript API için faturalandırmayı etkinleştirin. Bu arada koordinatları manuel girebilirsiniz.'
                : 'Ayarlar → Google bölümünden API anahtarı ekleyin veya koordinatları manuel girin.'}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 p-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">Enlem (Latitude)</label>
            <input
              type="text"
              value={manualLat}
              onChange={(e) => setManualLat(e.target.value)}
              placeholder="37.000000"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">Boylam (Longitude)</label>
            <input
              type="text"
              value={manualLng}
              onChange={(e) => setManualLng(e.target.value)}
              placeholder="35.000000"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-neutral-100 px-4 pb-4 dark:border-neutral-800">
          <button
            type="button"
            onClick={() => {
              const la = manualLat.trim()
              const lo = manualLng.trim()
              if (la && lo && !isNaN(parseFloat(la)) && !isNaN(parseFloat(lo))) {
                onChange(parseFloat(la).toFixed(6), parseFloat(lo).toFixed(6))
              }
            }}
            className="rounded-xl bg-[color:var(--manage-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Koordinatları Uygula
          </button>
          {lat && lng && (
            <a
              href={`https://www.google.com/maps?q=${lat},${lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[color:var(--manage-primary)] hover:underline"
            >
              Google Maps'te aç ↗
            </a>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={clsx('overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700', className)}>
      {/* Search bar */}
      <div className="flex items-center gap-2 border-b border-neutral-100 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900">
        <Search className="h-4 w-4 shrink-0 text-neutral-400" />
        <input
          ref={searchRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void handleSearch()}
          placeholder="Adres veya konum ara…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400"
        />
        {searchQuery && (
          <button type="button" onClick={() => setSearchQuery('')} className="text-neutral-300 hover:text-neutral-600">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => void handleSearch()}
          disabled={!ready || searching}
          className="rounded-lg bg-[color:var(--manage-primary)] px-3 py-1 text-xs font-semibold text-white disabled:opacity-50 hover:opacity-90"
        >
          {searching ? '…' : 'Ara'}
        </button>
      </div>

      {/* Map */}
      <div className="relative">
        <div ref={mapRef} className="h-72 w-full bg-neutral-100 dark:bg-neutral-800" />

        {/* Hint overlay (before any interaction) */}
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-50 dark:bg-neutral-800">
            <p className="text-sm text-neutral-400">Harita yükleniyor…</p>
          </div>
        )}

        {/* Floating controls */}
        {ready && (
          <div className="absolute bottom-3 left-3 flex gap-1.5">
            {lat && lng && (
              <>
                <button
                  type="button"
                  onClick={handleCenterOnPin}
                  title="Pine git"
                  className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 shadow hover:bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-300"
                >
                  <Crosshair className="h-3.5 w-3.5" />
                  Pine git
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  title="Pini kaldır"
                  className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 shadow hover:bg-red-50 dark:bg-neutral-800"
                >
                  <X className="h-3.5 w-3.5" />
                  Kaldır
                </button>
              </>
            )}
          </div>
        )}

        {ready && !lat && !lng && (
          <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-4">
            <div className="flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
              <MapPin className="h-3.5 w-3.5" /> Haritaya tıklayarak pin koyun
            </div>
          </div>
        )}
      </div>

      {/* Coordinate display */}
      {lat && lng && (
        <div className="flex items-center justify-between border-t border-neutral-100 bg-neutral-50 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800/50">
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <MapPin className="h-3.5 w-3.5 text-[color:var(--manage-primary)]" />
            <code className="font-mono">
              {parseFloat(lat).toFixed(6)}, {parseFloat(lng).toFixed(6)}
            </code>
          </div>
          <a
            href={`https://www.google.com/maps?q=${lat},${lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[color:var(--manage-primary)] hover:underline"
          >
            Google Maps'te aç ↗
          </a>
        </div>
      )}
    </div>
  )
}
