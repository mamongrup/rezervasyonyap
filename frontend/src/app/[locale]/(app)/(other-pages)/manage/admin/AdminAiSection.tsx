'use client'

import {
  getAiJob,
  getAgentOverview,
  getCoverStats,
  getDistrictIdeasStats,
  getNextEmptyDistrict,
  getNextNoCoverDistrict,
  getNotFoundCovers,
  getRegionContentStats,
  listAiFeatureProfiles,
  listAiJobs,
  listAiProviders,
  listAgentRecommendations,
  patchAgentRecommendation,
  processNextRegionContent,
  processNextDistrictIdea,
  queueAllDistrictIdeas,
  queueAllRegionContent,
  resetNotFoundCovers,
  runAgentSupervisor,
  saveDistrictCover,
  saveDistrictPlaces,
  searchPexelsImage,
  type AgentOverview,
  type AgentRecommendation,
  type CoverStats,
  type DistrictIdeasStats,
  type NotFoundCoverItem,
  type RegionContentStats,
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

  // DeepSeek Agent Merkezi — supervisor + öneri onayı
  const [agentOverview, setAgentOverview] = useState<AgentOverview | null>(null)
  const [agentRecommendations, setAgentRecommendations] = useState<AgentRecommendation[]>([])
  const [agentRunning, setAgentRunning] = useState(false)
  const [agentErr, setAgentErr] = useState<string | null>(null)
  const [agentLog, setAgentLog] = useState<string[]>([])

  // İlçe gezi fikirleri — DeepSeek AI toplu üretimi
  const [districtStats, setDistrictStats] = useState<DistrictIdeasStats | null>(null)
  const [districtRunning, setDistrictRunning] = useState(false)
  const [districtLog, setDistrictLog] = useState<string[]>([])
  const [districtErr, setDistrictErr] = useState<string | null>(null)
  const districtStopRef = useRef(false)

  // Bölge tanıtım yazısı + bölge blog yazıları
  const [regionContentStats, setRegionContentStats] = useState<RegionContentStats | null>(null)
  const [regionContentRunning, setRegionContentRunning] = useState(false)
  const [regionContentLog, setRegionContentLog] = useState<string[]>([])
  const [regionContentErr, setRegionContentErr] = useState<string | null>(null)
  const [postsPerRegion, setPostsPerRegion] = useState(1)
  const regionContentStopRef = useRef(false)

  // İlçe gezi fikirleri — Google Maps Places çekme
  const [mapsRunning, setMapsRunning] = useState(false)
  const [mapsLog, setMapsLog] = useState<string[]>([])
  const [mapsErr, setMapsErr] = useState<string | null>(null)
  const [mapsApiKey, setMapsApiKey] = useState<string>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('admin_maps_api_key') ?? ''
    return ''
  })
  const mapsStopRef = useRef(false)

  // Pexels kapak + fikir resimleri
  const [pexelsRunning, setPexelsRunning] = useState(false)
  const [pexelsLog, setPexelsLog] = useState<string[]>([])
  const [pexelsErr, setPexelsErr] = useState<string | null>(null)
  const [pexelsApiKeys, setPexelsApiKeys] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('admin_pexels_api_keys')
        if (stored) return JSON.parse(stored) as string[]
      } catch { /* ignore */ }
    }
    return ['', '', '', '', '']
  })
  const pexelsStopRef = useRef(false)
  const pexelsKeyIndexRef = useRef(0)
  const [coverStats, setCoverStats] = useState<CoverStats | null>(null)
  const [notFoundCovers, setNotFoundCovers] = useState<NotFoundCoverItem[] | null>(null)
  const [notFoundExpanded, setNotFoundExpanded] = useState(false)

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
    void loadAgentCenter()
    void loadDistrictStats()
    void loadRegionContentStats()
  }, [refresh])

  async function loadAgentCenter() {
    const token = getStoredAuthToken()
    if (!token) return
    try {
      const [overview, recs] = await Promise.all([
        getAgentOverview(token),
        listAgentRecommendations(token),
      ])
      setAgentOverview(overview)
      setAgentRecommendations(recs.recommendations)
    } catch (e) {
      setAgentErr(e instanceof Error ? e.message : 'agent_center_load_failed')
    }
  }

  async function onRunSupervisorAgent() {
    const token = getStoredAuthToken()
    if (!token) return
    setAgentRunning(true)
    setAgentErr(null)
    setAgentLog([])
    try {
      const r = await runAgentSupervisor(token)
      setAgentLog((l) => [
        ...l,
        `Supervisor çalıştı: ${r.scanned} özel gün tarandı, ${r.created} öneri oluşturuldu, ${r.failed} hata.`,
      ])
      await loadAgentCenter()
      await refresh()
    } catch (e) {
      setAgentErr(e instanceof Error ? e.message : 'agent_supervisor_failed')
    } finally {
      setAgentRunning(false)
    }
  }

  async function onRejectAgentRecommendation(id: string) {
    const token = getStoredAuthToken()
    if (!token) return
    try {
      await patchAgentRecommendation(token, id, 'rejected', 'Admin tarafından reddedildi.')
      await loadAgentCenter()
    } catch (e) {
      setAgentErr(e instanceof Error ? e.message : 'agent_recommendation_reject_failed')
    }
  }

  async function onApproveAgentRecommendation(rec: AgentRecommendation) {
    const token = getStoredAuthToken()
    if (!token) return
    setAgentErr(null)
    try {
      await patchAgentRecommendation(token, rec.id, 'approved', 'Admin ön onayı verildi.')
      setAgentLog((l) => [...l, `${rec.title} onaylandı; canlıya almak için “Popup’a Uygula” kullanın.`])
      await loadAgentCenter()
    } catch (e) {
      setAgentErr(e instanceof Error ? e.message : 'agent_recommendation_approve_failed')
    }
  }

  async function onApplyPopupRecommendation(rec: AgentRecommendation) {
    const token = getStoredAuthToken()
    if (!token) return
    setAgentErr(null)
    try {
      const parsed = JSON.parse(rec.payload_json) as { popup?: unknown }
      if (!parsed.popup || typeof parsed.popup !== 'object') {
        throw new Error('agent_payload_popup_missing')
      }

      const result = await patchAgentRecommendation(token, rec.id, 'applied', 'Admin onayıyla site_popups kaydına uygulandı.')
      setAgentLog((l) => [...l, `${rec.title} canlı popup kayıtlarına uygulandı${result.popup_id ? ` (#${result.popup_id.slice(0, 8)})` : ''}.`])
      await loadAgentCenter()
    } catch (e) {
      setAgentErr(e instanceof Error ? e.message : 'agent_popup_apply_failed')
    }
  }

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

  async function loadRegionContentStats() {
    const token = getStoredAuthToken()
    if (!token) return
    try {
      const s = await getRegionContentStats(token)
      setRegionContentStats(s)
    } catch {
      // sessizce geç
    }
  }

  async function onQueueAllRegionContent() {
    const token = getStoredAuthToken()
    if (!token) return
    setRegionContentErr(null)
    setRegionContentLog([])
    try {
      const r = await queueAllRegionContent(token, postsPerRegion)
      setRegionContentLog((l) => [
        ...l,
        `${r.queued} bölge kuyruğa alındı (${r.posts_per_region} blog/bölge).`,
      ])
      await loadRegionContentStats()
    } catch (e) {
      setRegionContentErr(e instanceof Error ? e.message : 'region_content_queue_failed')
    }
  }

  async function onStartRegionContentProcessing() {
    const token = getStoredAuthToken()
    if (!token) return
    regionContentStopRef.current = false
    setRegionContentRunning(true)
    setRegionContentErr(null)
    let processed = 0
    try {
      while (!regionContentStopRef.current) {
        const r = await processNextRegionContent(token)
        if (r.done) {
          setRegionContentLog((l) => [...l, 'Bölge içerik kuyruğu tamamlandı.'])
          break
        }
        processed++
        setRegionContentLog((l) => [
          ...l,
          `#${processed} ✓ ${r.name ?? r.slug_path ?? r.location_page_id?.slice(0, 8)} · blog: ${r.blog_posts_created ?? 0}`,
        ])
        if (processed % 5 === 0) await loadRegionContentStats()
        await new Promise((res) => setTimeout(res, 900))
      }
    } catch (e) {
      setRegionContentErr(e instanceof Error ? e.message : 'region_content_process_failed')
    } finally {
      setRegionContentRunning(false)
      await loadRegionContentStats()
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
        // Popüler turistik mekan araması: ören yeri, tarihi yer, doğa vb.
        // Koordinat varsa Nearby Search; yoksa ilçe + bölge adıyla Text Search
        const query = hasCoords
          ? 'tourist_attraction'
          : `${district_name} ${region_name ?? ''} en popüler turistik yer görülecek gezilecek`
        const radiusM = hasCoords ? 25_000 : 60_000

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
              googleType: query,
              radiusM,
              maxCount: 10,
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

  async function onStartPexelsProcessing() {
    const token = getStoredAuthToken()
    if (!token) return
    const activeKeys = pexelsApiKeys.map((k) => k.trim()).filter(Boolean)
    if (activeKeys.length === 0) {
      setPexelsErr('En az bir Pexels API anahtarı gerekli.')
      return
    }
    setPexelsRunning(true)
    setPexelsErr(null)
    setPexelsLog([])
    pexelsStopRef.current = false
    pexelsKeyIndexRef.current = 0
    // Her istekte sıradaki key'i kullan (round-robin)
    const nextKey = () => {
      const k = activeKeys[pexelsKeyIndexRef.current % activeKeys.length]
      pexelsKeyIndexRef.current++
      return k
    }
    try {
      let done = 0
      while (!pexelsStopRef.current) {
        const next = await getNextNoCoverDistrict(token)
        if (next.done) {
          setPexelsLog((l) => [...l, 'Tüm lokasyon kapak resimleri tamamlandı.'])
          break
        }
        const { location_page_id, location_name, parent_name, region_type } = next
        // Arama sorgusunu lokasyon tipine göre oluştur (3 kademeli fallback)
        const queries =
          region_type === 'country'
            ? [`${location_name} landscape travel`, `${location_name} nature`, 'Turkey landscape']
            : region_type === 'province'
              ? [
                  `${location_name} Turkey`,
                  `${location_name} city Turkey`,
                  `${location_name} travel Turkey`,
                  `${location_name} landscape`,
                  'Turkey landscape',
                ]
              : [
                  `${location_name} ${parent_name} Turkey`,
                  `${parent_name} Turkey`,
                  `${location_name} Turkey`,
                  'Turkey nature landscape',
                ]
        let coverUrl = ''
        try {
          for (const q of queries) {
            const photos = await searchPexelsImage(q, nextKey(), 1)
            if (photos.length > 0) {
              coverUrl = photos[0]?.src.large ?? ''
              break
            }
          }
        } catch {
          coverUrl = ''
        }
        if (coverUrl) {
          await saveDistrictCover(token, location_page_id, coverUrl)
          done++
          const keyNum = (pexelsKeyIndexRef.current % activeKeys.length) + 1
          setPexelsLog((l) => [...l, `✓ [${done}] ${location_name} (${region_type}) [key ${keyNum}/${activeKeys.length}]`])
        } else {
          await saveDistrictCover(token, location_page_id, 'not_found')
          setPexelsLog((l) => [...l, `– ${location_name}: resim bulunamadı, atlandı`])
        }
        await new Promise((r) => setTimeout(r, 350))
      }
    } catch (e) {
      setPexelsErr(e instanceof Error ? e.message : 'pexels_process_failed')
    } finally {
      setPexelsRunning(false)
      // İstatistikleri ve bulunamayanları yükle
      try {
        const [stats, nf] = await Promise.all([getCoverStats(token), getNotFoundCovers(token)])
        setCoverStats(stats)
        setNotFoundCovers(nf)
      } catch { /* sessizce geç */ }
    }
  }

  async function onLoadCoverStats() {
    const token = getStoredAuthToken()
    if (!token) return
    try {
      const [stats, nf] = await Promise.all([getCoverStats(token), getNotFoundCovers(token)])
      setCoverStats(stats)
      setNotFoundCovers(nf)
    } catch (e) {
      setPexelsErr(e instanceof Error ? e.message : 'stats_load_failed')
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

      {/* DeepSeek Agent Merkezi */}
      <div className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm dark:border-amber-900 dark:bg-neutral-900/40">
        <div className="mb-4 flex flex-wrap items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            <Bot className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">DeepSeek Agent Merkezi</h2>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Supervisor yaklaşan özel günleri takip eder, DeepSeek ile popup önerisi üretir ve canlı yayına almadan önce onaya düşürür.
            </p>
          </div>
        </div>

        {agentErr ? (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {agentErr}
          </div>
        ) : null}

        {agentOverview ? (
          <div className="mb-4 grid gap-3 md:grid-cols-3">
            {agentOverview.agents.map((agent) => (
              <div key={agent.code} className="rounded-xl border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-950/40">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-neutral-900 dark:text-white">{agent.code}</span>
                  <span className={clsx('rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase', jobStatusBadge(agent.status))}>
                    {agent.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-neutral-500">{agent.display_name}</p>
                <p className="mt-2 text-[11px] text-neutral-400">
                  Mod: <strong>{agent.mode}</strong> · Risk: <strong>{agent.risk_level}</strong>
                  {agent.last_run_at ? ` · Son çalışma: ${agent.last_run_at.slice(0, 16)}` : ''}
                </p>
                {agent.feature_profile_code ? (
                  <p className="mt-1 font-mono text-[10px] text-neutral-400">
                    profile: {agent.feature_profile_code}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        <div className="mb-4 flex flex-wrap gap-3">
          <ButtonPrimary
            type="button"
            disabled={agentRunning}
            onClick={() => void onRunSupervisorAgent()}
            className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
          >
            {agentRunning ? 'Supervisor çalışıyor…' : 'Supervisor Agent’i Çalıştır'}
          </ButtonPrimary>
          <button
            type="button"
            onClick={() => void loadAgentCenter()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
          >
            <RefreshCw className="h-4 w-4" />
            Agent Durumunu Yenile
          </button>
        </div>

        {agentLog.length > 0 ? (
          <div className="mb-4 rounded-xl border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-950/40">
            <ul className="space-y-0.5 font-mono text-[11px] text-neutral-600 dark:text-neutral-400">
              {agentLog.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Agent önerileri</h3>
            {agentOverview ? (
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                {Object.entries(agentOverview.recommendation_counts).map(([status, count]) => (
                  <span key={status} className={clsx('rounded-full px-2 py-0.5', jobStatusBadge(status))}>
                    {status}: {count}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          {agentRecommendations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-200 px-4 py-6 text-center text-sm text-neutral-500 dark:border-neutral-800">
              Henüz agent önerisi yok. Supervisor’ı çalıştırınca yaklaşan özel günleri kontrol eder.
            </div>
          ) : (
            <div className="grid gap-3">
              {agentRecommendations.slice(0, 8).map((rec) => {
                let popupTitle = ''
                let popupBody = ''
                try {
                  const payload = JSON.parse(rec.payload_json) as {
                    popup?: { title?: Record<string, string>; body?: Record<string, string> }
                  }
                  popupTitle = payload.popup?.title?.tr ?? ''
                  popupBody = payload.popup?.body?.tr ?? ''
                } catch {
                  // payload önizlemesi opsiyonel
                }
                return (
                  <div key={rec.id} className="rounded-xl border border-neutral-100 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-950/40">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={clsx('rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase', jobStatusBadge(rec.status))}>
                            {rec.status}
                          </span>
                          <span className="font-mono text-[11px] text-neutral-400">{rec.target_key}</span>
                        </div>
                        <h4 className="mt-2 text-sm font-semibold text-neutral-900 dark:text-white">{rec.title}</h4>
                        <p className="mt-1 text-xs text-neutral-500">{rec.reason}</p>
                        {popupTitle || popupBody ? (
                          <div className="mt-3 rounded-lg bg-white p-3 text-sm dark:bg-neutral-900">
                            {popupTitle ? <p className="font-semibold text-neutral-900 dark:text-white">{popupTitle}</p> : null}
                            {popupBody ? <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">{popupBody}</p> : null}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        {rec.status === 'pending' ? (
                          <button
                            type="button"
                            onClick={() => void onApproveAgentRecommendation(rec)}
                            className="rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:bg-neutral-900 dark:text-amber-300"
                          >
                            Onayla
                          </button>
                        ) : null}
                        {rec.status === 'pending' || rec.status === 'approved' ? (
                          <button
                            type="button"
                            onClick={() => void onApplyPopupRecommendation(rec)}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                          >
                            Popup’a Uygula
                          </button>
                        ) : null}
                        {rec.status === 'pending' ? (
                          <button
                            type="button"
                            onClick={() => void onRejectAgentRecommendation(rec.id)}
                            className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 dark:border-red-900 dark:bg-neutral-900 dark:text-red-300"
                          >
                            Reddet
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
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

      {/* Bölge Tanıtımı + Blog Yazıları */}
      <div className="rounded-2xl border border-violet-200 bg-white p-6 shadow-sm dark:border-violet-900 dark:bg-neutral-900/40">
        <div className="mb-4 flex flex-wrap items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-200">
            <Bot className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Bölge Tanıtımı + Blog Yazıları</h2>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Her ülke, il, ilçe ve destinasyon sayfasına turizm açısından tanıtıcı yazı ekler; ayrıca Gezi Fikirleri kategorisine bölge blog yazısı üretir.
            </p>
          </div>
        </div>

        {regionContentStats ? (
          <div className="mb-4 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full bg-neutral-100 px-3 py-1 dark:bg-neutral-800">
              Toplam bölge: <strong>{regionContentStats.total_regions}</strong>
            </span>
            <span className="rounded-full bg-violet-100 px-3 py-1 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300">
              Tanıtım yazısı var: <strong>{regionContentStats.regions_with_description}</strong>
            </span>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
              AI blog: <strong>{regionContentStats.generated_blog_posts}</strong>
            </span>
            {Object.entries(regionContentStats.batches).map(([status, cnt]) => (
              <span key={status} className={clsx('rounded-full px-3 py-1', jobStatusBadge(status))}>
                {status}: <strong>{cnt}</strong>
              </span>
            ))}
          </div>
        ) : null}

        {regionContentErr ? (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {regionContentErr}
          </div>
        ) : null}

        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Blog / bölge
            </label>
            <select
              value={postsPerRegion}
              disabled={regionContentRunning}
              onChange={(e) => setPostsPerRegion(Number(e.target.value) || 1)}
              className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
            >
              <option value={1}>1 blog</option>
              <option value={2}>2 blog</option>
              <option value={3}>3 blog</option>
            </select>
          </div>
          <ButtonPrimary
            type="button"
            disabled={regionContentRunning}
            onClick={() => void onQueueAllRegionContent()}
            className="bg-violet-600 hover:bg-violet-700"
          >
            1. Bölge İçeriklerini Kuyruğa Al
          </ButtonPrimary>
          {!regionContentRunning ? (
            <ButtonPrimary
              type="button"
              onClick={() => void onStartRegionContentProcessing()}
            >
              2. Yazmaya Başlat
            </ButtonPrimary>
          ) : (
            <button
              type="button"
              onClick={() => { regionContentStopRef.current = true }}
              className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300"
            >
              Durdur
            </button>
          )}
          <button
            type="button"
            onClick={() => void loadRegionContentStats()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
          >
            <RefreshCw className="h-4 w-4" />
            İstatistik Yenile
          </button>
        </div>

        {regionContentLog.length > 0 ? (
          <div className="mt-4 max-h-48 overflow-y-auto rounded-xl border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-950/40">
            <ul className="space-y-0.5 font-mono text-[11px] text-neutral-600 dark:text-neutral-400">
              {regionContentLog.map((line, i) => (
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
              onChange={(e) => { setMapsApiKey(e.target.value); localStorage.setItem('admin_maps_api_key', e.target.value) }}
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

      {/* Pexels kapak resimleri */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/40">
        <h2 className="flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-white">
          <MapPin className="h-4 w-4 text-pink-500" />
          Pexels — Lokasyon Kapak Resimleri
        </h2>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Kapak resmi olmayan her lokasyon (ülke, il, ilçe, belde) için Pexels&apos;ten otomatik fotoğraf çeker ve kaydeder.
          API anahtarı ücretsiz: <a href="https://www.pexels.com/api/" target="_blank" rel="noopener noreferrer" className="text-pink-600 hover:underline">pexels.com/api</a>
        </p>

        {pexelsErr ? (
          <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{pexelsErr}</p>
        ) : null}

        <div className="mt-4 space-y-2">
          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">
            Pexels API Anahtarları <span className="text-neutral-400">(her key 200 istek/saat — dolu olanlar sırayla kullanılır)</span>
          </label>
          {pexelsApiKeys.map((k, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-14 shrink-0 text-right text-xs text-neutral-400">Key {i + 1}</span>
              <input
                type="password"
                value={k}
                onChange={(e) => setPexelsApiKeys((prev) => { const next = prev.map((v, j) => j === i ? e.target.value : v); localStorage.setItem('admin_pexels_api_keys', JSON.stringify(next)); return next })}
                placeholder={`Pexels API key ${i + 1}...`}
                className="flex-1 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 font-mono text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-pink-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                disabled={pexelsRunning}
              />
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {!pexelsRunning ? (
            <>
              <ButtonPrimary
                type="button"
                onClick={() => void onStartPexelsProcessing()}
                className="bg-pink-600 hover:bg-pink-700"
              >
                Pexels&apos;ten Resim Çek
              </ButtonPrimary>
              {coverStats && coverStats.not_found > 0 && (
                <button
                  type="button"
                  onClick={async () => {
                    const token = getStoredAuthToken()
                    if (!token) return
                    try {
                      const r = await resetNotFoundCovers(token)
                      setPexelsLog([`↺ ${r.reset_count} lokasyon sıfırlandı, yeniden deneniyor…`])
                      void onStartPexelsProcessing()
                    } catch (e) {
                      setPexelsErr(e instanceof Error ? e.message : 'reset_failed')
                    }
                  }}
                  className="rounded-xl border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-300"
                >
                  ↺ Bulunamayanları Yeniden Dene ({coverStats.not_found})
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={() => { pexelsStopRef.current = true }}
              className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300"
            >
              Durdur
            </button>
          )}
          {pexelsRunning && (
            <span className="inline-flex items-center gap-2 text-sm text-neutral-500">
              <RefreshCw className="h-4 w-4 animate-spin" />
              İşleniyor…
            </span>
          )}
        </div>

        {pexelsLog.length > 0 && (
          <div className="mt-4 max-h-48 overflow-y-auto rounded-xl border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-950/40">
            <ul className="space-y-0.5 font-mono text-[11px] text-neutral-600 dark:text-neutral-400">
              {pexelsLog.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </div>
        )}

        {/* İstatistik + uyarı */}
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => void onLoadCoverStats()}
            className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
          >
            İstatistikleri Gör
          </button>
          {coverStats && (
            <span className="text-xs text-neutral-500">
              Toplam: <b>{coverStats.total}</b> · Resimli: <b className="text-emerald-600">{coverStats.has_cover}</b> · Boş: <b className="text-amber-600">{coverStats.empty}</b> · Bulunamadı: <b className="text-red-600">{coverStats.not_found}</b>
            </span>
          )}
        </div>

        {notFoundCovers && notFoundCovers.length > 0 && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/20">
            <button
              type="button"
              onClick={() => setNotFoundExpanded((v) => !v)}
              className="flex w-full items-center justify-between text-sm font-semibold text-red-700 dark:text-red-300"
            >
              <span>⚠️ Pexels&apos;te resim bulunamayan {notFoundCovers.length} lokasyon</span>
              <span className="text-xs">{notFoundExpanded ? '▲ Gizle' : '▼ Göster'}</span>
            </button>
            {notFoundExpanded && (
              <ul className="mt-3 max-h-64 overflow-y-auto space-y-1">
                {notFoundCovers.map((item) => (
                  <li key={item.id} className="flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
                    <span className="rounded bg-red-100 px-1.5 py-0.5 font-mono dark:bg-red-900/40">{item.region_type}</span>
                    <span className="font-medium">{item.location_name}</span>
                    {item.parent_name && <span className="text-red-400">/ {item.parent_name}</span>}
                    <span className="ml-auto font-mono text-[10px] text-red-400">{item.slug_path}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {notFoundCovers?.length === 0 && coverStats && (
          <p className="mt-3 text-xs text-emerald-600 dark:text-emerald-400">✓ Tüm lokasyonlarda resim bulundu.</p>
        )}
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
