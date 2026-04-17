'use client'

import { getStoredAuthToken } from '@/lib/auth-storage'
import {
  createAiRegionTask,
  listAiRegionTasks,
  listLocationCountries,
  listLocationRegions,
  type LocationCountry,
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
  Plus,
  RefreshCw,
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

export default function AiRegionsClient() {
  const [countries, setCountries] = useState<LocationCountry[]>([])
  const [tasks, setTasks] = useState<AiTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create cities form
  const [countryName, setCountryName] = useState('')
  const [selectedCountryId, setSelectedCountryId] = useState('')
  const [creatingCities, setCreatingCities] = useState(false)

  // Create districts
  const [expandedCountry, setExpandedCountry] = useState<string | null>(null)
  const [regionsFor, setRegionsFor] = useState<LocationRegion[]>([])
  const [loadingRegions, setLoadingRegions] = useState(false)
  const [creatingDistricts, setCreatingDistricts] = useState<string | null>(null)

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
      setError(e instanceof Error ? e.message : 'Yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void loadData()
    return () => { if (pollRef.current) clearTimeout(pollRef.current) }
  }, [loadData])

  // Auto-refresh tasks every 5s if any are running
  useEffect(() => {
    const hasRunning = tasks.some((t) => {
      const s = String(t.step ?? t.status ?? '')
      return s === 'running' || s === 'processing' || s === 'pending'
    })
    if (hasRunning) {
      pollRef.current = setTimeout(() => void loadData(), 5000)
    }
    return () => { if (pollRef.current) clearTimeout(pollRef.current) }
  }, [tasks, loadData])

  const handleCreateCities = useCallback(async () => {
    if (!countryName.trim()) return
    setCreatingCities(true)
    setError(null)
    try {
      await createAiRegionTask(token, {
        country_id: selectedCountryId || undefined,
        country_name: countryName.trim(),
        step: 'provinces',
      })
      setCountryName('')
      setSelectedCountryId('')
      await loadData()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Görev oluşturulamadı')
    } finally {
      setCreatingCities(false)
    }
  }, [token, countryName, selectedCountryId, loadData])

  const handleExpandCountry = useCallback(async (countryId: string) => {
    if (expandedCountry === countryId) {
      setExpandedCountry(null)
      return
    }
    setExpandedCountry(countryId)
    setLoadingRegions(true)
    try {
      const res = await listLocationRegions(countryId)
      setRegionsFor(res.regions)
    } finally {
      setLoadingRegions(false)
    }
  }, [expandedCountry])

  const handleCreateDistricts = useCallback(async (region: LocationRegion) => {
    setCreatingDistricts(region.id)
    setError(null)
    try {
      await createAiRegionTask(token, {
        country_name: countries.find((c) => c.id === region.country_id)?.name ?? '',
        step: 'districts',
        parent_region_id: region.id,
      })
      await loadData()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Görev oluşturulamadı')
    } finally {
      setCreatingDistricts(null)
    }
  }, [token, countries, loadData])

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
            Ülke adı girin — yapay zeka otomatik olarak iller ve ilçeleri koordinatlarıyla oluşturur.
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── İl/Bölge Oluşturma Kartı ── */}
        <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          <div className="mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-violet-500" />
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              Adım 1 — İller oluştur
            </h2>
          </div>
          <p className="mb-4 text-sm text-neutral-500">
            Ülke adını yazın. Yapay zeka o ülkenin tüm il/bölgelerini (merkez koordinatlarıyla birlikte) oluşturacak.
          </p>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">
                Ülke adı <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="ör. Türkiye"
                value={countryName}
                onChange={(e) => setCountryName(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">
                Mevcut ülkeye bağla (isteğe bağlı)
              </label>
              <select
                value={selectedCountryId}
                onChange={(e) => setSelectedCountryId(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              >
                <option value="">Yeni oluştur</option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.iso2})</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              disabled={!countryName.trim() || creatingCities}
              onClick={() => void handleCreateCities()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
            >
              {creatingCities
                ? <><Loader2 className="h-4 w-4 animate-spin" />Gönderiliyor…</>
                : <><Sparkles className="h-4 w-4" />İlleri oluştur</>}
            </button>
          </div>
        </div>

        {/* ── İlçe Oluşturma Kartı ── */}
        <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          <div className="mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-violet-500" />
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              Adım 2 — İlçeler oluştur
            </h2>
          </div>
          <p className="mb-4 text-sm text-neutral-500">
            Bir ülke seçin, ardından her ilin yanındaki butonla ilçelerini oluşturun.
          </p>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-neutral-400">
              <Loader2 className="h-4 w-4 animate-spin" />Yükleniyor…
            </div>
          ) : (
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {countries.map((c) => (
                <div key={c.id}>
                  <button
                    type="button"
                    onClick={() => void handleExpandCountry(c.id)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  >
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">{c.name}</span>
                    {expandedCountry === c.id
                      ? <ChevronDown className="h-4 w-4 text-neutral-400" />
                      : <ChevronRight className="h-4 w-4 text-neutral-400" />}
                  </button>
                  {expandedCountry === c.id ? (
                    <div className="ml-4 border-l border-neutral-100 pl-3 dark:border-neutral-800">
                      {loadingRegions ? (
                        <p className="py-2 text-xs text-neutral-400"><Loader2 className="inline h-3 w-3 animate-spin" /> Yükleniyor…</p>
                      ) : regionsFor.length === 0 ? (
                        <p className="py-2 text-xs text-neutral-400">İl bulunamadı. Önce Adım 1 ile oluşturun.</p>
                      ) : (
                        regionsFor.map((r) => (
                          <div key={r.id} className="flex items-center justify-between py-1">
                            <span className="text-xs text-neutral-600 dark:text-neutral-400">{r.name}</span>
                            <button
                              type="button"
                              disabled={creatingDistricts === r.id}
                              onClick={() => void handleCreateDistricts(r)}
                              className="flex items-center gap-1 rounded-lg bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50 dark:bg-violet-950/30 dark:text-violet-300"
                            >
                              {creatingDistricts === r.id
                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                : <Plus className="h-3 w-3" />}
                              İlçeler
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  ) : null}
                </div>
              ))}
              {countries.length === 0 && (
                <p className="text-sm text-neutral-400">Henüz ülke yok. Önce Ülkeler sayfasından ekleyin.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Görev Geçmişi ── */}
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            AI Görev Geçmişi
          </h2>
          <button
            type="button"
            onClick={() => void loadData()}
            className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400"
          >
            <RefreshCw className={clsx('h-3.5 w-3.5', loading && 'animate-spin')} />
            Yenile
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
              <Bot className="mb-2 h-8 w-8 opacity-40" />
              <p className="text-sm">Henüz görev yok.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-50 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:border-neutral-800 dark:bg-neutral-800/50">
                  <th className="py-3 pl-5 text-left">Ülke</th>
                  <th className="py-3 text-left">Adım</th>
                  <th className="py-3 text-left">Durum</th>
                  <th className="py-3 pr-5 text-right">Oluşturulma</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800">
                {tasks.map((t, idx) => (
                  <tr key={String(t.id ?? idx)} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                    <td className="py-3 pl-5 font-medium text-neutral-800 dark:text-neutral-200">
                      {String(t.country_name ?? '—')}
                    </td>
                    <td className="py-3 text-xs text-neutral-500">
                      {String(t.step ?? '—') === 'generate_regions' ? (
                        <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />İller</span>
                      ) : (
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />İlçeler</span>
                      )}
                    </td>
                    <td className="py-3">
                      {statusBadge(t.step)}
                    </td>
                    <td className="py-3 pr-5 text-right text-xs text-neutral-400">
                      {t.created_at ? new Date(String(t.created_at)).toLocaleString('tr-TR') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-xl bg-violet-50 p-4 text-sm text-violet-700 dark:bg-violet-950/20 dark:text-violet-300">
          <Check className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Görev tamamlandığında oluşturulan il/ilçeler otomatik olarak sisteme kaydedilir.
            <a href="../regions/countries" className="ml-1 underline">Ülkeler & İlçeler</a> sayfasında görüntüleyebilirsiniz.
          </p>
        </div>
      </div>
    </div>
  )
}
