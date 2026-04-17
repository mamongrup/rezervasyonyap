'use client'

import clsx from 'clsx'
import {
  Check,
  Eye,
  EyeOff,
  Globe,
  MapPin,
  Save,
  Loader2,
} from 'lucide-react'
import { useState } from 'react'

const MAP_LIBRARIES = [
  { id: 'places', label: 'Places API', desc: 'Arama, otomatik tamamlama ve yer detayları' },
  { id: 'geocoding', label: 'Geocoding API', desc: 'Adres ↔ koordinat dönüşümü' },
  { id: 'directions', label: 'Directions API', desc: 'Rota ve mesafe hesaplama' },
  { id: 'distance', label: 'Distance Matrix API', desc: 'Çoklu noktalar arası mesafe' },
]

const POI_TYPES = [
  { id: 'restaurant', label: 'Restoranlar' },
  { id: 'beach', label: 'Plajlar' },
  { id: 'tourist_attraction', label: 'Turistik Yerler' },
  { id: 'museum', label: 'Müzeler' },
  { id: 'shopping_mall', label: 'Alışveriş Merkezleri' },
  { id: 'hospital', label: 'Hastaneler' },
  { id: 'airport', label: 'Havalimanları' },
  { id: 'bus_station', label: 'Otobüs Terminalleri' },
  { id: 'lodging', label: 'Konaklama' },
  { id: 'park', label: 'Parklar & Doğa Alanları' },
]

export default function MapsSettingsClient() {
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [defaultLat, setDefaultLat] = useState('39.9334')
  const [defaultLng, setDefaultLng] = useState('32.8597')
  const [defaultZoom, setDefaultZoom] = useState('6')
  const [libraries, setLibraries] = useState<string[]>(['places', 'geocoding'])
  const [poiRadius, setPoiRadius] = useState('3000')
  const [poiMaxPerType, setPoiMaxPerType] = useState('5')
  const [enabledPoi, setEnabledPoi] = useState<string[]>(['restaurant', 'beach', 'tourist_attraction'])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const toggleLibrary = (id: string) =>
    setLibraries((prev) => prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id])

  const togglePoi = (id: string) =>
    setEnabledPoi((prev) => prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id])

  const handleSave = async () => {
    setSaving(true)
    // TODO: Connect to real settings API when available
    await new Promise((r) => setTimeout(r, 800))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-950/40">
          <Globe className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Google Maps Ayarları</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Harita API anahtarı, konum ve çevredeki yer noktası (POI) ayarları.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* API Key */}
        <section className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          <h2 className="mb-4 text-base font-semibold text-neutral-900 dark:text-neutral-100">
            API Anahtarı
          </h2>
          <div className="max-w-lg">
            <label className="mb-1 block text-xs font-medium text-neutral-500">
              Google Maps API Anahtarı
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showKey ? 'text' : 'password'}
                  placeholder="AIzaSy..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2 font-mono text-sm focus:border-[color:var(--manage-primary)] focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <p className="mt-2 text-xs text-neutral-400">
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[color:var(--manage-primary)] underline"
              >
                Google Cloud Console
              </a>
              &apos;dan API anahtarı alabilirsiniz.
            </p>
          </div>
        </section>

        {/* Varsayılan Konum */}
        <section className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          <h2 className="mb-4 text-base font-semibold text-neutral-900 dark:text-neutral-100">
            Varsayılan Harita Konumu
          </h2>
          <div className="grid gap-4 sm:grid-cols-3 max-w-lg">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Enlem</label>
              <input
                type="number"
                step="0.0001"
                value={defaultLat}
                onChange={(e) => setDefaultLat(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Boylam</label>
              <input
                type="number"
                step="0.0001"
                value={defaultLng}
                onChange={(e) => setDefaultLng(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Zoom</label>
              <input
                type="number"
                min={1}
                max={20}
                value={defaultZoom}
                onChange={(e) => setDefaultZoom(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              />
            </div>
          </div>
        </section>

        {/* Kütüphaneler */}
        <section className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          <h2 className="mb-4 text-base font-semibold text-neutral-900 dark:text-neutral-100">
            API Kütüphaneleri
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {MAP_LIBRARIES.map((lib) => {
              const active = libraries.includes(lib.id)
              return (
                <label
                  key={lib.id}
                  className={clsx(
                    'flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors',
                    active
                      ? 'border-[color:var(--manage-primary)] bg-[color:var(--manage-primary-soft)]'
                      : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-700',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggleLibrary(lib.id)}
                    className="mt-0.5 rounded"
                  />
                  <div>
                    <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{lib.label}</p>
                    <p className="text-xs text-neutral-500">{lib.desc}</p>
                  </div>
                </label>
              )
            })}
          </div>
        </section>

        {/* POI Ayarları */}
        <section className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          <h2 className="mb-1 text-base font-semibold text-neutral-900 dark:text-neutral-100">
            <MapPin className="mr-1 inline h-4 w-4 text-red-500" />
            Çevredeki Yer Noktaları (POI)
          </h2>
          <p className="mb-4 text-xs text-neutral-500">
            Bölge sayfalarında otomatik çekilen yakın mekânlar.
          </p>

          <div className="mb-4 grid gap-4 sm:grid-cols-2 max-w-sm">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Yarıçap (metre)</label>
              <input
                type="number"
                min={500}
                max={50000}
                value={poiRadius}
                onChange={(e) => setPoiRadius(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Tür başına maks.</label>
              <input
                type="number"
                min={1}
                max={20}
                value={poiMaxPerType}
                onChange={(e) => setPoiMaxPerType(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              />
            </div>
          </div>

          <p className="mb-3 text-xs font-medium text-neutral-500">Etkin POI türleri:</p>
          <div className="flex flex-wrap gap-2">
            {POI_TYPES.map((poi) => {
              const active = enabledPoi.includes(poi.id)
              return (
                <button
                  key={poi.id}
                  type="button"
                  onClick={() => togglePoi(poi.id)}
                  className={clsx(
                    'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                    active
                      ? 'bg-[color:var(--manage-primary)] text-white'
                      : 'border border-neutral-200 text-neutral-600 hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-400',
                  )}
                >
                  {poi.label}
                </button>
              )
            })}
          </div>
        </section>

        {/* Save */}
        <div className="flex justify-end">
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className={clsx(
              'flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-60',
              saved ? 'bg-emerald-600' : 'bg-[color:var(--manage-primary)] hover:opacity-90',
            )}
          >
            {saving ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Kaydediliyor…</>
            ) : saved ? (
              <><Check className="h-4 w-4" />Kaydedildi</>
            ) : (
              <><Save className="h-4 w-4" />Kaydet</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
