'use client'
import { formatManageApiCatch } from '@/lib/manage-api-error-tr'
import { getStoredAuthToken } from '@/lib/auth-storage'
import {
  generateAiDestinationsSync,
  generateAiDistrictsSync,
  generateAiProvincesSync,
  listAiRegionTasks,
  listLocationCountries,
  listLocationDistricts,
  listLocationRegions,
  type LocationCountry,
  type LocationDistrict,
  type LocationRegion,
} from '@/lib/travel-api'
import clsx from 'clsx'
import {
  Bot,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Loader2,
  MapPin,
  Sparkles,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

type AiTask = Record<string, unknown>

function statusBadge(status: unknown) {
  const s = String(status)
  if (s === 'done' || s === 'completed')
    return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">Tamamlandı</span>
  if (s === 'processing' || s === 'running')
    return <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"><Loader2 className="h-2.5 w-2.5 animate-spin" />İşleniyor</span>
  if (s === 'pending')
    return <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"><Clock className="h-2.5 w-2.5" />Bekliyor</span>
  if (s === 'error' || s === 'failed')
    return <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-950/40 dark:text-red-400">Hata</span>
  return <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-500 dark:bg-neutral-800">{s}</span>
}

function slugToLabel(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toLocaleUpperCase('tr-TR') + w.slice(1))
    .join(' ')
}

export default function AiRegionsClient() {
  const [countries, setCountries] = useState<LocationCountry[]>([])
  const [tasks, setTasks] = useState<AiTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [countryName, setCountryName] = useState('')
  const [selectedCountryId, setSelectedCountryId] = useState('')
  const [creatingCities, setCreatingCities] = useState(false)
  const [provincesOk, setProvincesOk] = useState<string | null>(null)

  const [expandedCountry, setExpandedCountry] = useState<string | null>(null)
  const [regionsFor, setRegionsFor] = useState<LocationRegion[]>([])
  const [loadingRegions, setLoadingRegions] = useState(false)
  const [expandedRegion, setExpandedRegion] = useState<string | null>(null)
  const [districtsFor, setDistrictsFor] = useState<LocationDistrict[]>([])
  const [loadingDistricts, setLoadingDistricts] = useState(false)
  const [creatingDistricts, setCreatingDistricts] = useState<string | null>(null)
  const [districtsOk, setDistrictsOk] = useState<string | null>(null)
  const [creatingDestinations, setCreatingDestinations] = useState<string | null>(null)
  const [destinationsOk, setDestinationsOk] = useState<string | null>(null)

  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const token = getStoredAuthToken() ?? ''

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [cRes, tRes] = await Promise.all([
        listLocationCountries(),
        listAiRegionTasks(token),
      ])
      setCountries(cRes.countries)
      setTasks(tRes.tasks)
    } catch (e) {
      setError(formatManageApiCatch(e, 'Yüklenemedi'))
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void loadData()
    return () => { if (pollRef.current) clearTimeout(pollRef.current) }
  }, [loadData])

  const handleCreateCities = useCallback(async () => {
    if (!countryName.trim()) return
    setCreatingCities(true)
    setError(null)
    setProvincesOk(null)
    try {
      const out = await generateAiProvincesSync(token, {
        country_id: selectedCountryId || undefined,
        country_name: countryName.trim(),
      })
      setProvincesOk(`${out.created} il eklendi, ${out.skipped} atlandı.`)
      setCountryName('')
      setSelectedCountryId('')
      await loadData()
    } catch (e) {
      setError(formatManageApiCatch(e, 'İller oluşturulamadı'))
    } finally {
      setCreatingCities(false)
    }
  }, [token, countryName, selectedCountryId, loadData])

  const handleExpandCountry = useCallback(async (countryId: string) => {
    if (expandedCountry === countryId) {
      setExpandedCountry(null)
      setExpandedRegion(null)
      return
    }
    setExpandedCountry(countryId)
    setExpandedRegion(null)
    setLoadingRegions(true)
    try {
      const res = await listLocationRegions(countryId)
      setRegionsFor(res.regions)
    } finally {
      setLoadingRegions(false)
    }
  }, [expandedCountry])

  const handleExpandRegion = useCallback(async (regionId: string) => {
    if (expandedRegion === regionId) {
      setExpandedRegion(null)
      return
    }
    setExpandedRegion(regionId)
    setLoadingDistricts(true)
    setDistrictsOk(null)
    setDestinationsOk(null)
    try {
      const res = await listLocationDistricts(regionId)
      setDistrictsFor(res.districts)
    } finally {
      setLoadingDistricts(false)
    }
  }, [expandedRegion])

  const handleCreateDistricts = useCallback(async (region: LocationRegion) => {
    setCreatingDistricts(region.id)
    setError(null)
    setDistrictsOk(null)
    try {
      const out = await generateAiDistrictsSync(token, { region_id: region.id })
      setDistrictsOk(`${region.name}: ${out.created} ilçe eklendi, ${out.skipped} atlandı.`)
      const res = await listLocationDistricts(region.id)
      setDistrictsFor(res.districts)
      await loadData()
    } catch (e) {
      setError(formatManageApiCatch(e, 'İlçeler oluşturulamadı'))
    } finally {
      setCreatingDistricts(null)
    }
  }, [token, loadData])

  const handleCreateDestinations = useCallback(async (district: LocationDistrict, region: LocationRegion) => {
    setCreatingDestinations(district.id)
    setError(null)
    setDestinationsOk(null)
    try {
      const out = await generateAiDestinationsSync(token, { district_id: district.id })
      setDestinationsOk(
        `${district.name} (${region.name}): ${out.created} destinasyon eklendi, ${out.skipped} atlandı.`,
      )
      await loadData()
    } catch (e) {
      setError(formatManageApiCatch(e, 'Destinasyonlar oluşturulamadı'))
    } finally {
      setCreatingDestinations(null)
    }
  }, [token, loadData])

  return (
    <div className="pt-2">
      <div className="mb-6 flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-950/40">
          <Sparkles className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            AI Bölge Oluşturucu
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Ülke → il → ilçe → popüler destinasyon (Kalkan, Ölüdeniz…). DeepSeek API ayarları açık olmalı.
          </p>
        </div>
      </div>

      {error ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30">
          {error}
          <button type="button" onClick={() => setError(null)} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}
      {districtsOk ? (
        <p className="mb-3 text-xs text-emerald-600 dark:text-emerald-400">{districtsOk}</p>
      ) : null}
      {destinationsOk ? (
        <p className="mb-3 text-xs text-emerald-600 dark:text-emerald-400">{destinationsOk}</p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          <div className="mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-violet-500" />
            <h2 className="text-base font-semibold">Adım 1 — İller</h2>
          </div>
          <p className="mb-4 text-sm text-neutral-500">
            Örn. Türkiye → Antalya, Muğla…
          </p>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Ülke adı (ör. Türkiye)"
              value={countryName}
              onChange={(e) => setCountryName(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            />
            <select
              value={selectedCountryId}
              onChange={(e) => setSelectedCountryId(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            >
              <option value="">Mevcut ülkeye bağla (isteğe bağlı)</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button
              type="button"
              disabled={!countryName.trim() || creatingCities}
              onClick={() => void handleCreateCities()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
            >
              {creatingCities ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              İlleri oluştur
            </button>
            {provincesOk ? <p className="text-xs text-emerald-600">{provincesOk}</p> : null}
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          <div className="mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-violet-500" />
            <h2 className="text-base font-semibold">Adım 2–3 — İlçe & destinasyon</h2>
          </div>
          <p className="mb-4 text-sm text-neutral-500">
            Ülke aç → il seç → <strong>İlçeler</strong> → ilçe altında <strong>Destinasyonlar</strong> (popüler semtler).
          </p>

          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
          ) : (
            <div className="max-h-96 space-y-1 overflow-y-auto">
              {countries.map((c) => (
                <div key={c.id}>
                  <button
                    type="button"
                    onClick={() => void handleExpandCountry(c.id)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  >
                    <span className="font-medium">{c.name}</span>
                    {expandedCountry === c.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  {expandedCountry === c.id ? (
                    <div className="ml-3 border-l pl-2">
                      {loadingRegions ? (
                        <p className="py-2 text-xs text-neutral-400">İller yükleniyor…</p>
                      ) : regionsFor.length === 0 ? (
                        <p className="py-2 text-xs text-neutral-400">Önce Adım 1 ile il oluşturun.</p>
                      ) : (
                        regionsFor.map((r) => (
                          <div key={r.id} className="py-1">
                            <div className="flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => void handleExpandRegion(r.id)}
                                className="text-left text-xs font-medium text-neutral-700 dark:text-neutral-300"
                              >
                                {r.name}
                              </button>
                              <button
                                type="button"
                                disabled={creatingDistricts === r.id}
                                onClick={() => void handleCreateDistricts(r)}
                                className="shrink-0 rounded bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
                              >
                                {creatingDistricts === r.id ? <Loader2 className="inline h-3 w-3 animate-spin" /> : 'İlçeler'}
                              </button>
                            </div>
                            {expandedRegion === r.id ? (
                              <div className="mt-1 space-y-1 border-l border-neutral-100 pl-2 dark:border-neutral-800">
                                {loadingDistricts ? (
                                  <p className="text-[10px] text-neutral-400">İlçeler…</p>
                                ) : districtsFor.length === 0 ? (
                                  <p className="text-[10px] text-neutral-400">İlçe yok — «İlçeler» ile üretin.</p>
                                ) : (
                                  districtsFor.map((d) => (
                                    <div key={d.id} className="flex items-center justify-between gap-1 py-0.5">
                                      <span className="text-[10px] text-neutral-600 dark:text-neutral-400">{d.name}</span>
                                      <button
                                        type="button"
                                        disabled={creatingDestinations === d.id}
                                        onClick={() => void handleCreateDestinations(d, r)}
                                        className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
                                        title={`${slugToLabel(d.slug)} için popüler alt bölgeler`}
                                      >
                                        {creatingDestinations === d.id ? (
                                          <Loader2 className="inline h-3 w-3 animate-spin" />
                                        ) : (
                                          'Destinasyon'
                                        )}
                                      </button>
                                    </div>
                                  ))
                                )}
                              </div>
                            ) : null}
                          </div>
                        ))
                      )}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex items-start gap-2 rounded-xl bg-violet-50 p-4 text-sm text-violet-700 dark:bg-violet-950/20 dark:text-violet-300">
        <Check className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Destinasyonlar vitrinde ilan kartında görünür (ör. «Kalkan, Kaş, Antalya»). İlan başına atama: katalog → ilan düzenle → vitrin konumu alanları.
          {' '}
          <a href="../regions" className="underline">Bölgeler</a>
          {' · '}
          <a href="../regions/countries" className="underline">Ülkeler</a>
        </p>
      </div>
    </div>
  )
}
