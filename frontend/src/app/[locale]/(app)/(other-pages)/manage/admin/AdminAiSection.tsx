'use client'

import {
  getAiJob,
  getDistrictIdeasStats,
  getNextEmptyDistrict,
  listAiFeatureProfiles,
  listAiJobs,
  listAiProviders,
  processNextDistrictIdea,
  queueAllDistrictIdeas,
  saveDistrictPlaces,
  type DistrictIdeasStats,
} from '@/lib/travel-api'
import { getStoredAuthToken } from '@/lib/auth-storage'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import clsx from 'clsx'
import { Activity, Bot, Cpu, Info, Layers, MapPin, RefreshCw, Search } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'

type AiJobListItem = {
  id: string
  profile_code: string
  input_json: string
  output_json: string | null
  status: string
  error: string | null
  created_at: string
}

function jobStatusBadge(status: string) {
  const s = status.toLowerCase()
  if (s === 'done' || s === 'completed' || s === 'success')
    return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
  if (s === 'failed' || s === 'error')
    return 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300'
  if (s === 'queued' || s === 'running' || s === 'pending')
    return 'bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200'
  return 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
}

export default function AdminAiSection() {
  const [providers, setProviders] = useState<{ code: string; display_name: string; is_active: boolean }[]>([])
  const [profiles, setProfiles] = useState<{ code: string; provider_id: string }[]>([])
  const [jobs, setJobs] = useState<AiJobListItem[]>([])
  const [jobDetail, setJobDetail] = useState<string | null>(null)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const [jobStatusFilter, setJobStatusFilter] = useState('')
  const [jobIdLookup, setJobIdLookup] = useState('')

  // İlçe gezi fikirleri — DeepSeek AI toplu üretimi
  const [districtStats, setDistrictStats] = useState<DistrictIdeasStats | null>(null)
  const [districtRunning, setDistrictRunning] = useState(false)
  const [districtLog, setDistrictLog] = useState<string[]>([])
  const [districtErr, setDistrictErr] = useState<string | null>(null)
  const districtStopRef = useRef(false)

  // İlçe gezi fikirleri — Google Maps Places çekme
  const [mapsRunning, setMapsRunning] = useState(false)
  const [mapsLog, setMapsLog] = useState<string[]>([])
  const [mapsErr, setMapsErr] = useState<string | null>(null)
  const [mapsApiKey, setMapsApiKey] = useState('')
  const mapsStopRef = useRef(false)

  const refresh = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) return
    setLoadErr(null)
    setRefreshing(true)
    try {
      const [p, f, j] = await Promise.all([
        listAiProviders(token),
        listAiFeatureProfiles(token),
        listAiJobs(token, jobStatusFilter.trim() || undefined),
      ])
      setProviders(p.providers.map((x) => ({ code: x.code, display_name: x.display_name, is_active: x.is_active })))
      setProfiles(f.profiles.map((x) => ({ code: x.code, provider_id: x.provider_id })))
      setJobs(j.jobs)
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'ai_load_failed')
    } finally {
      setRefreshing(false)
    }
  }, [jobStatusFilter])

  useEffect(() => {
    void refresh()
    void loadDistrictStats()
  }, [refresh])

  async function loadDistrictStats() {
    const token = getStoredAuthToken()
    if (!token) return
    try {
      const s = await getDistrictIdeasStats(token)
      setDistrictStats(s)
    } catch {
      // sessizce geç
    }
  }

  async function onQueueAll() {
    const token = getStoredAuthToken()
    if (!token) return
    setDistrictErr(null)
    setDistrictLog([])
    try {
      const r = await queueAllDistrictIdeas(token)
      setDistrictLog((l) => [...l, `${r.queued} ilçe kuyruğa alındı (toplam bulundu: ${r.total_found})`])
      await loadDistrictStats()
    } catch (e) {
      setDistrictErr(e instanceof Error ? e.message : 'queue_failed')
    }
  }

  async function onStartProcessing() {
    const token = getStoredAuthToken()
    if (!token) return
    districtStopRef.current = false
    setDistrictRunning(true)
    setDistrictErr(null)
    let processed = 0
    try {
      while (!districtStopRef.current) {
        const r = await processNextDistrictIdea(token)
        if (r.done) {
          setDistrictLog((l) => [...l, 'Kuyruk tamamlandı.'])
          break
        }
        if (r.skipped) {
          setDistrictLog((l) => [...l, `Atlandı (provider pasif?): ${r.job_id ?? ''}`])
          continue
        }
        processed++
        setDistrictLog((l) => [
          ...l,
          `#${processed} – ${r.ideas_stored ? '✓' : '⚠'} ${r.location_page_id?.slice(0, 8)}…`,
        ])
        if (processed % 10 === 0) await loadDistrictStats()
        // API'yi bunaltmamak için kısa bekleme
        await new Promise((res) => setTimeout(res, 800))
      }
    } catch (e) {
      setDistrictErr(e instanceof Error ? e.message : 'process_failed')
    } finally {
      setDistrictRunning(false)
      await loadDistrictStats()
    }
  }

  async function onStartMapsProcessing() {
    const token = getStoredAuthToken()
    if (!token) return
    const key = mapsApiKey.trim()
    if (!key) {
      setMapsErr('Google Maps API anahtarı gerekli.')
      return
    }
    mapsStopRef.current = false
    setMapsRunning(true)
    setMapsErr(null)
    let processed = 0
    try {
      while (!mapsStopRef.current) {
        // 1. Sıradaki içeriksiz ilçeyi al
        const next = await getNextEmptyDistrict(token)
        if (next.done) {
          setMapsLog((l) => [...l, 'Tüm ilçeler tamamlandı.'])
          break
        }
        const { location_page_id, district_name, region_name, center_lat, center_lng } = next
        if (!location_page_id || !district_name) continue

        // İlçe koordinatı varsa kullan; yoksa Türkiye merkezi ile text search
        const hasCoords = !!center_lat && !!center_lng && center_lat !== '' && center_lng !== ''
        const lat = hasCoords ? parseFloat(center_lat!) : 39.0
        const lng = hasCoords ? parseFloat(center_lng!) : 35.0
        // Koordinat varsa Nearby Search (dar radius), yoksa Text Search (geniş + sorgu adı)
        const query = `${district_name} ${region_name ?? ''} gezilecek yer tourist attraction`
        const radiusM = hasCoords ? 30_000 : 80_000

        type PlaceRow = {
          name: string
          address: string
          types: string[]
          rating?: number
          placeId: string
          photoRef?: string
          lat: number
          lng: number
          distanceKm: number
        }
        let ideas: Array<{
          id: number; title: string; summary: string
          image?: string; link?: string
          lat: number; lng: number; place_id: string
          distance_km_from_district: number
        }> = []
        try {
          const placesRes = await fetch('/api/places-nearby', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lat,
              lng,
              googleType: hasCoords ? 'tourist_attraction' : query,
              radiusM,
              maxCount: 5,
              language: 'tr',
              apiKey: key,
            }),
          })
          if (placesRes.ok) {
            const pd = await placesRes.json() as { places: PlaceRow[] }
            ideas = (pd.places ?? []).map((p, i) => ({
              id: i + 1,
              title: p.name,
              summary: [
                p.address,
                p.rating ? `Puan: ${p.rating}/5` : '',
                (p.types ?? [])
                  .filter((t) => !['point_of_interest', 'establishment'].includes(t))
                  .slice(0, 2)
                  .map((t) => t.replace(/_/g, ' '))
                  .join(', '),
              ]
                .filter(Boolean)
                .join(' — '),
              image: p.photoRef
                ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${p.photoRef}&key=${key}`
                : undefined,
              link: `https://www.google.com/maps/place/?q=place_id:${p.placeId}`,
              lat: p.lat,
              lng: p.lng,
              place_id: p.placeId,
              distance_km_from_district: Math.round(p.distanceKm * 10) / 10,
            }))
          }
        } catch {
          setMapsLog((l) => [...l, `⚠ Maps hatası: ${district_name}, atlandı`])
          continue
        }

        // 3. Kaydet (boş bile olsa '[]' kaydedilmez; en az 1 yer varsa kaydet)
        if (ideas.length > 0) {
          await saveDistrictPlaces(token, location_page_id, JSON.stringify(ideas))
          processed++
          setMapsLog((l) => [...l, `#${processed} ✓ ${district_name} (${region_name}) — ${ideas.length} yer`])
        } else {
          // İçerik bulunamadı: sonsuz döngüye girmemek için '[]' yerine placeholder kaydet
          await saveDistrictPlaces(
            token,
            location_page_id,
            JSON.stringify([{ id: 1, title: district_name, summary: `${region_name} iline bağlı ${district_name} ilçesi.` }]),
          )
          setMapsLog((l) => [...l, `#${processed + 1} ~ ${district_name} — Maps sonucu yok, yer tutucu eklendi`])
          processed++
        }

        if (processed % 20 === 0) await loadDistrictStats()
        await new Promise((res) => setTimeout(res, 500))
      }
    } catch (e) {
      setMapsErr(e instanceof Error ? e.message : 'maps_process_failed')
    } finally {
      setMapsRunning(false)
      await loadDistrictStats()
    }
  }

  async function onLookupJob(e: FormEvent) {
    e.preventDefault()
    const token = getStoredAuthToken()
    if (!token || !jobIdLookup.trim()) return
    setBusy(true)
    setLoadErr(null)
    try {
      const r = await getAiJob(token, jobIdLookup.trim())
      setJobDetail(JSON.stringify(r, null, 2))
    } catch (err) {
      setJobDetail(null)
      setLoadErr(err instanceof Error ? err.message : 'ai_job_lookup_failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div id="admin-ai-block" className="space-y-8">
      <header className="rounded-2xl border border-neutral-200 bg-gradient-to-br from-white to-violet-50/50 p-6 dark:border-neutral-800 dark:from-neutral-900/80 dark:to-violet-950/20">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
            <Bot className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">Yapay zeka — izleme</h1>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              <strong>Sağlayıcı</strong> (ör. DeepSeek) ve <strong>özellik profilleri</strong> (sohbet, içerik yazımı vb.) salt okunur
              listelenir. <strong>Son işler</strong> kuyruktaki AI görevlerini gösterir; ayrıntı için tam iş UUID&apos;sini alttan
              sorgulayabilirsiniz.
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-neutral-500 dark:text-neutral-400">
              <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 dark:bg-neutral-800">
                <Info className="h-3.5 w-3.5" />
                Yetki: <code className="font-mono text-[11px]">admin.users.read</code>
              </span>
            </div>
          </div>
        </div>
      </header>

      {loadErr ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300" role="alert">
          {loadErr}
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900/40">
        <Field>
          <Label>İş durumu filtresi</Label>
          <Input
            className="mt-1 w-52 font-mono text-sm"
            placeholder="Boş = tümü; örn. queued"
            value={jobStatusFilter}
            onChange={(e) => setJobStatusFilter(e.target.value)}
          />
        </Field>
        <button
          type="button"
          disabled={busy || refreshing}
          onClick={() => void refresh()}
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-800 shadow-sm transition hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          <RefreshCw className={clsx('h-4 w-4', refreshing && 'animate-spin')} />
          Yenile
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <AiPanel
          icon={<Cpu className="h-5 w-5" />}
          title="Sağlayıcılar"
          subtitle="Hangi model sağlayıcısının kayıtlı ve aktif olduğu."
          empty={providers.length === 0}
          emptyText="Sağlayıcı bulunamadı."
        >
          <ul className="max-h-52 space-y-2 overflow-y-auto pr-1">
            {providers.map((p) => (
              <li
                key={p.code}
                className="rounded-lg border border-neutral-100 px-3 py-2 text-sm dark:border-neutral-800"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-neutral-900 dark:text-white">{p.code}</span>
                  <span
                    className={clsx(
                      'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
                      p.is_active
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                        : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300',
                    )}
                  >
                    {p.is_active ? 'Aktif' : 'Pasif'}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-neutral-500" title={p.display_name}>
                  {p.display_name}
                </p>
              </li>
            ))}
          </ul>
        </AiPanel>

        <AiPanel
          icon={<Layers className="h-5 w-5" />}
          title="Özellik profilleri"
          subtitle="Her özellik hangi sağlayıcıya bağlı (içerik, sohbet, arama…)."
          empty={profiles.length === 0}
          emptyText="Profil tanımı yok."
        >
          <ul className="max-h-52 space-y-1.5 overflow-y-auto font-mono text-[11px] text-neutral-600 dark:text-neutral-400">
            {profiles.map((p) => (
              <li key={p.code} className="rounded-md bg-neutral-50 px-2 py-1.5 dark:bg-neutral-950/50">
                <span className="font-semibold text-primary-700 dark:text-primary-400">{p.code}</span>
                <span className="text-neutral-400"> · provider </span>
                {p.provider_id.slice(0, 8)}…
              </li>
            ))}
          </ul>
        </AiPanel>

        <AiPanel
          icon={<Activity className="h-5 w-5" />}
          title="Son işler"
          subtitle="Son üretilen AI işleri; detay için UUID ile sorgu yapın."
          empty={jobs.length === 0}
          emptyText="Bu filtreye uyan iş yok veya henüz kayıt yok."
        >
          <ul className="max-h-52 space-y-1.5 overflow-y-auto">
            {jobs.map((j) => (
              <li
                key={j.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-neutral-100 px-2 py-1.5 text-[10px] dark:border-neutral-800"
              >
                <span className={clsx('rounded-md px-1.5 py-0.5 font-medium', jobStatusBadge(j.status))}>{j.status}</span>
                <span className="font-mono text-neutral-600 dark:text-neutral-400">{j.profile_code}</span>
                <span className="font-mono text-neutral-400" title={j.id}>
                  {j.id.slice(0, 8)}…
                </span>
              </li>
            ))}
          </ul>
        </AiPanel>
      </div>

      {/* İlçe Gezi Fikirleri — toplu AI üretimi */}
      <div className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm dark:border-emerald-900 dark:bg-neutral-900/40">
        <div className="mb-4 flex flex-wrap items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
            <MapPin className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">İlçe Gezi Fikirleri — Toplu AI Üretimi</h2>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Tüm ilçelere DeepSeek ile otomatik &ldquo;gezilesi yerler&rdquo; içeriği üretir. Önce kuyruğa al, sonra işlemi başlat.
            </p>
          </div>
        </div>

        {districtStats ? (
          <div className="mb-4 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full bg-neutral-100 px-3 py-1 dark:bg-neutral-800">
              Toplam ilçe: <strong>{districtStats.total_districts}</strong>
            </span>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              İçerik var: <strong>{districtStats.districts_with_content}</strong>
            </span>
            {Object.entries(districtStats.jobs).map(([status, cnt]) => (
              <span key={status} className={clsx('rounded-full px-3 py-1', jobStatusBadge(status))}>
                {status}: <strong>{cnt}</strong>
              </span>
            ))}
          </div>
        ) : null}

        {districtErr ? (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {districtErr}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <ButtonPrimary
            type="button"
            disabled={districtRunning}
            onClick={() => void onQueueAll()}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            1. Kuyruğa Al
          </ButtonPrimary>
          {!districtRunning ? (
            <ButtonPrimary
              type="button"
              onClick={() => void onStartProcessing()}
            >
              2. İşlemi Başlat
            </ButtonPrimary>
          ) : (
            <button
              type="button"
              onClick={() => { districtStopRef.current = true }}
              className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300"
            >
              Durdur
            </button>
          )}
          <button
            type="button"
            onClick={() => void loadDistrictStats()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
          >
            <RefreshCw className="h-4 w-4" />
            İstatistik Yenile
          </button>
        </div>

        {districtLog.length > 0 ? (
          <div className="mt-4 max-h-48 overflow-y-auto rounded-xl border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-950/40">
            <ul className="space-y-0.5 font-mono text-[11px] text-neutral-600 dark:text-neutral-400">
              {districtLog.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {/* Google Maps Places — ilçe mekan çekme */}
      <div className="rounded-2xl border border-blue-200 bg-white p-6 shadow-sm dark:border-blue-900 dark:bg-neutral-900/40">
        <div className="mb-4 flex flex-wrap items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
            <MapPin className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Google Maps Places — İlçe Mekan Çekme</h2>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Google Places API ile her ilçe için gerçek turistik mekan verisi çeker. API anahtarınızı girin ve başlatın.
              İçeriği olmayan ilçeleri sırayla işler.
            </p>
          </div>
        </div>

        {mapsErr ? (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {mapsErr}
          </div>
        ) : null}

        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[260px] flex-1">
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Google Maps API Anahtarı
            </label>
            <input
              type="password"
              value={mapsApiKey}
              onChange={(e) => setMapsApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 font-mono text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
              disabled={mapsRunning}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {!mapsRunning ? (
            <ButtonPrimary
              type="button"
              onClick={() => void onStartMapsProcessing()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Google Maps&apos;ten Çek
            </ButtonPrimary>
          ) : (
            <button
              type="button"
              onClick={() => { mapsStopRef.current = true }}
              className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300"
            >
              Durdur
            </button>
          )}
          {mapsRunning ? (
            <span className="inline-flex items-center gap-2 text-sm text-neutral-500">
              <RefreshCw className="h-4 w-4 animate-spin" />
              İşleniyor…
            </span>
          ) : null}
        </div>

        {mapsLog.length > 0 ? (
          <div className="mt-4 max-h-48 overflow-y-auto rounded-xl border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-950/40">
            <ul className="space-y-0.5 font-mono text-[11px] text-neutral-600 dark:text-neutral-400">
              {mapsLog.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/40">
        <h2 className="flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-white">
          <Search className="h-4 w-4 text-neutral-500" />
          İş detayı (UUID)
        </h2>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Tek bir AI iş kaydının tam JSON çıktısını görmek için yukarıdaki listeden kopyalayın veya loglardan yapıştırın.
        </p>
        <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={(e) => void onLookupJob(e)}>
          <Field className="min-w-[min(100%,280px)] flex-1">
            <Label>İş UUID</Label>
            <Input
              className="mt-1 font-mono text-sm"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={jobIdLookup}
              onChange={(e) => setJobIdLookup(e.target.value)}
            />
          </Field>
          <ButtonPrimary type="submit" disabled={busy}>
            {busy ? '…' : 'Getir'}
          </ButtonPrimary>
        </form>
        {jobDetail != null ? (
          <pre className="mt-4 max-h-72 overflow-auto rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-xs leading-relaxed dark:border-neutral-700 dark:bg-neutral-950">
            {jobDetail}
          </pre>
        ) : null}
      </div>
    </div>
  )
}

function AiPanel({
  icon,
  title,
  subtitle,
  empty,
  emptyText,
  children,
}: {
  icon: ReactNode
  title: string
  subtitle: string
  empty: boolean
  emptyText: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/40">
      <div className="mb-3 flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-200">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">{title}</h3>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</p>
        </div>
      </div>
      {empty ? (
        <p className="rounded-lg border border-dashed border-neutral-200 px-3 py-6 text-center text-xs text-neutral-400 dark:border-neutral-700">
          {emptyText}
        </p>
      ) : (
        children
      )}
    </section>
  )
}
