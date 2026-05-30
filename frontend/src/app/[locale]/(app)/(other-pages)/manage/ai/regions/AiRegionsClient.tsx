'use client'
import { formatManageApiCatch } from '@/lib/manage-api-error-tr'
import { getStoredAuthToken } from '@/lib/auth-storage'
import {
  generateAiDestinationsSync,
  generateAiDistrictsSync,
  generateAiProvincesSync,
  listLocationCountries,
  listLocationDistricts,
  listLocationPages,
  listLocationRegions,
  type LocationCountry,
  type LocationDistrict,
  type LocationRegion,
} from '@/lib/travel-api'
import clsx from 'clsx'
import {
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Loader2,
  MapPin,
  Search,
  Sparkles,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

function slugToLabel(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toLocaleUpperCase('tr-TR') + w.slice(1))
    .join(' ')
}

async function countDestinationsForDistrict(districtId: string): Promise<number> {
  try {
    const res = await listLocationPages({ district_id: districtId, limit: 500 })
    return res.pages.filter((p) => p.region_type === 'destination').length
  } catch {
    return 0
  }
}

export default function AiRegionsClient() {
  const token = getStoredAuthToken() ?? ''

  const [countries, setCountries] = useState<LocationCountry[]>([])
  const [loadingInit, setLoadingInit] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [activeCountryId, setActiveCountryId] = useState('')
  const [provinceSearch, setProvinceSearch] = useState('')
  const [showOnlyMissingDistricts, setShowOnlyMissingDistricts] = useState(false)

  const [regionsFor, setRegionsFor] = useState<LocationRegion[]>([])
  const [loadingRegions, setLoadingRegions] = useState(false)
  const [expandedRegionId, setExpandedRegionId] = useState<string | null>(null)

  const [districtsFor, setDistrictsFor] = useState<LocationDistrict[]>([])
  const [loadingDistricts, setLoadingDistricts] = useState(false)
  const [destCountByDistrictId, setDestCountByDistrictId] = useState<Record<string, number>>({})

  const [creatingDistricts, setCreatingDistricts] = useState<string | null>(null)
  const [creatingDestinations, setCreatingDestinations] = useState<string | null>(null)
  const [bulkDestinationsForRegion, setBulkDestinationsForRegion] = useState<string | null>(null)

  const [showAdvanced, setShowAdvanced] = useState(false)
  const [countryName, setCountryName] = useState('')
  const [creatingCities, setCreatingCities] = useState(false)

  const activeCountry = countries.find((c) => c.id === activeCountryId) ?? null

  const regionDistrictCount = useCallback((r: LocationRegion) => {
    const n = r.district_count
    return typeof n === 'number' && Number.isFinite(n) ? n : 0
  }, [])

  const loadCountries = useCallback(async () => {
    const res = await listLocationCountries()
    setCountries(res.countries)
    return res.countries
  }, [])

  const loadRegionsForCountry = useCallback(async (countryId: string) => {
    setLoadingRegions(true)
    setExpandedRegionId(null)
    setDistrictsFor([])
    try {
      const res = await listLocationRegions(countryId)
      let regions = res.regions
      if (regions.some((r) => r.district_count === undefined)) {
        regions = await Promise.all(
          regions.map(async (r) => {
            try {
              const d = await listLocationDistricts(r.id)
              return { ...r, district_count: d.districts.length }
            } catch {
              return { ...r, district_count: 0 }
            }
          }),
        )
      }
      setRegionsFor(regions)
    } catch (e) {
      setError(formatManageApiCatch(e, 'İller yüklenemedi'))
      setRegionsFor([])
    } finally {
      setLoadingRegions(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoadingInit(true)
      try {
        const list = await loadCountries()
        if (cancelled) return
        const tr =
          list.find((c) => c.iso2.toUpperCase() === 'TR') ??
          list.find((c) => c.name.toLocaleLowerCase('tr-TR').includes('türkiye')) ??
          list[0]
        if (tr) setActiveCountryId(tr.id)
      } catch (e) {
        if (!cancelled) setError(formatManageApiCatch(e, 'Yüklenemedi'))
      } finally {
        if (!cancelled) setLoadingInit(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [loadCountries])

  useEffect(() => {
    if (!activeCountryId) return
    void loadRegionsForCountry(activeCountryId)
  }, [activeCountryId, loadRegionsForCountry])

  const filteredRegions = useMemo(() => {
    let list = regionsFor
    if (showOnlyMissingDistricts) {
      list = list.filter((r) => regionDistrictCount(r) === 0)
    }
    const q = provinceSearch.trim().toLocaleLowerCase('tr-TR')
    if (!q) return list
    return list.filter(
      (r) =>
        r.name.toLocaleLowerCase('tr-TR').includes(q) ||
        r.slug.toLocaleLowerCase('tr-TR').includes(q),
    )
  }, [regionsFor, showOnlyMissingDistricts, provinceSearch, regionDistrictCount])

  const regionsWithDistricts = regionsFor.filter((r) => regionDistrictCount(r) > 0).length

  const loadDistrictsForRegion = useCallback(async (regionId: string) => {
    setExpandedRegionId(regionId)
    setLoadingDistricts(true)
    setDistrictsFor([])
    try {
      const res = await listLocationDistricts(regionId)
      setDistrictsFor(res.districts)
      const counts = await Promise.all(
        res.districts.map(async (d) => [d.id, await countDestinationsForDistrict(d.id)] as const),
      )
      setDestCountByDistrictId((prev) => ({
        ...prev,
        ...Object.fromEntries(counts),
      }))
    } catch (e) {
      setError(formatManageApiCatch(e, 'İlçeler yüklenemedi'))
    } finally {
      setLoadingDistricts(false)
    }
  }, [])

  const toggleRegion = useCallback(
    (regionId: string) => {
      if (expandedRegionId === regionId) {
        setExpandedRegionId(null)
        return
      }
      void loadDistrictsForRegion(regionId)
    },
    [expandedRegionId, loadDistrictsForRegion],
  )

  const refreshRegionInList = useCallback(async (regionId: string) => {
    if (!activeCountryId) return
    const d = await listLocationDistricts(regionId)
    setRegionsFor((prev) =>
      prev.map((r) => (r.id === regionId ? { ...r, district_count: d.districts.length } : r)),
    )
  }, [activeCountryId])

  const handleCreateDistricts = useCallback(
    async (region: LocationRegion) => {
      setCreatingDistricts(region.id)
      setError(null)
      setSuccess(null)
      try {
        const out = await generateAiDistrictsSync(token, { region_id: region.id })
        setSuccess(`${region.name}: ${out.created} ilçe eklendi, ${out.skipped} atlandı.`)
        await refreshRegionInList(region.id)
        await loadDistrictsForRegion(region.id)
      } catch (e) {
        setError(formatManageApiCatch(e, 'İlçeler oluşturulamadı'))
      } finally {
        setCreatingDistricts(null)
      }
    },
    [token, refreshRegionInList, loadDistrictsForRegion],
  )

  const handleCreateDestinations = useCallback(
    async (district: LocationDistrict, region: LocationRegion) => {
      setCreatingDestinations(district.id)
      setError(null)
      setSuccess(null)
      try {
        const out = await generateAiDestinationsSync(token, { district_id: district.id })
        const n = out.created + out.skipped
        setDestCountByDistrictId((prev) => ({
          ...prev,
          [district.id]: Math.max(n, prev[district.id] ?? 0),
        }))
        setSuccess(
          `${district.name} (${region.name}): ${out.created} belde eklendi, ${out.skipped} atlandı. Her ilçe 1–3 dk sürebilir.`,
        )
        const fresh = await countDestinationsForDistrict(district.id)
        setDestCountByDistrictId((prev) => ({ ...prev, [district.id]: fresh }))
      } catch (e) {
        setError(formatManageApiCatch(e, 'Beldeler oluşturulamadı'))
      } finally {
        setCreatingDestinations(null)
      }
    },
    [token],
  )

  const handleBulkDestinations = useCallback(
    async (region: LocationRegion) => {
      if (districtsFor.length === 0) return
      const pending = districtsFor.filter((d) => (destCountByDistrictId[d.id] ?? 0) === 0)
      if (pending.length === 0) {
        setSuccess(`${region.name}: tüm ilçelerde en az bir belde kaydı var.`)
        return
      }
      setBulkDestinationsForRegion(region.id)
      setError(null)
      let ok = 0
      for (const d of pending) {
        setSuccess(`${region.name} — ${d.name}: beldeler üretiliyor… (${ok + 1}/${pending.length})`)
        setCreatingDestinations(d.id)
        try {
          const out = await generateAiDestinationsSync(token, { district_id: d.id })
          ok += 1
          const fresh = await countDestinationsForDistrict(d.id)
          setDestCountByDistrictId((prev) => ({ ...prev, [d.id]: fresh }))
          setSuccess(
            `${d.name}: ${out.created} belde eklendi (${ok}/${pending.length} ilçe tamam).`,
          )
        } catch (e) {
          setError(formatManageApiCatch(e, `${d.name} beldeleri oluşturulamadı`))
          break
        } finally {
          setCreatingDestinations(null)
        }
      }
      setBulkDestinationsForRegion(null)
    },
    [districtsFor, destCountByDistrictId, token],
  )

  const handleCreateCities = useCallback(async () => {
    if (!countryName.trim()) return
    setCreatingCities(true)
    setError(null)
    setSuccess(null)
    try {
      const out = await generateAiProvincesSync(token, {
        country_id: activeCountryId || undefined,
        country_name: countryName.trim(),
      })
      setSuccess(`${out.created} il eklendi, ${out.skipped} atlandı.`)
      if (activeCountryId) await loadRegionsForCountry(activeCountryId)
    } catch (e) {
      setError(formatManageApiCatch(e, 'İller oluşturulamadı'))
    } finally {
      setCreatingCities(false)
    }
  }, [token, countryName, activeCountryId, loadRegionsForCountry])

  if (loadingInit) {
    return (
      <div className="flex items-center gap-2 py-16 text-neutral-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Yükleniyor…
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl pt-2">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-950/40">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              Bölge & belde oluşturucu
            </h1>
            <p className="mt-1 max-w-xl text-sm text-neutral-500">
              İlçeler seed veya AI ile yüklüyse doğrudan <strong>belde / destinasyon</strong> (Ölüdeniz,
              Kalkan…) ekleyin. DeepSeek ayarları açık olmalı.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Link href="../regions" className="rounded-lg border border-neutral-200 px-3 py-1.5 hover:bg-neutral-50 dark:border-neutral-700">
            Bölge sayfaları
          </Link>
          <Link href="../regions/countries" className="rounded-lg border border-neutral-200 px-3 py-1.5 hover:bg-neutral-50 dark:border-neutral-700">
            Ülke / il / ilçe
          </Link>
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
      {success ? (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
          {success}
        </div>
      ) : null}

      <div className="rounded-2xl border border-neutral-100 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
        <div className="border-b border-neutral-100 p-4 dark:border-neutral-800">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[160px] flex-1">
              <label className="mb-1 block text-xs font-medium text-neutral-500">Ülke</label>
              <select
                value={activeCountryId}
                onChange={(e) => setActiveCountryId(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              >
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.iso2})
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[200px] flex-[2]">
              <label className="mb-1 block text-xs font-medium text-neutral-500">İl ara</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                  type="search"
                  value={provinceSearch}
                  onChange={(e) => setProvinceSearch(e.target.value)}
                  placeholder="Muğla, Antalya…"
                  className="w-full rounded-xl border border-neutral-200 py-2 pl-9 pr-3 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                />
              </div>
            </div>
          </div>
          {activeCountry && regionsFor.length > 0 ? (
            <p className="mt-3 text-xs text-neutral-500">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{regionsWithDistricts}</span>
              /{regionsFor.length} ilde ilçe kaydı var.
              {regionsWithDistricts === regionsFor.length ? (
                <span className="text-emerald-600 dark:text-emerald-400"> İlçe adımı tamam — illeri açıp belde ekleyin.</span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400"> Eksik iller için altta «İlçeleri AI ile ekle» kullanın.</span>
              )}
            </p>
          ) : null}
          <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-neutral-500">
            <input
              type="checkbox"
              checked={showOnlyMissingDistricts}
              onChange={(e) => setShowOnlyMissingDistricts(e.target.checked)}
              className="rounded border-neutral-300"
            />
            Sadece ilçesi olmayan illeri göster
          </label>
        </div>

        <div className="max-h-[min(70vh,640px)] overflow-y-auto p-2">
          {loadingRegions ? (
            <div className="flex items-center gap-2 px-4 py-8 text-sm text-neutral-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              İller yükleniyor…
            </div>
          ) : filteredRegions.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-neutral-400">
              {regionsFor.length === 0
                ? 'Bu ülkede il yok — alttaki gelişmiş bölümden AI ile il oluşturun.'
                : 'Arama / filtre ile eşleşen il yok.'}
            </p>
          ) : (
            <ul className="space-y-1">
              {filteredRegions.map((region) => {
                const dc = regionDistrictCount(region)
                const hasDistricts = dc > 0
                const expanded = expandedRegionId === region.id
                const regionBusy =
                  creatingDistricts === region.id ||
                  bulkDestinationsForRegion === region.id

                return (
                  <li
                    key={region.id}
                    className={clsx(
                      'rounded-xl border border-transparent',
                      expanded && 'border-violet-100 bg-violet-50/30 dark:border-violet-900/40 dark:bg-violet-950/10',
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => toggleRegion(region.id)}
                        disabled={!hasDistricts && creatingDistricts === region.id}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      >
                        {hasDistricts ? (
                          <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                        ) : (
                          <MapPin className="h-4 w-4 shrink-0 text-amber-500" />
                        )}
                        <span className="font-medium text-neutral-800 dark:text-neutral-200">{region.name}</span>
                        {hasDistricts ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                            {dc} ilçe
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950/40">
                            ilçe yok
                          </span>
                        )}
                        {hasDistricts ? (
                          expanded ? (
                            <ChevronDown className="ml-auto h-4 w-4 text-neutral-400" />
                          ) : (
                            <ChevronRight className="ml-auto h-4 w-4 text-neutral-400" />
                          )
                        ) : null}
                      </button>
                      {!hasDistricts ? (
                        <button
                          type="button"
                          disabled={regionBusy}
                          onClick={() => void handleCreateDistricts(region)}
                          className="shrink-0 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
                        >
                          {creatingDistricts === region.id ? (
                            <Loader2 className="inline h-3.5 w-3.5 animate-spin" />
                          ) : (
                            'İlçeleri AI ile ekle'
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggleRegion(region.id)}
                          className="shrink-0 rounded-lg border border-violet-200 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:text-violet-300"
                        >
                          {expanded ? 'Gizle' : 'Belde ekle →'}
                        </button>
                      )}
                    </div>

                    {expanded && hasDistricts ? (
                      <div className="border-t border-violet-100 px-3 pb-3 pt-2 dark:border-violet-900/30">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[11px] text-neutral-500">
                            Her ilçe için <strong>Belde ekle</strong> — turistik semtler (Ölüdeniz, Kalkan…). İşlem ilçe
                            başına ~1–3 dk.
                          </p>
                          <button
                            type="button"
                            disabled={bulkDestinationsForRegion === region.id || loadingDistricts}
                            onClick={() => void handleBulkDestinations(region)}
                            className="shrink-0 rounded-lg bg-amber-500 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
                          >
                            {bulkDestinationsForRegion === region.id ? (
                              <Loader2 className="inline h-3 w-3 animate-spin" />
                            ) : (
                              'Eksik ilçelere toplu belde (AI)'
                            )}
                          </button>
                        </div>
                        {loadingDistricts ? (
                          <p className="py-2 text-xs text-neutral-400">
                            <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
                            İlçeler yükleniyor…
                          </p>
                        ) : (
                          <ul className="space-y-1">
                            {districtsFor.map((district) => {
                              const destN = destCountByDistrictId[district.id] ?? 0
                              const hasDest = destN > 0
                              return (
                                <li
                                  key={district.id}
                                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/80 px-2 py-1.5 dark:bg-neutral-900/60"
                                >
                                  <div className="min-w-0">
                                    <span className="text-sm text-neutral-800 dark:text-neutral-200">{district.name}</span>
                                    {hasDest ? (
                                      <span className="ml-2 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                                        {destN} belde
                                      </span>
                                    ) : (
                                      <span className="ml-2 text-[10px] text-neutral-400">belde yok</span>
                                    )}
                                  </div>
                                  <div className="flex shrink-0 items-center gap-1">
                                    {hasDest ? (
                                      <Link
                                        href={`../regions?q=${encodeURIComponent(district.slug)}`}
                                        className="inline-flex items-center gap-0.5 rounded px-2 py-1 text-[10px] text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                        Listede gör
                                      </Link>
                                    ) : null}
                                    <button
                                      type="button"
                                      disabled={creatingDestinations === district.id || bulkDestinationsForRegion === region.id}
                                      onClick={() => void handleCreateDestinations(district, region)}
                                      className={clsx(
                                        'rounded-lg px-2.5 py-1 text-[11px] font-semibold disabled:opacity-60',
                                        hasDest
                                          ? 'border border-amber-200 text-amber-800 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-200'
                                          : 'bg-amber-500 text-white hover:bg-amber-600',
                                      )}
                                    >
                                      {creatingDestinations === district.id ? (
                                        <Loader2 className="inline h-3 w-3 animate-spin" />
                                      ) : hasDest ? (
                                        'Yenile (AI)'
                                      ) : (
                                        'Belde ekle (AI)'
                                      )}
                                    </button>
                                  </div>
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      <details className="mt-6 rounded-xl border border-neutral-200 bg-neutral-50/80 dark:border-neutral-700 dark:bg-neutral-900/40">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-neutral-600 dark:text-neutral-400">
          Gelişmiş — yeni ülke veya AI ile il oluştur
        </summary>
        <div className="space-y-3 border-t border-neutral-200 px-4 py-4 dark:border-neutral-700">
          <p className="text-xs text-neutral-500">
            Türkiye için 81 il genelde seed ile yüklüdür; çoğu kullanıcıda gerekmez.
          </p>
          <input
            type="text"
            placeholder="Ülke adı (ör. Yunanistan)"
            value={countryName}
            onChange={(e) => setCountryName(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          />
          <button
            type="button"
            disabled={!countryName.trim() || creatingCities}
            onClick={() => void handleCreateCities()}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {creatingCities ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            İlleri AI ile oluştur
          </button>
        </div>
      </details>
    </div>
  )
}
