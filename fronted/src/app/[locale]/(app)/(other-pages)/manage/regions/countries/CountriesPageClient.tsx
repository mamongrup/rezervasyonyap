'use client'

import {
  createLocationCountry,
  createLocationDistrict,
  createLocationRegion,
  listLocationCountries,
  listLocationDistricts,
  listLocationRegions,
  type LocationCountry,
  type LocationDistrict,
  type LocationRegion,
} from '@/lib/travel-api'
import clsx from 'clsx'
import {
  ChevronRight,
  Loader2,
  MapPin,
  Plus,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'

// ─── slugify ─────────────────────────────────────────────────────────────────
function toSlug(s: string) {
  return s
    .toLowerCase()
    .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i')
    .replace(/İ/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

// ─── Small form modal / inline panel ─────────────────────────────────────────
type AddCountryForm = { iso2: string; name: string }
type AddRegionForm = { name: string; slug: string; center_lat: string; center_lng: string }
type AddDistrictForm = { name: string; slug: string; center_lat: string; center_lng: string }

// ─── Column panel component ───────────────────────────────────────────────────
function Panel({
  title,
  badge,
  loading,
  children,
  action,
}: {
  title: string
  badge?: number
  loading?: boolean
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col rounded-2xl border border-neutral-100 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
      <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{title}</span>
          {badge !== undefined ? (
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
              {badge}
            </span>
          ) : null}
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-400" /> : null}
        </div>
        {action}
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  )
}

// ─── Row item ─────────────────────────────────────────────────────────────────
function Row({
  label,
  sub,
  active,
  onClick,
  hasChildren,
}: {
  label: string
  sub?: string
  active?: boolean
  onClick: () => void
  hasChildren?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left transition-colors',
        active
          ? 'bg-[color:var(--manage-primary-soft)] text-[color:var(--manage-primary)]'
          : 'hover:bg-neutral-50 dark:hover:bg-neutral-800',
      )}
    >
      <div>
        <p className={clsx('text-sm font-medium', active ? 'text-[color:var(--manage-primary)]' : 'text-neutral-800 dark:text-neutral-200')}>
          {label}
        </p>
        {sub ? <p className="text-[11px] text-neutral-400">{sub}</p> : null}
      </div>
      {hasChildren ? <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300" /> : null}
    </button>
  )
}

// ─── Add form inline ──────────────────────────────────────────────────────────
function InlineAddForm({
  fields,
  onSubmit,
  busy,
  onCancel,
}: {
  fields: { key: string; label: string; placeholder?: string; mono?: boolean }[]
  onSubmit: (vals: Record<string, string>) => void
  busy: boolean
  onCancel: () => void
}) {
  const [vals, setVals] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, ''])),
  )

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit(vals)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-b border-neutral-100 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-800/50"
    >
      <div className="space-y-2">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="mb-0.5 block text-xs font-medium text-neutral-500 dark:text-neutral-400">
              {f.label}
            </label>
            <input
              type="text"
              required
              value={vals[f.key] ?? ''}
              placeholder={f.placeholder}
              onChange={(e) =>
                setVals((prev) => {
                  const next = { ...prev, [f.key]: e.target.value }
                  // auto-slug
                  if (f.key === 'name' && 'slug' in prev) {
                    next.slug = toSlug(e.target.value)
                  }
                  return next
                })
              }
              className={clsx(
                'w-full rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm focus:border-[color:var(--manage-primary)] focus:outline-none dark:border-neutral-700 dark:bg-neutral-900',
                f.mono && 'font-mono',
              )}
            />
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="flex items-center gap-1.5 rounded-lg bg-[color:var(--manage-primary)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          Ekle
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-xs text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          İptal
        </button>
      </div>
    </form>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CountriesPageClient() {
  const [countries, setCountries] = useState<LocationCountry[]>([])
  const [regions, setRegions] = useState<LocationRegion[]>([])
  const [districts, setDistricts] = useState<LocationDistrict[]>([])

  const [loadingCountries, setLoadingCountries] = useState(true)
  const [loadingRegions, setLoadingRegions] = useState(false)
  const [loadingDistricts, setLoadingDistricts] = useState(false)

  const [selectedCountry, setSelectedCountry] = useState<LocationCountry | null>(null)
  const [selectedRegion, setSelectedRegion] = useState<LocationRegion | null>(null)

  const [showAddCountry, setShowAddCountry] = useState(false)
  const [showAddRegion, setShowAddRegion] = useState(false)
  const [showAddDistrict, setShowAddDistrict] = useState(false)

  const [addingCountry, setAddingCountry] = useState(false)
  const [addingRegion, setAddingRegion] = useState(false)
  const [addingDistrict, setAddingDistrict] = useState(false)

  const [error, setError] = useState<string | null>(null)

  // Load countries
  const loadCountries = useCallback(async () => {
    setLoadingCountries(true)
    try {
      const res = await listLocationCountries()
      setCountries(res.countries)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ülkeler yüklenemedi')
    } finally {
      setLoadingCountries(false)
    }
  }, [])

  useEffect(() => { void loadCountries() }, [loadCountries])

  // Select country → load regions
  const selectCountry = useCallback(async (c: LocationCountry) => {
    setSelectedCountry(c)
    setSelectedRegion(null)
    setDistricts([])
    setLoadingRegions(true)
    try {
      const res = await listLocationRegions(c.id)
      setRegions(res.regions)
    } catch {
      setRegions([])
    } finally {
      setLoadingRegions(false)
    }
  }, [])

  // Select region → load districts
  const selectRegion = useCallback(async (r: LocationRegion) => {
    setSelectedRegion(r)
    setLoadingDistricts(true)
    try {
      const res = await listLocationDistricts(r.id)
      setDistricts(res.districts)
    } catch {
      setDistricts([])
    } finally {
      setLoadingDistricts(false)
    }
  }, [])

  // Add country
  const handleAddCountry = useCallback(async (vals: Record<string, string>) => {
    setAddingCountry(true)
    try {
      await createLocationCountry({ iso2: vals.iso2.toUpperCase(), name: vals.name })
      setShowAddCountry(false)
      await loadCountries()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Eklenemedi')
    } finally {
      setAddingCountry(false)
    }
  }, [loadCountries])

  // Add region
  const handleAddRegion = useCallback(async (vals: Record<string, string>) => {
    if (!selectedCountry) return
    setAddingRegion(true)
    try {
      await createLocationRegion({
        country_id: selectedCountry.id,
        name: vals.name,
        slug: vals.slug,
        center_lat: vals.center_lat || undefined,
        center_lng: vals.center_lng || undefined,
      })
      setShowAddRegion(false)
      const res = await listLocationRegions(selectedCountry.id)
      setRegions(res.regions)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Eklenemedi')
    } finally {
      setAddingRegion(false)
    }
  }, [selectedCountry])

  // Add district
  const handleAddDistrict = useCallback(async (vals: Record<string, string>) => {
    if (!selectedRegion) return
    setAddingDistrict(true)
    try {
      await createLocationDistrict({
        region_id: selectedRegion.id,
        name: vals.name,
        slug: vals.slug,
        center_lat: vals.center_lat || undefined,
        center_lng: vals.center_lng || undefined,
      })
      setShowAddDistrict(false)
      const res = await listLocationDistricts(selectedRegion.id)
      setDistricts(res.districts)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Eklenemedi')
    } finally {
      setAddingDistrict(false)
    }
  }, [selectedRegion])

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          Ülkeler, İller & İlçeler
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Coğrafi hiyerarşi: Ülke → İl/Bölge → İlçe. Yapay zeka ile otomatik oluşturma için{' '}
          <a href="../ai/regions" className="text-[color:var(--manage-primary)] underline">
            AI Bölge Oluşturucu
          </a>
          'yu kullanın.
        </p>
      </div>

      {error ? (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {error}
          <button type="button" onClick={() => setError(null)} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {/* 3-panel column browser */}
      <div className="flex gap-4" style={{ minHeight: '60vh' }}>
        {/* ── Ülkeler ── */}
        <Panel
          title="Ülkeler"
          badge={countries.length}
          loading={loadingCountries}
          action={
            <button
              type="button"
              onClick={() => setShowAddCountry((v) => !v)}
              className="flex items-center gap-1 rounded-lg bg-[color:var(--manage-primary-soft)] px-2.5 py-1 text-xs font-semibold text-[color:var(--manage-primary)] hover:opacity-80"
            >
              <Plus className="h-3.5 w-3.5" />
              Ekle
            </button>
          }
        >
          {showAddCountry ? (
            <InlineAddForm
              fields={[
                { key: 'iso2', label: 'ISO2 kodu (ör. TR)', placeholder: 'TR', mono: true },
                { key: 'name', label: 'Ülke adı', placeholder: 'Türkiye' },
              ]}
              onSubmit={handleAddCountry}
              busy={addingCountry}
              onCancel={() => setShowAddCountry(false)}
            />
          ) : null}
          {countries.length === 0 && !loadingCountries ? (
            <p className="px-4 py-8 text-center text-sm text-neutral-400">
              Henüz ülke yok.
            </p>
          ) : null}
          {countries.map((c) => (
            <Row
              key={c.id}
              label={c.name}
              sub={c.iso2}
              active={selectedCountry?.id === c.id}
              onClick={() => void selectCountry(c)}
              hasChildren
            />
          ))}
        </Panel>

        {/* ── İller / Bölgeler ── */}
        <Panel
          title={selectedCountry ? `${selectedCountry.name} — İller` : 'İller / Bölgeler'}
          badge={selectedCountry ? regions.length : undefined}
          loading={loadingRegions}
          action={
            selectedCountry ? (
              <button
                type="button"
                onClick={() => setShowAddRegion((v) => !v)}
                className="flex items-center gap-1 rounded-lg bg-[color:var(--manage-primary-soft)] px-2.5 py-1 text-xs font-semibold text-[color:var(--manage-primary)] hover:opacity-80"
              >
                <Plus className="h-3.5 w-3.5" />
                Ekle
              </button>
            ) : undefined
          }
        >
          {!selectedCountry ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-4 py-8 text-center text-sm text-neutral-400">
              <MapPin className="h-8 w-8 opacity-30" />
              Soldaki listeden bir ülke seçin
            </div>
          ) : (
            <>
              {showAddRegion ? (
                <InlineAddForm
                  fields={[
                    { key: 'name', label: 'İl / Bölge adı', placeholder: 'Muğla' },
                    { key: 'slug', label: 'Slug', placeholder: 'mugla', mono: true },
                    { key: 'center_lat', label: 'Enlem (isteğe bağlı)', placeholder: '37.2153' },
                    { key: 'center_lng', label: 'Boylam (isteğe bağlı)', placeholder: '28.3636' },
                  ]}
                  onSubmit={handleAddRegion}
                  busy={addingRegion}
                  onCancel={() => setShowAddRegion(false)}
                />
              ) : null}
              {regions.length === 0 && !loadingRegions ? (
                <p className="px-4 py-8 text-center text-sm text-neutral-400">
                  Bu ülkede henüz il/bölge yok.
                </p>
              ) : null}
              {regions.map((r) => (
                <Row
                  key={r.id}
                  label={r.name}
                  sub={r.center_lat && r.center_lng ? `${r.center_lat}, ${r.center_lng}` : r.slug}
                  active={selectedRegion?.id === r.id}
                  onClick={() => void selectRegion(r)}
                  hasChildren
                />
              ))}
            </>
          )}
        </Panel>

        {/* ── İlçeler ── */}
        <Panel
          title={selectedRegion ? `${selectedRegion.name} — İlçeler` : 'İlçeler'}
          badge={selectedRegion ? districts.length : undefined}
          loading={loadingDistricts}
          action={
            selectedRegion ? (
              <button
                type="button"
                onClick={() => setShowAddDistrict((v) => !v)}
                className="flex items-center gap-1 rounded-lg bg-[color:var(--manage-primary-soft)] px-2.5 py-1 text-xs font-semibold text-[color:var(--manage-primary)] hover:opacity-80"
              >
                <Plus className="h-3.5 w-3.5" />
                Ekle
              </button>
            ) : undefined
          }
        >
          {!selectedRegion ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-4 py-8 text-center text-sm text-neutral-400">
              <MapPin className="h-8 w-8 opacity-30" />
              Ortadaki listeden bir il/bölge seçin
            </div>
          ) : (
            <>
              {showAddDistrict ? (
                <InlineAddForm
                  fields={[
                    { key: 'name', label: 'İlçe adı', placeholder: 'Bodrum' },
                    { key: 'slug', label: 'Slug', placeholder: 'bodrum', mono: true },
                    { key: 'center_lat', label: 'Enlem (isteğe bağlı)', placeholder: '37.0381' },
                    { key: 'center_lng', label: 'Boylam (isteğe bağlı)', placeholder: '27.4297' },
                  ]}
                  onSubmit={handleAddDistrict}
                  busy={addingDistrict}
                  onCancel={() => setShowAddDistrict(false)}
                />
              ) : null}
              {districts.length === 0 && !loadingDistricts ? (
                <p className="px-4 py-8 text-center text-sm text-neutral-400">
                  Bu ilde henüz ilçe yok.
                </p>
              ) : null}
              {districts.map((d) => (
                <Row
                  key={d.id}
                  label={d.name}
                  sub={d.center_lat && d.center_lng ? `${d.center_lat}, ${d.center_lng}` : d.slug}
                  active={false}
                  onClick={() => {}}
                />
              ))}
            </>
          )}
        </Panel>
      </div>

      {/* Bilgi */}
      <p className="mt-4 text-xs text-neutral-400">
        Slug otomatik oluşturulur — gerekirse düzenleyebilirsiniz. Koordinatlar harita entegrasyonu ve POI mesafe hesabı için kullanılır.
      </p>
    </div>
  )
}
