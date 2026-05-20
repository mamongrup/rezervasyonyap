'use client'

import {
  getAiJob,
  getAgentOverview,
  getCoverStats,
  getDistrictIdeasStats,
  getNextEmptyDistrict,
  getNextNoCoverDistrict,
  getNextWithoutServicePois,
  getNotFoundCovers,
  getRegionContentStats,
  listAiFeatureProfiles,
  listAiJobs,
  listSiteSettings,
  listAiProviders,
  listAgentRecommendations,
  patchAgentRecommendation,
  patchLpServicePois,
  processNextPlaceBlog,
  processNextRegionContent,
  processNextDistrictIdea,
  queueAllDistrictIdeas,
  queueAllPlaceBlogs,
  queueAllRegionContent,
  resetNotFoundCovers,
  resetStuckDistrictJobs,
  resetStuckBatchJobs,
  runDueAgentSupervisor,
  runAgentSupervisor,
  saveDistrictCover,
  saveDistrictPlaces,
  searchPexelsImage,
  upsertSiteSetting,
  type DistrictServicePoi,
  type AgentOverview,
  type AgentRecommendation,
  type CoverStats,
  type DistrictIdeasStats,
  type NotFoundCoverItem,
  type RegionContentStats,
} from '@/lib/travel-api'
import { timeoutMsForProfile } from '@/lib/ai-upstream-timeouts'
import { formatManageApiCatch } from '@/lib/manage-api-error-tr'
import {
  buildRegionPlaceDataFromGoogleDefaults,
  postRegionPlacesJson,
} from '@/lib/build-region-places-from-google'
import { parseLenientJson } from '@/lib/json-parse'
import { buildPlacePhotoProxySrc } from '@/lib/nearby-poi-image'
import { regionPlacesSlugFromSlugPath } from '@/lib/region-places-slug'
import { getStoredAuthToken } from '@/lib/auth-storage'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import PopupView from '@/components/popups/PopupView'
import type { PopupItem } from '@/lib/popups-types'
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

function popupFromAgentRecommendation(rec: AgentRecommendation): PopupItem | null {
  try {
    const parsed = JSON.parse(rec.payload_json) as { popup?: unknown }
    if (!parsed.popup || typeof parsed.popup !== 'object') return null
    return parsed.popup as PopupItem
  } catch {
    return null
  }
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
  const vitrinPath = useVitrinHref()
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
  const [agentPreviewPopup, setAgentPreviewPopup] = useState<PopupItem | null>(null)

  // İlçe gezi fikirleri — DeepSeek AI toplu üretimi
  const [districtStats, setDistrictStats] = useState<DistrictIdeasStats | null>(null)
  const [districtRunning, setDistrictRunning] = useState(false)
  const [districtLog, setDistrictLog] = useState<string[]>([])
  const [districtErr, setDistrictErr] = useState<string | null>(null)
  const districtStopRef = useRef(false)
  /** DeepSeek kuyruğu: tek öğeli Maps yer tutucularını da hedefle (?include_weak=1) */
  const [districtQueueIncludeWeak, setDistrictQueueIncludeWeak] = useState(false)
  /** Kaç ilçe işlenince duracak (0 = sınırsız) */
  const [districtBatchCount, setDistrictBatchCount] = useState(20)

  // Bölge tanıtım yazısı + bölge blog yazıları
  const [regionContentStats, setRegionContentStats] = useState<RegionContentStats | null>(null)
  const [regionContentRunning, setRegionContentRunning] = useState(false)
  const [regionContentLog, setRegionContentLog] = useState<string[]>([])
  const [regionContentErr, setRegionContentErr] = useState<string | null>(null)
  const [postsPerRegion, setPostsPerRegion] = useState(1)
  const [placeBlogsRunning, setPlaceBlogsRunning] = useState(false)
  const [placeBlogsErr, setPlaceBlogsErr] = useState<string | null>(null)
  const [placeBlogsLog, setPlaceBlogsLog] = useState<string[]>([])
  const [contentWorkerCount, setContentWorkerCount] = useState(1)
  const [opsLog, setOpsLog] = useState<string[]>([])
  const regionContentStopRef = useRef(false)
  const placeBlogsStopRef = useRef(false)

  // İlçe gezi fikirleri — Google Maps Places çekme
  const [mapsRunning, setMapsRunning] = useState(false)
  const [mapsLog, setMapsLog] = useState<string[]>([])
  const [mapsErr, setMapsErr] = useState<string | null>(null)
  const [mapsApiKey, setMapsApiKey] = useState<string>('')
  const mapsStopRef = useRef(false)
  /** Maps iş akışı: gezi fikirleri kaydından sonra region-places JSON (vitrin + mesafeler) */
  const [mapsAlsoWriteRegionPlaces, setMapsAlsoWriteRegionPlaces] = useState(true)
  /** Kaç ilçe Maps'ta işlenince duracak */
  const [mapsBatchCount, setMapsBatchCount] = useState(20)
  /** Kaç bölge içerik işlenince duracak */
  const [regionBatchCount, setRegionBatchCount] = useState(10)
  /** Kaç mekan blog'u işlenince duracak */
  const [placesBatchCount, setPlacesBatchCount] = useState(10)
  /** Takılı iş sıfırlama durumu */
  const [resetBusy, setResetBusy] = useState(false)

  // Pexels kapak + fikir resimleri
  const [pexelsRunning, setPexelsRunning] = useState(false)
  const [pexelsLog, setPexelsLog] = useState<string[]>([])
  const [pexelsErr, setPexelsErr] = useState<string | null>(null)
  const [pexelsApiKeys, setPexelsApiKeys] = useState<string[]>(['', '', '', '', ''])
  const [pexelsKeysSaving, setPexelsKeysSaving] = useState(false)
  const [pexelsKeysSaved, setPexelsKeysSaved] = useState(false)
  const pexelsStopRef = useRef(false)
  const pexelsKeyIndexRef = useRef(0)

  // ─── Mesafe türleri yapılandırması ───────────────────────────────────────────
  type ServicePoiTypeDef = { type: string; label: string; googleType: string; radius: number; category: 'amenity' | 'transport' }
  const DEFAULT_SERVICE_POI_TYPES: ServicePoiTypeDef[] = [
    { type: 'market',     label: 'Market',                   googleType: 'grocery_or_supermarket', radius: 5000,   category: 'amenity'   },
    { type: 'restoran',   label: 'Restoran',                 googleType: 'restaurant',             radius: 5000,   category: 'amenity'   },
    { type: 'eczane',     label: 'Eczane',                   googleType: 'pharmacy',               radius: 15000,  category: 'amenity'   },
    { type: 'havalimani', label: 'Havalimanı',               googleType: 'airport',                radius: 200000, category: 'transport' },
    { type: 'otogar',     label: 'Otogar / Otobüs Terminali',googleType: 'bus_station',            radius: 50000,  category: 'transport' },
    { type: 'minibus',    label: 'Minibüs / Dolmuş',         googleType: 'transit_station',        radius: 5000,   category: 'transport' },
  ]
  const [servicePoiTypes, setServicePoiTypes] = useState<ServicePoiTypeDef[]>(DEFAULT_SERVICE_POI_TYPES)
  const [servicePoiSaving, setServicePoiSaving] = useState(false)
  const [servicePoiSaved, setServicePoiSaved] = useState(false)
  const [newServicePoiDef, setNewServicePoiDef] = useState<ServicePoiTypeDef>({
    type: '', label: '', googleType: '', radius: 10000, category: 'amenity',
  })
  // ─── Servis Mekan Koordinatları batch (287) ───────────────────────────────
  const [svcPoisRunning, setSvcPoisRunning] = useState(false)
  const [svcPoisLog, setSvcPoisLog] = useState<string[]>([])
  const [svcPoisErr, setSvcPoisErr] = useState<string | null>(null)
  const [svcPoisProcessed, setSvcPoisProcessed] = useState(0)
  const [svcPoisBatchCount, setSvcPoisBatchCount] = useState(20)
  const svcPoisStopRef = useRef(false)

  const [coverStats, setCoverStats] = useState<CoverStats | null>(null)
  const [notFoundCovers, setNotFoundCovers] = useState<NotFoundCoverItem[] | null>(null)
  const [notFoundExpanded, setNotFoundExpanded] = useState(false)

  // DB'de kalıcı tut: maps ayarları + pexels keyleri (site_settings, platform scope).
  useEffect(() => {
    const token = getStoredAuthToken()
    if (!token) return

    ;(async () => {
      try {
        const [mapsJsonRaw, pexelsJsonRaw, servicePoiRaw] = await Promise.all([
          listSiteSettings(token, { scope: 'platform', key: 'maps' })
            .then((r) => r.settings?.[0]?.value_json ?? '')
            .catch(() => ''),
          listSiteSettings(token, { scope: 'platform', key: 'pexels' })
            .then((r) => r.settings?.[0]?.value_json ?? '')
            .catch(() => ''),
          listSiteSettings(token, { scope: 'platform', key: 'service_poi_types' })
            .then((r) => r.settings?.[0]?.value_json ?? '')
            .catch(() => ''),
        ])

        if (servicePoiRaw?.trim()) {
          try {
            const parsed = JSON.parse(servicePoiRaw) as ServicePoiTypeDef[]
            if (Array.isArray(parsed) && parsed.length > 0) setServicePoiTypes(parsed)
          } catch { /* varsayılanla devam */ }
        }

        if (mapsJsonRaw?.trim()) {
          const mapsJson = parseLenientJson(mapsJsonRaw) as Record<string, unknown>
          const k = typeof mapsJson.google_maps_api_key === 'string' ? mapsJson.google_maps_api_key.trim() : ''
          if (k) setMapsApiKey(k)
        }

        if (pexelsJsonRaw?.trim()) {
          const pj = parseLenientJson(pexelsJsonRaw) as Record<string, unknown>
          const raw = pj.api_keys
          if (Array.isArray(raw)) {
            const keys = raw.filter((x): x is string => typeof x === 'string')
            const padded = [...keys]
            while (padded.length < 5) padded.push('')
            setPexelsApiKeys(padded.slice(0, 10))
          }
        }
      } catch {
        // ignore
      }
    })()
  }, [])

  async function savePexelsKeysToDb() {
    const token = getStoredAuthToken()
    if (!token) {
      setPexelsErr('Kaydetmek için yönetici oturumu gerekli.')
      return
    }
    const keys = pexelsApiKeys.map((k) => k.trim()).filter(Boolean)
    if (!keys.length) {
      setPexelsErr('En az bir Pexels API anahtarı gerekli.')
      return
    }
    setPexelsKeysSaving(true)
    setPexelsKeysSaved(false)
    setPexelsErr(null)
    try {
      await upsertSiteSetting(token, { key: 'pexels', value_json: JSON.stringify({ api_keys: keys }) })
      setPexelsKeysSaved(true)
      setTimeout(() => setPexelsKeysSaved(false), 2500)
    } catch (e) {
      setPexelsErr(formatManageApiCatch(e, 'Kayıt başarısız'))
    } finally {
      setPexelsKeysSaving(false)
    }
  }

  /** Ayarlar → Genel → Yapay zeka (`site_settings.ai`) — her işte taze okunur; fetch süresi buradan. */
  const fetchAiSettingsSnapshot = useCallback(async (): Promise<Record<string, unknown> | null> => {
    const token = getStoredAuthToken()
    if (!token) return null
    try {
      const r = await listSiteSettings(token, { scope: 'platform', key: 'ai' })
      const row = r.settings[0]
      if (row?.value_json?.trim()) {
        return parseLenientJson(row.value_json) as Record<string, unknown>
      }
      return null
    } catch {
      return null
    }
  }, [])

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
      setLoadErr(formatManageApiCatch(e, 'ai_load_failed'))
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

  // İstatistik otomatik yenileme — çalışan iş varsa 30 sn'de bir güncelle
  useEffect(() => {
    const timer = setInterval(() => {
      const hasRunningDistrict = (districtStats?.jobs['running'] ?? 0) > 0
      const hasRunningBatch =
        (regionContentStats?.batches['running'] ?? 0) > 0 ||
        (regionContentStats?.place_blog_batches['running'] ?? 0) > 0
      if (hasRunningDistrict || districtRunning) void loadDistrictStats()
      if (hasRunningBatch || regionContentRunning || placeBlogsRunning) void loadRegionContentStats()
    }, 30_000)
    return () => clearInterval(timer)
  }, [districtStats, regionContentStats, districtRunning, regionContentRunning, placeBlogsRunning])

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
      setAgentErr(formatManageApiCatch(e, 'agent_center_load_failed'))
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
      setAgentErr(formatManageApiCatch(e, 'agent_supervisor_failed'))
    } finally {
      setAgentRunning(false)
    }
  }

  async function onRunDueSupervisorAgent() {
    const token = getStoredAuthToken()
    if (!token) return
    setAgentRunning(true)
    setAgentErr(null)
    try {
      const r = await runDueAgentSupervisor(token)
      if (!('scanned' in r)) {
        setAgentLog((l) => [...l, 'Scheduled kontrol: Supervisor bugün zaten çalışmış, yeni koşu açılmadı.'])
      } else {
        setAgentLog((l) => [
          ...l,
          `Scheduled kontrol çalıştı: ${r.scanned} özel gün tarandı, ${r.created} öneri oluşturuldu, ${r.failed} hata.`,
        ])
      }
      await loadAgentCenter()
      await refresh()
    } catch (e) {
      setAgentErr(formatManageApiCatch(e, 'agent_supervisor_due_failed'))
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
      setAgentErr(formatManageApiCatch(e, 'agent_recommendation_reject_failed'))
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
      setAgentErr(formatManageApiCatch(e, 'agent_recommendation_approve_failed'))
    }
  }

  async function onApplyPopupRecommendation(rec: AgentRecommendation) {
    const token = getStoredAuthToken()
    if (!token) return
    setAgentErr(null)
    try {
      const popup = popupFromAgentRecommendation(rec)
      if (!popup) {
        throw new Error('agent_payload_popup_missing')
      }

      const currentRes = await fetch('/api/popups', { credentials: 'include' })
      const currentData = (await currentRes.json()) as {
        ok?: boolean
        config?: { popups?: PopupItem[]; updatedAt?: string }
      }
      const currentPopups = Array.isArray(currentData.config?.popups)
        ? currentData.config.popups
        : []
      const nextPopups = [
        popup,
        ...currentPopups.filter((p) => p.id !== popup.id),
      ]
      const saveRes = await fetch('/api/popups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ popups: nextPopups }),
      })
      if (!saveRes.ok) throw new Error(`popup_config_save_${saveRes.status}`)

      await patchAgentRecommendation(token, rec.id, 'applied', 'Admin onayıyla vitrin popup config kaydına uygulandı.')
      setAgentLog((l) => [...l, `${rec.title} vitrin popup config'e uygulandı.`])
      await loadAgentCenter()
    } catch (e) {
      setAgentErr(formatManageApiCatch(e, 'agent_popup_apply_failed'))
    }
  }

  async function loadDistrictStats(opts?: { clearErrOnSuccess?: boolean }) {
    const token = getStoredAuthToken()
    if (!token) return
    try {
      const s = await getDistrictIdeasStats(token)
      setDistrictStats(s)
      if (opts?.clearErrOnSuccess) setDistrictErr(null)
    } catch (e) {
      setDistrictStats(null)
      setDistrictErr(formatManageApiCatch(e, 'district_stats_failed'))
    }
  }

  async function loadRegionContentStats(opts?: { clearErrOnSuccess?: boolean }) {
    const token = getStoredAuthToken()
    if (!token) return
    try {
      const s = await getRegionContentStats(token)
      setRegionContentStats(s)
      if (opts?.clearErrOnSuccess) setRegionContentErr(null)
    } catch (e) {
      setRegionContentStats(null)
      setRegionContentErr(formatManageApiCatch(e, 'region_content_stats_failed'))
    }
  }

  async function onResetStuck() {
    const token = getStoredAuthToken()
    if (!token) return
    setResetBusy(true)
    try {
      const [d, b] = await Promise.all([
        resetStuckDistrictJobs(token),
        resetStuckBatchJobs(token),
      ])
      const total = d.reset_count + b.geo_reset + b.place_reset
      const msg =
        total === 0
          ? 'Takılı iş yok, sıfırlanacak bir şey bulunamadı.'
          : `Sıfırlandı: ${d.reset_count} ilçe işi, ${b.geo_reset} bölge batch, ${b.place_reset} mekan batch.`
      setDistrictLog((l) => [...l, `♻ ${msg}`])
      appendOpsLog(`♻ ${msg}`)
      await Promise.all([loadDistrictStats(), loadRegionContentStats()])
    } catch (e) {
      setDistrictErr(formatManageApiCatch(e, 'reset_stuck_failed'))
    } finally {
      setResetBusy(false)
    }
  }

  async function onQueueAllRegionContent() {
    const token = getStoredAuthToken()
    if (!token) return
    setRegionContentErr(null)
    setRegionContentLog([])
    try {
      const r = await queueAllRegionContent(token, postsPerRegion)
      const q = r.queued
      const ppr = r.posts_per_region
      if (q === 0) {
        setRegionContentLog((l) => [
          ...l,
          'Kuyruğa eklenecek bölge yok (tüm uygun kayıtlar zaten işlemde veya kriterler karşılanıyor).',
        ])
      } else {
        setRegionContentLog((l) => [...l, `${q} bölge kuyruğa alındı (${ppr} blog/bölge).`])
      }
      await loadRegionContentStats()
    } catch (e) {
      setRegionContentErr(formatManageApiCatch(e, 'region_content_queue_failed'))
    }
  }

  function appendOpsLog(line: string) {
    setOpsLog((l) => [`${new Date().toLocaleTimeString('tr-TR')} · ${line}`, ...l].slice(0, 120))
  }

  async function runParallelWorkers(
    workerCount: number,
    mode: { untilDone: boolean },
    shouldStop: () => boolean,
    runOne: (workerIndex: number) => Promise<boolean>,
  ) {
    const n = Math.max(1, Math.min(5, workerCount))
    if (!mode.untilDone) {
      await Promise.all(
        Array.from({ length: n }, async (_, index) => {
          await runOne(index + 1)
        }),
      )
      return
    }
    const workers = Array.from({ length: n }, async (_, index) => {
      while (!shouldStop()) {
        const didWork = await runOne(index + 1)
        if (!didWork) break
        await new Promise((res) => setTimeout(res, 500))
      }
    })
    await Promise.all(workers)
  }

  async function onStartRegionContentProcessing(opts: { untilDone: boolean; maxItems?: number }) {
    const token = getStoredAuthToken()
    if (!token) return
    regionContentStopRef.current = false
    setRegionContentRunning(true)
    setRegionContentErr(null)
    let processed = 0
    const limit = opts.maxItems ?? (opts.untilDone ? 0 : contentWorkerCount)
    appendOpsLog(
      `Bölge içerik işçileri başladı (${limit === 0 ? 'kuyruk bitene kadar' : `${limit} bölge`}, ${contentWorkerCount} paralel).`,
    )
    try {
      await runParallelWorkers(
        contentWorkerCount,
        { untilDone: opts.untilDone || (opts.maxItems != null && opts.maxItems > contentWorkerCount) },
        () => regionContentStopRef.current || (limit > 0 && processed >= limit),
        async (workerIndex) => {
          if (limit > 0 && processed >= limit) return false
          const snap = await fetchAiSettingsSnapshot()
          const ms = Math.max(
            timeoutMsForProfile(snap, 'region_tourism_content'),
            timeoutMsForProfile(snap, 'region_blog_writer'),
          )
          const r = await processNextRegionContent(token, { upstreamTimeoutMs: ms })
          if (r.done) {
            setRegionContentLog((l) => [...l, 'Bölge içerik kuyruğu tamamlandı.'])
            appendOpsLog(`Bölge içerik kuyruğu tamamlandı (worker ${workerIndex}).`)
            return false
          }
          processed++
          const countLabel = limit > 0 ? `${processed}/${limit}` : `${processed}`
          const label = r.name ?? r.slug_path ?? r.location_page_id?.slice(0, 8)
          setRegionContentLog((l) => [
            ...l,
            `#${countLabel} ✓ [w${workerIndex}] ${label} · blog: ${r.blog_posts_created ?? 0}`,
          ])
          appendOpsLog(`Bölge içerik: ${label} · blog ${r.blog_posts_created ?? 0}`)
          if (processed % 5 === 0) await loadRegionContentStats()
          return true
        })
      if (limit > 0 && processed >= limit) {
        setRegionContentLog((l) => [...l, `${processed} bölge işlendi, durdu.`])
        appendOpsLog(`${processed} bölge işlendi, limit doldu.`)
      }
    } catch (e) {
      setRegionContentErr(formatManageApiCatch(e, 'region_content_process_failed'))
      appendOpsLog(`Bölge içerik hata: ${formatManageApiCatch(e, 'region_content_process_failed')}`)
    } finally {
      setRegionContentRunning(false)
      await loadRegionContentStats()
    }
  }

  async function onQueueAllPlaceBlogs() {
    const token = getStoredAuthToken()
    if (!token) return
    setPlaceBlogsErr(null)
    setPlaceBlogsLog([])
    try {
      const r = await queueAllPlaceBlogs(token, postsPerRegion)
      const q = r.queued
      const ppl = r.posts_per_location
      const msg =
        q === 0
          ? 'Kuyruğa eklenecek mekan blog işi yok (aday lokasyonda blog var veya batch bekliyor).'
          : `${q} favori mekan blog işi kuyruğa alındı (${ppl} blog/lokasyon).`
      setPlaceBlogsLog((l) => [...l, msg])
      appendOpsLog(msg)
      await loadRegionContentStats()
    } catch (e) {
      setPlaceBlogsErr(formatManageApiCatch(e, 'place_blogs_queue_failed'))
    }
  }

  async function onStartPlaceBlogsProcessing(opts: { untilDone: boolean; maxItems?: number }) {
    const token = getStoredAuthToken()
    if (!token) return
    placeBlogsStopRef.current = false
    setPlaceBlogsRunning(true)
    setPlaceBlogsErr(null)
    let processed = 0
    const limit = opts.maxItems ?? (opts.untilDone ? 0 : contentWorkerCount)
    appendOpsLog(
      `Favori mekan blog işçileri başladı (${limit === 0 ? 'kuyruk bitene kadar' : `${limit} blog`}, ${contentWorkerCount} paralel).`,
    )
    try {
      await runParallelWorkers(
        contentWorkerCount,
        { untilDone: opts.untilDone || (opts.maxItems != null && opts.maxItems > contentWorkerCount) },
        () => placeBlogsStopRef.current || (limit > 0 && processed >= limit),
        async (workerIndex) => {
          if (limit > 0 && processed >= limit) return false
          const snap = await fetchAiSettingsSnapshot()
          const ms = timeoutMsForProfile(snap, 'place_blog_writer')
          const r = await processNextPlaceBlog(token, { upstreamTimeoutMs: ms })
          if (r.done) {
            setPlaceBlogsLog((l) => [...l, 'Favori mekan blog kuyruğu tamamlandı.'])
            appendOpsLog(`Favori mekan blog kuyruğu tamamlandı (worker ${workerIndex}).`)
            return false
          }
          processed++
          const countLabel = limit > 0 ? `${processed}/${limit}` : `${processed}`
          const label = r.name ?? r.slug_path ?? r.location_page_id?.slice(0, 8)
          setPlaceBlogsLog((l) => [
            ...l,
            `#${countLabel} ✓ [w${workerIndex}] ${label} · blog: ${r.blog_posts_created ?? 0}`,
          ])
          appendOpsLog(`Favori mekan blog: ${label} · blog ${r.blog_posts_created ?? 0}`)
          if (processed % 5 === 0) await loadRegionContentStats()
          return true
        })
      if (limit > 0 && processed >= limit) {
        setPlaceBlogsLog((l) => [...l, `${processed} blog işlendi, durdu.`])
        appendOpsLog(`${processed} favori mekan blog işlendi, limit doldu.`)
      }
    } catch (e) {
      setPlaceBlogsErr(formatManageApiCatch(e, 'place_blogs_process_failed'))
      appendOpsLog(`Favori mekan blog hata: ${formatManageApiCatch(e, 'place_blogs_process_failed')}`)
    } finally {
      setPlaceBlogsRunning(false)
      await loadRegionContentStats()
    }
  }

  async function onQueueAll() {
    const token = getStoredAuthToken()
    if (!token) return
    setDistrictErr(null)
    setDistrictLog([])
    try {
      const r = await queueAllDistrictIdeas(token, { includeWeak: districtQueueIncludeWeak })
      const total = r.total_found
      const queued = r.queued

      if (r.message === 'no_districts_need_content' || (queued === 0 && total === 0)) {
        setDistrictLog((l) => [
          ...l,
          districtQueueIncludeWeak
            ? 'Kuyruğa eklenecek ilçe yok (boş / yer tutucu kriteri ile eşleşen ve kuyrukta beklemeyen kayıt yok). Yer tutucu tahmini sıfırsa çoğu ilçede zaten dolu liste var — sıradaki adım: aşağıda “Mekan bloglarını kuyruğa al”.'
            : 'Bu modda yalnızca `travel_ideas_json` tamamen boş olan ilçeler kuyruğa girer. Ekranda tüm ilçelerde “içerik var” ise DeepSeek için yapılacak iş kalmamış demektir. Tek satırlık Maps özetlerini DeepSeek ile değiştirmek için “Yer tutucuları da kuyruğa al” kutusunu işleyip tekrar deneyin.',
        ])
      } else if (queued === 0 && total > 0) {
        setDistrictLog((l) => [
          ...l,
          `${total} uygun ilçe bulundu ancak hiçbiri kuyruğa yazılamadı. Sunucu güncel travel-api ve veritabanı izinlerini kontrol edin.`,
        ])
      } else {
        setDistrictLog((l) => [
          ...l,
          `${queued} ilçe kuyruğa alındı (aday ilçe: ${total}${r.include_weak ? '; yer tutucu dahil modu' : ''}).`,
        ])
      }
      await loadDistrictStats()
    } catch (e) {
      setDistrictErr(formatManageApiCatch(e, 'queue_failed'))
    }
  }

  async function onStartProcessing(opts: { untilDone: boolean; maxItems?: number }) {
    const token = getStoredAuthToken()
    if (!token) return
    districtStopRef.current = false
    setDistrictRunning(true)
    setDistrictErr(null)
    let processed = 0
    const limit = opts.maxItems ?? (opts.untilDone ? 0 : 1)
    setDistrictLog((l) => [
      ...l,
      limit === 1
        ? 'Tek adım: bir kuyruk işlemi denendikten sonra durur.'
        : limit > 1
          ? `${limit} ilçe işlenince otomatik duracak.`
          : 'Onaylı mod: kuyruk boşalana veya «Durdur»a basana kadar devam eder.',
    ])
    const processDistrictIteration = async (): Promise<boolean> => {
      const snap = await fetchAiSettingsSnapshot()
      const ms = timeoutMsForProfile(snap, 'district_travel_ideas')
      const r = await processNextDistrictIdea(token, { upstreamTimeoutMs: ms })
      if (r.done) {
        setDistrictLog((l) => [...l, 'Kuyruk tamamlandı.'])
        return false
      }
      if (r.skipped) {
        setDistrictLog((l) => [...l, `Atlandı (provider pasif?): ${r.job_id ?? ''}`])
        return true
      }
      processed++
      setDistrictLog((l) => [
        ...l,
        `#${processed}${limit > 0 ? `/${limit}` : ''} – ${r.ideas_stored ? '✓' : '⚠'} ${r.location_page_id?.slice(0, 8)}…`,
      ])
      if (processed % 10 === 0) await loadDistrictStats()
      await new Promise((res) => setTimeout(res, 800))
      return true
    }
    try {
      while (!districtStopRef.current) {
        if (limit > 0 && processed >= limit) {
          setDistrictLog((l) => [...l, `${processed} ilçe işlendi, durdu.`])
          break
        }
        const more = await processDistrictIteration()
        if (!more) break
      }
    } catch (e) {
      setDistrictErr(formatManageApiCatch(e, 'process_failed'))
    } finally {
      setDistrictRunning(false)
      await loadDistrictStats()
    }
  }

  async function onStartMapsProcessing(opts: { untilDone: boolean; maxItems?: number }) {
    const token = getStoredAuthToken()
    if (!token) return
    const key = mapsApiKey.trim()
    if (!key) {
      setMapsErr('Google Maps API anahtarı gerekli. Yönetim → Ayarlar → Google sekmesinden kaydedin.')
      return
    }
    mapsStopRef.current = false
    setMapsRunning(true)
    setMapsErr(null)
    let processed = 0
    const limit = opts.maxItems ?? (opts.untilDone ? 0 : 1)
    setMapsLog((l) => [
      ...l,
      limit === 1
        ? 'Tek adım: sıradaki bir ilçe için Places işlenir.'
        : limit > 1
          ? `${limit} ilçe işlenince otomatik duracak.`
          : 'Onaylı mod: içeriksiz ilçe kalmayıncaya veya «Durdur»a basana kadar devam.',
    ])
    const runMapsOnce = async (): Promise<boolean> => {
      const next = await getNextEmptyDistrict(token)
      if (next.done) {
        setMapsLog((l) => [...l, 'Tüm ilçeler tamamlandı.'])
        return false
      }
      const { location_page_id, district_name, region_name, center_lat, center_lng, slug_path } =
        next
      if (!location_page_id || !district_name) return true

      const hasCoords =
        center_lat != null &&
        center_lng != null &&
        String(center_lat).trim() !== '' &&
        String(center_lng).trim() !== ''
      let lat = hasCoords ? parseFloat(center_lat!) : 0
      let lng = hasCoords ? parseFloat(center_lng!) : 0
      let geocodedCoords: { lat: number; lng: number } | undefined

      // Koordinat yoksa Google Geocoding ile ilçenin gerçek konumunu bul
      if (!hasCoords) {
        try {
          const address = encodeURIComponent(
            [district_name, region_name, 'Türkiye'].filter(Boolean).join(', '),
          )
          const geoRes = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${address}&language=tr&key=${key}`,
          )
          if (geoRes.ok) {
            const geoData = (await geoRes.json()) as {
              status: string
              results?: Array<{ geometry: { location: { lat: number; lng: number } } }>
            }
            if (geoData.status === 'OK' && geoData.results?.[0]?.geometry?.location) {
              lat = geoData.results[0].geometry.location.lat
              lng = geoData.results[0].geometry.location.lng
              geocodedCoords = { lat, lng }
              setMapsLog((l) => [
                ...l,
                `   📍 Geocoding: ${district_name} → ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
              ])
            }
          }
        } catch {
          // geocoding başarısız; Turkey merkezi kullanılacak
        }
        // Geocoding başarısız olduysa Turkey merkezi ile metin arama
        if (!geocodedCoords) {
          lat = 39.0
          lng = 35.0
        }
      }

      const resolvedCoords = geocodedCoords ?? (hasCoords ? { lat, lng } : undefined)
      // Keyword modu: tourist_attraction tipiyle sınırlamaz; plajlar, parklar,
      // tarihi yerler, doğal güzellikler de dahil olur.
      const query = (hasCoords || geocodedCoords)
        ? 'turistik gezilecek görülecek plaj park doğa'
        : `${district_name} ${region_name ?? ''} en popüler turistik yer görülecek gezilecek`
      const radiusM = (hasCoords || geocodedCoords) ? 25_000 : 60_000
      const useKeywordSearch = hasCoords || !!geocodedCoords

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
            maxCount: 20,
            language: 'tr',
            apiKey: key,
            useKeyword: useKeywordSearch,
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
            image: p.photoRef ? buildPlacePhotoProxySrc(p.photoRef, 800) : undefined,
            link: `https://www.google.com/maps/place/?q=place_id:${p.placeId}`,
            lat: p.lat,
            lng: p.lng,
            place_id: p.placeId,
            distance_km_from_district: Math.round(p.distanceKm * 10) / 10,
          }))
        } else {
          let detail = `${placesRes.status}`
          try {
            const errJson = (await placesRes.json()) as { error?: string }
            if (errJson?.error) detail = errJson.error
          } catch {
            /* ignore */
          }
          setMapsLog((l) => [...l, `⚠ Maps yanıtı (${district_name}): ${detail}`])
        }
      } catch {
        setMapsLog((l) => [...l, `⚠ Maps hatası: ${district_name}, atlandı`])
        return true
      }

      if (ideas.length > 0) {
        await saveDistrictPlaces(token, location_page_id, JSON.stringify(ideas), resolvedCoords)
        processed++
        const countLabel = limit > 0 ? `${processed}/${limit}` : `${processed}`
        setMapsLog((l) => [...l, `#${countLabel} ✓ ${district_name} (${region_name}) — ${ideas.length} yer`])
      } else {
        await saveDistrictPlaces(
          token,
          location_page_id,
          JSON.stringify([{ id: 1, title: district_name, summary: `${region_name} iline bağlı ${district_name} ilçesi.`, lat, lng }]),
          resolvedCoords,
        )
        processed++
        const countLabel = limit > 0 ? `${processed}/${limit}` : `${processed}`
        setMapsLog((l) => [...l, `#${countLabel} ~ ${district_name} — Maps sonucu yok, yer tutucu eklendi`])
      }

      if (mapsAlsoWriteRegionPlaces && hasCoords && slug_path) {
        const regionSlug = regionPlacesSlugFromSlugPath(slug_path)
        if (regionSlug && !mapsStopRef.current) {
          try {
            const payload = await buildRegionPlaceDataFromGoogleDefaults({
              regionName: [district_name, region_name].filter(Boolean).join(', '),
              regionSlug,
              lat,
              lng,
              apiKey: key,
              locale: 'tr',
            })
            const pr = await postRegionPlacesJson(payload)
            if (pr.ok) {
              setMapsLog((l) => [...l, `   ↳ vitrin JSON kaydedildi (${regionSlug})`])
            } else {
              setMapsLog((l) => [...l, `   ↳ vitrin kayıt hatası: ${pr.error ?? '?'}`])
            }
          } catch (ve) {
            setMapsLog((l) => [
              ...l,
              `   ↳ vitrin üretim hatası: ${ve instanceof Error ? ve.message : String(ve)}`,
            ])
          }
        }
      }

      if (processed % 20 === 0) await loadDistrictStats()
      await new Promise((res) => setTimeout(res, 500))
      return true
    }
    try {
      while (!mapsStopRef.current) {
        if (limit > 0 && processed >= limit) {
          setMapsLog((l) => [...l, `${processed} ilçe işlendi, durdu.`])
          break
        }
        const more = await runMapsOnce()
        if (!more) break
      }
    } catch (e) {
      setMapsErr(formatManageApiCatch(e, 'maps_process_failed'))
    } finally {
      setMapsRunning(false)
      await loadDistrictStats()
    }
  }

  async function onStartPexelsProcessing(opts?: { untilDone?: boolean }) {
    const untilDone = opts?.untilDone ?? true
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
    const nextKey = () => {
      const k = activeKeys[pexelsKeyIndexRef.current % activeKeys.length]
      pexelsKeyIndexRef.current++
      return k
    }
    try {
      let done = 0
      setPexelsLog((l) => [
        ...l,
        untilDone
          ? 'Onaylı mod: kapaksız lokasyon kalmayıncaya veya «Durdur»a basana kadar devam.'
          : 'Tek adım: sıradaki bir lokasyon için kapak denemesi.',
      ])
      const runPexelsOnce = async (): Promise<boolean> => {
        const next = await getNextNoCoverDistrict(token)
        if (next.done) {
          setPexelsLog((l) => [...l, 'Tüm lokasyon kapak resimleri tamamlandı.'])
          return false
        }
        const { location_page_id, location_name, parent_name, region_type } = next
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
        return true
      }

      if (!untilDone) {
        await runPexelsOnce()
        setPexelsLog((l) => [...l, 'Tek adım bitti.'])
      } else {
        while (!pexelsStopRef.current) {
          const more = await runPexelsOnce()
          if (!more) break
        }
      }
    } catch (e) {
      setPexelsErr(formatManageApiCatch(e, 'pexels_process_failed'))
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
      setPexelsErr(formatManageApiCatch(e, 'stats_load_failed'))
    }
  }

  // ─── Servis Mekan Koordinatları batch ──────────────────────────────────────
  async function onStartSvcPois() {
    const token = getStoredAuthToken()
    if (!token || !mapsApiKey.trim()) {
      setSvcPoisErr('Google Maps API anahtarı gerekli. Yönetim → Ayarlar → Google sekmesinden kaydedin.')
      return
    }
    svcPoisStopRef.current = false
    setSvcPoisRunning(true)
    setSvcPoisLog([])
    setSvcPoisErr(null)
    setSvcPoisProcessed(0)
    const limit = svcPoisBatchCount
    let processed = 0

    const addLog = (msg: string) =>
      setSvcPoisLog((prev) => [...prev.slice(-99), msg])

    try {
      while (!svcPoisStopRef.current && (limit === 0 || processed < limit)) {
        const next = await getNextWithoutServicePois(token)
        if (next.done) {
          addLog('✓ Tüm ilçeler tamamlandı.')
          break
        }
        const { location_page_id: lpId, location_name: name, center_lat, center_lng } = next
        if (!lpId || !center_lat || !center_lng) break
        const lat = parseFloat(center_lat)
        const lng = parseFloat(center_lng)
        if (isNaN(lat) || isNaN(lng)) {
          addLog(`⚠ ${name ?? lpId}: koordinat yok, atlanıyor.`)
          // Boş liste yaz ki bir daha gelmesin
          await patchLpServicePois(token, lpId, [])
          processed++
          continue
        }

        addLog(`⟳ ${name} işleniyor…`)
        const pois: DistrictServicePoi[] = []

        for (const def of servicePoiTypes) {
          if (svcPoisStopRef.current) break
          try {
            const res = await fetch('/api/places-nearby', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                lat,
                lng,
                googleType: def.googleType,
                radiusM: def.radius,
                maxCount: 1,
                language: 'tr',
              }),
            })
            if (!res.ok) continue
            const data = await res.json() as { places?: { name?: string; lat?: number; lng?: number }[] }
            const place = data.places?.[0]
            if (place?.lat != null && place?.lng != null) {
              pois.push({
                type: def.type,
                label: def.label,
                googleType: def.googleType,
                lat: place.lat,
                lng: place.lng,
                category: def.category,
              })
            }
          } catch { /* type hatasını atla */ }
        }

        await patchLpServicePois(token, lpId, pois)
        processed++
        setSvcPoisProcessed(processed)
        addLog(`✓ ${name}: ${pois.length} mekan koordinatı kaydedildi.`)
      }
    } catch (e) {
      setSvcPoisErr(formatManageApiCatch(e, 'svc_pois_batch_failed'))
    } finally {
      setSvcPoisRunning(false)
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
      setLoadErr(formatManageApiCatch(err, 'ai_job_lookup_failed'))
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
          <button
            type="button"
            disabled={agentRunning}
            onClick={() => void onRunDueSupervisorAgent()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
            title="Cron ile aynı mantık: son 20 saatte çalışmadıysa çalışır."
          >
            Scheduled Kontrolü Test Et
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
                const popup = popupFromAgentRecommendation(rec)
                popupTitle = popup?.title?.tr ?? ''
                popupBody = popup?.body?.tr ?? ''
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
                        {popup ? (
                          <button
                            type="button"
                            onClick={() => setAgentPreviewPopup(popup)}
                            className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
                          >
                            Önizle
                          </button>
                        ) : null}
                        {rec.status === 'pending' ? (
                          <button
                            type="button"
                            onClick={() => void onApproveAgentRecommendation(rec)}
                            className="rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:bg-neutral-900 dark:text-amber-300"
                          >
                            Onayla
                          </button>
                        ) : null}
                        {rec.status === 'approved' ? (
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

      {agentPreviewPopup ? (
        <PopupView
          popup={agentPreviewPopup}
          locale="tr"
          onClose={() => setAgentPreviewPopup(null)}
          onDismissForever={() => setAgentPreviewPopup(null)}
        />
      ) : null}

      {/* İlçe Gezi Fikirleri — toplu AI üretimi */}
      <div className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm dark:border-emerald-900 dark:bg-neutral-900/40">
        <div className="mb-4 flex flex-wrap items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
            <MapPin className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">İlçe Gezi Fikirleri — Toplu AI Üretimi</h2>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Tüm ilçelere DeepSeek ile otomatik &ldquo;gezilesi yerler&rdquo; içeriği üretir. Önce kuyruğa al, sonra işlemi başlat. Süre:{' '}
              <a
                href={`${vitrinPath('/manage/admin/settings')}?tab=ai`}
                className="font-medium text-emerald-700 underline hover:no-underline dark:text-emerald-400"
              >
                Ayarlar → Yapay zeka
              </a>
              .
            </p>
            <p className="mt-2 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
              Önerilen sıra: (1) burada metin üret → (2) Google Maps ile gerçek mekan + mesafe ve vitrin JSON → (3) aşağıda &ldquo;Mekan blogları&rdquo; ile favori mekan yazıları (kaynak:{' '}
              <code className="rounded bg-neutral-100 px-1 font-mono dark:bg-neutral-800">travel_ideas_json</code>
              ).
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
            {districtStats.districts_travel_ideas_empty != null ? (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                Liste boş: <strong>{districtStats.districts_travel_ideas_empty}</strong>
              </span>
            ) : null}
            {districtStats.districts_placeholder_guess != null ? (
              <span className="rounded-full bg-orange-100 px-3 py-1 text-orange-900 dark:bg-orange-950/35 dark:text-orange-100">
                Yer tutucu (tahmini): <strong>{districtStats.districts_placeholder_guess}</strong>
              </span>
            ) : null}
            {Object.entries(districtStats.jobs).map(([status, cnt]) => (
              <span key={status} className={clsx('rounded-full px-3 py-1', jobStatusBadge(status))}>
                {status}: <strong>{cnt}</strong>
              </span>
            ))}
          </div>
        ) : null}
        {districtStats && (districtStats.jobs['failed'] ?? 0) > 0 ? (
          <div className="mb-3 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-800 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-200">
            <strong>{districtStats.jobs['failed']} başarısız iş</strong> var. Bunları yeniden işlemek için: «Yer tutucuları da kuyruğa al» seçeneğini işaretleyip <strong>1. Kuyruğa Al</strong> → <strong>N ilçe işle</strong>.
          </div>
        ) : null}

        {districtErr ? (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {districtErr}
          </div>
        ) : null}

        <label className="mb-3 flex cursor-pointer items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300">
          <input
            type="checkbox"
            className="mt-1 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500 dark:border-neutral-600 dark:bg-neutral-900"
            checked={districtQueueIncludeWeak}
            onChange={(e) => setDistrictQueueIncludeWeak(e.target.checked)}
            disabled={districtRunning}
          />
          <span>
            Yer tutucuları da kuyruğa al (tek öğeli “… iline bağlı … ilçesi” özeti). DeepSeek ile gerçek gezi listesi üretmek için işaretleyin.
          </span>
        </label>

        <div className="flex flex-wrap items-end gap-3">
          <ButtonPrimary
            type="button"
            disabled={districtRunning}
            onClick={() => void onQueueAll()}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            1. Kuyruğa Al
          </ButtonPrimary>
          {!districtRunning ? (
            <>
              <button
                type="button"
                onClick={() => void onStartProcessing({ untilDone: false })}
                className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                2a. Tek adım
              </button>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={districtBatchCount}
                  onChange={(e) => setDistrictBatchCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 rounded-xl border border-neutral-200 bg-neutral-50 px-2 py-2 text-center text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => void onStartProcessing({ untilDone: true, maxItems: districtBatchCount })}
                  className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200"
                >
                  2b. {districtBatchCount} ilçe işle
                </button>
              </div>
              <ButtonPrimary
                type="button"
                onClick={() => void onStartProcessing({ untilDone: true })}
                className="bg-emerald-700 hover:bg-emerald-800"
              >
                2c. Bitene kadar sürdür
              </ButtonPrimary>
            </>
          ) : (
            <button
              type="button"
              onClick={() => { districtStopRef.current = true }}
              className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300"
            >
              ⏹ Durdur
            </button>
          )}
          <button
            type="button"
            onClick={() => void loadDistrictStats({ clearErrOnSuccess: true })}
            className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
          >
            <RefreshCw className="h-4 w-4" />
            İstatistik Yenile
          </button>
          <button
            type="button"
            onClick={() => void onResetStuck()}
            disabled={resetBusy}
            title="running durumunda takılı kalan işleri sıfırlar"
            className="inline-flex items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100 disabled:opacity-60 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-300"
          >
            <RefreshCw className={`h-4 w-4 ${resetBusy ? 'animate-spin' : ''}`} />
            Takılı İşleri Sıfırla
          </button>
        </div>
        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
          Tek adım: yalnızca bir kuyruk işlemi dener. N ilçe işle: belirlenen sayıya ulaşınca otomatik durur. Bitene kadar sürdür: kuyruk boşalana veya «Durdur»a basana dek çalışır. «Takılı İşleri Sıfırla»: sunucu yeniden başlatmadan kalan &ldquo;running&rdquo; işleri pending/failed&apos;a çeker.
        </p>

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
              <span className="mt-1 block text-xs text-neutral-400">
                <strong>Favori mekan blogları</strong> (`place_blog_writer`), lokasyonun{' '}
                <code className="rounded bg-violet-50 px-1 font-mono dark:bg-violet-950/40">travel_ideas_json</code>{' '}
                içindeki mekanları kaynak alır; önce gezi fikirleri + mümkünse Google Maps adımını tamamlayın.
              </span>
              <span className="mt-1 block text-xs text-neutral-400">
                Süre tek kaynak:{' '}
                <a
                  href={`${vitrinPath('/manage/admin/settings')}?tab=ai`}
                  className="font-medium text-violet-600 underline hover:no-underline dark:text-violet-400"
                >
                  Ayarlar → Genel → Yapay zeka
                </a>
                . Her yeni yazı isteğinde bu süre yeniden uygulanır (tarayıcı + API).
              </span>
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
            <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              Mekan adayı: <strong>{regionContentStats.place_blog_candidates}</strong>
            </span>
            <span className="rounded-full bg-pink-100 px-3 py-1 text-pink-800 dark:bg-pink-950/40 dark:text-pink-300">
              Mekan blog: <strong>{regionContentStats.generated_place_blog_posts}</strong>
            </span>
            {Object.entries(regionContentStats.batches).map(([status, cnt]) => (
              <span key={`region-${status}`} className={clsx('rounded-full px-3 py-1', jobStatusBadge(status))}>
                bölge {status}: <strong>{cnt}</strong>
              </span>
            ))}
            {Object.entries(regionContentStats.place_blog_batches).map(([status, cnt]) => (
              <span key={`place-${status}`} className={clsx('rounded-full px-3 py-1', jobStatusBadge(status))}>
                mekan {status}: <strong>{cnt}</strong>
              </span>
            ))}
          </div>
        ) : null}

        {regionContentStats && ((regionContentStats.batches['failed'] ?? 0) > 0 || (regionContentStats.place_blog_batches['failed'] ?? 0) > 0) ? (
          <div className="mb-3 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-800 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-200">
            {(regionContentStats.batches['failed'] ?? 0) > 0 && (
              <span><strong>{regionContentStats.batches['failed']} başarısız bölge işi</strong> — <strong>1. Bölge İçeriklerini Kuyruğa Al</strong> ile yeniden kuyruğa alın. </span>
            )}
            {(regionContentStats.place_blog_batches['failed'] ?? 0) > 0 && (
              <span><strong>{regionContentStats.place_blog_batches['failed']} başarısız mekan blog işi</strong> — <strong>Mekan Bloglarını Kuyruğa Al</strong> ile yeniden kuyruğa alın.</span>
            )}
          </div>
        ) : null}
        {regionContentErr || placeBlogsErr ? (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {regionContentErr ?? placeBlogsErr}
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
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Paralel işçi
            </label>
            <select
              value={contentWorkerCount}
              disabled={regionContentRunning || placeBlogsRunning}
              onChange={(e) => setContentWorkerCount(Number(e.target.value) || 1)}
              className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
            >
              <option value={1}>1 işçi</option>
              <option value={2}>2 işçi</option>
              <option value={3}>3 işçi</option>
              <option value={5}>5 işçi</option>
            </select>
          </div>
          <ButtonPrimary
            type="button"
            disabled={regionContentRunning || placeBlogsRunning}
            onClick={() => void onQueueAllRegionContent()}
            className="bg-violet-600 hover:bg-violet-700"
          >
            1. Bölge İçeriklerini Kuyruğa Al
          </ButtonPrimary>
          {!regionContentRunning ? (
            <>
              <button
                type="button"
                disabled={placeBlogsRunning}
                onClick={() => void onStartRegionContentProcessing({ untilDone: false })}
                className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                2a. Tek dalga
              </button>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={regionBatchCount}
                  disabled={placeBlogsRunning}
                  onChange={(e) => setRegionBatchCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 rounded-xl border border-neutral-200 bg-neutral-50 px-2 py-2 text-center text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                />
                <button
                  type="button"
                  disabled={placeBlogsRunning}
                  onClick={() => void onStartRegionContentProcessing({ untilDone: true, maxItems: regionBatchCount })}
                  className="rounded-xl border border-violet-300 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-800 hover:bg-violet-100 disabled:opacity-50 dark:border-violet-700 dark:bg-violet-950/30 dark:text-violet-200"
                >
                  2b. {regionBatchCount} bölge işle
                </button>
              </div>
              <ButtonPrimary
                type="button"
                disabled={placeBlogsRunning}
                onClick={() => void onStartRegionContentProcessing({ untilDone: true })}
              >
                2c. Bitene kadar sürdür
              </ButtonPrimary>
            </>
          ) : (
            <button
              type="button"
              onClick={() => { regionContentStopRef.current = true }}
              className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300"
            >
              ⏹ Durdur
            </button>
          )}
          <ButtonPrimary
            type="button"
            disabled={regionContentRunning || placeBlogsRunning}
            onClick={() => void onQueueAllPlaceBlogs()}
            className="bg-pink-600 hover:bg-pink-700"
          >
            Mekan Bloglarını Kuyruğa Al
          </ButtonPrimary>
          {!placeBlogsRunning ? (
            <>
              <button
                type="button"
                disabled={regionContentRunning}
                onClick={() => void onStartPlaceBlogsProcessing({ untilDone: false })}
                className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                Tek dalga
              </button>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={placesBatchCount}
                  disabled={regionContentRunning}
                  onChange={(e) => setPlacesBatchCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 rounded-xl border border-neutral-200 bg-neutral-50 px-2 py-2 text-center text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-pink-500 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                />
                <button
                  type="button"
                  disabled={regionContentRunning}
                  onClick={() => void onStartPlaceBlogsProcessing({ untilDone: true, maxItems: placesBatchCount })}
                  className="rounded-xl border border-pink-300 bg-pink-50 px-4 py-2 text-sm font-medium text-pink-800 hover:bg-pink-100 disabled:opacity-50 dark:border-pink-700 dark:bg-pink-950/30 dark:text-pink-200"
                >
                  {placesBatchCount} blog işle
                </button>
              </div>
              <ButtonPrimary
                type="button"
                disabled={regionContentRunning}
                onClick={() => void onStartPlaceBlogsProcessing({ untilDone: true })}
              >
                Bitene kadar sürdür
              </ButtonPrimary>
            </>
          ) : (
            <button
              type="button"
              onClick={() => { placeBlogsStopRef.current = true }}
              className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300"
            >
              ⏹ Mekan Bloglarını Durdur
            </button>
          )}
          <button
            type="button"
            onClick={() => void loadRegionContentStats({ clearErrOnSuccess: true })}
            className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
          >
            <RefreshCw className="h-4 w-4" />
            İstatistik Yenile
          </button>
        </div>
        <p className="mb-4 text-xs text-neutral-500 dark:text-neutral-400">
          Paralel işçi sayısına göre «Tek dalga»: her işçi bir kez iş alır; «N bölge/blog işle»: belirlenen sayıya ulaşınca durur; «Bitene kadar sürdür»: kuyruk boşalana dek döner.
        </p>

        {opsLog.length > 0 ? (
          <div className="mb-4 max-h-40 overflow-y-auto rounded-xl border border-violet-100 bg-violet-50/60 p-3 dark:border-violet-900/60 dark:bg-violet-950/20">
            <p className="mb-2 text-xs font-semibold text-violet-900 dark:text-violet-200">Birleşik üretim logu</p>
            <ul className="space-y-0.5 font-mono text-[11px] text-neutral-600 dark:text-neutral-400">
              {opsLog.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {regionContentLog.length > 0 ? (
          <div className="mt-4 max-h-48 overflow-y-auto rounded-xl border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-950/40">
            <p className="mb-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300">Bölge içerik logu</p>
            <ul className="space-y-0.5 font-mono text-[11px] text-neutral-600 dark:text-neutral-400">
              {regionContentLog.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {placeBlogsLog.length > 0 ? (
          <div className="mt-4 max-h-48 overflow-y-auto rounded-xl border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-950/40">
            <p className="mb-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300">Favori mekan blog logu</p>
            <ul className="space-y-0.5 font-mono text-[11px] text-neutral-600 dark:text-neutral-400">
              {placeBlogsLog.map((line, i) => (
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
              Google Places API ile her ilçe için gerçek turistik mekan verisi çeker ve{' '}
              <code className="rounded bg-neutral-100 px-1 font-mono text-xs dark:bg-neutral-800">travel_ideas_json</code>{' '}
              alanına yazar. İsteğe bağlı olarak aynı koordinatlarla gezi fikirleri altındaki{' '}
              <strong>yakın mekan vitrin</strong> için{' '}
              <code className="rounded bg-neutral-100 px-1 font-mono text-xs dark:bg-neutral-800">region-places</code>{' '}
              dosyası da güncellenir (plaj, ulaşım, market… + kuş uçuşu mesafe).
              İçeriği olmayan ilçeleri sırayla işler.
            </p>
          </div>
        </div>

        {mapsErr ? (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {mapsErr}
          </div>
        ) : null}

        <div className="mb-4 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700 dark:border-neutral-700 dark:bg-neutral-950/40 dark:text-neutral-300">
          {mapsApiKey.trim() ? (
            <span>Google Maps anahtarı Ayarlar → Google sekmesinden okunuyor.</span>
          ) : (
            <span>
              Google Maps anahtarı eksik. Yönetim → Ayarlar → Google sekmesinden kaydedin.
            </span>
          )}
        </div>

        <label className="mb-4 flex cursor-pointer items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300">
          <input
            type="checkbox"
            className="mt-1 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-900"
            checked={mapsAlsoWriteRegionPlaces}
            onChange={(e) => setMapsAlsoWriteRegionPlaces(e.target.checked)}
            disabled={mapsRunning}
          />
          <span>
            Koordinat bilinen ilçelerde vitrin dosyasını da yaz:{' '}
            <code className="rounded bg-neutral-100 px-1 font-mono text-xs dark:bg-neutral-800">public/region-places/</code>{' '}
            (varsayılan şablon satırları; Google türleri ile mekan + mesafe).
          </span>
        </label>

        <div className="flex flex-wrap items-center gap-3">
          {!mapsRunning ? (
            <>
              <button
                type="button"
                onClick={() => void onStartMapsProcessing({ untilDone: false })}
                className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                Tek ilçe
              </button>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={mapsBatchCount}
                  onChange={(e) => setMapsBatchCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 rounded-xl border border-neutral-200 bg-neutral-50 px-2 py-2 text-center text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => void onStartMapsProcessing({ untilDone: true, maxItems: mapsBatchCount })}
                  className="rounded-xl border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-800 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-950/30 dark:text-blue-200"
                >
                  {mapsBatchCount} ilçe işle
                </button>
              </div>
              <ButtonPrimary
                type="button"
                onClick={() => void onStartMapsProcessing({ untilDone: true })}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Bitene kadar sürdür
              </ButtonPrimary>
            </>
          ) : (
            <button
              type="button"
              onClick={() => { mapsStopRef.current = true }}
              className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300"
            >
              ⏹ Durdur
            </button>
          )}
          {mapsRunning ? (
            <span className="inline-flex items-center gap-2 text-sm text-neutral-500">
              <RefreshCw className="h-4 w-4 animate-spin" />
              İşleniyor…
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
          Tek ilçe: sıradaki kaydı bir kez işler. N ilçe işle: belirlenen sayıya ulaşınca otomatik durur (Google kota koruması). Bitene kadar sürdür: içeriksiz ilçe kalmayıncaya dek devam eder.
        </p>

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
                onChange={(e) =>
                  setPexelsApiKeys((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))
                }
                placeholder={`Pexels API key ${i + 1}...`}
                className="flex-1 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 font-mono text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-pink-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                disabled={pexelsRunning || pexelsKeysSaving}
              />
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void savePexelsKeysToDb()}
            disabled={pexelsRunning || pexelsKeysSaving}
            className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50 disabled:opacity-60 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            {pexelsKeysSaving ? 'Kaydediliyor…' : pexelsKeysSaved ? 'Kaydedildi' : 'Keyleri Kaydet'}
          </button>
          {!pexelsRunning ? (
            <>
              <button
                type="button"
                onClick={() => void onStartPexelsProcessing({ untilDone: false })}
                className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                Tek lokasyon
              </button>
              <ButtonPrimary
                type="button"
                onClick={() => void onStartPexelsProcessing({ untilDone: true })}
                className="bg-pink-600 hover:bg-pink-700"
              >
                Bitene kadar sürdür
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
                      void onStartPexelsProcessing({ untilDone: true })
                    } catch (e) {
                      setPexelsErr(formatManageApiCatch(e, 'reset_failed'))
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
        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
          Tek lokasyon: sıradaki kapaksız kayıt için bir deneme. Bitene kadar sürdür: tüm sıra işlenene veya «Durdur»a basılana dek devam eder (saatlik Pexels kota).
        </p>

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

      {/* ── Servis Mekan Koordinatları (İlçe Bazlı, 287) ───────────────── */}
      <div className="mt-10 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/40">
        <h2 className="flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-white">
          <MapPin className="h-4 w-4 text-emerald-500" />
          Servis Mekan Koordinatları — İlçe Bazlı Toplu Çekme
        </h2>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Her ilçe için aşağıdaki &quot;Mesafe Türleri&quot;nden birer mekanın koordinatını Google Places&apos;ten alıp
          ilçeye kaydeder. İlan sayfasında ilan ile mekan arasındaki mesafe Haversine ile ücretsiz hesaplanır
          (Google API artık her ilan için çağrılmaz).
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">Max ilçe sayısı (0 = sınırsız)</label>
            <input
              type="number"
              min={0}
              value={svcPoisBatchCount}
              onChange={(e) => setSvcPoisBatchCount(Number(e.target.value))}
              disabled={svcPoisRunning}
              className="mt-1 w-28 rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </div>
          {!svcPoisRunning ? (
            <button
              type="button"
              onClick={() => void onStartSvcPois()}
              disabled={!mapsApiKey.trim()}
              className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Başlat
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { svcPoisStopRef.current = true }}
              className="rounded-xl bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Durdur
            </button>
          )}
          {svcPoisProcessed > 0 && (
            <span className="text-sm text-neutral-500">{svcPoisProcessed} ilçe işlendi</span>
          )}
          {!mapsApiKey.trim() && (
            <span className="text-xs text-red-500">
              ⚠ Google Maps API anahtarı Yönetim → Ayarlar → Google sekmesinden kaydedilmeli.
            </span>
          )}
        </div>
        {svcPoisErr && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/20 dark:text-red-300">{svcPoisErr}</p>
        )}
        {svcPoisLog.length > 0 && (
          <div className="mt-4 max-h-52 overflow-y-auto rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-950">
            {svcPoisLog.map((line, i) => (
              <p key={i} className="text-[11px] leading-5 text-neutral-600 dark:text-neutral-400">{line}</p>
            ))}
          </div>
        )}
      </div>

      {/* ── Mesafe Türleri Yapılandırması ───────────────────────────────── */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
          Mesafe Türleri Yapılandırması
        </h2>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          İlan sayfasında &quot;Mesafeler&quot; bölümünde hangi POI tiplerinin gösterileceğini yönetin.
          Kategori: <strong>amenity</strong> → Temel İhtiyaçlar, <strong>transport</strong> → Ulaşım.
        </p>

        <div className="mt-4 space-y-2">
          {servicePoiTypes.map((def, i) => (
            <div
              key={def.type + i}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-900/40"
            >
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${def.category === 'transport' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'}`}>
                {def.category}
              </span>
              <input
                className="w-28 rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900"
                value={def.label}
                onChange={(e) => {
                  const next = [...servicePoiTypes]
                  next[i] = { ...next[i], label: e.target.value }
                  setServicePoiTypes(next)
                }}
                placeholder="Etiket"
              />
              <input
                className="w-40 rounded-lg border border-neutral-300 bg-white px-2 py-1 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-900"
                value={def.googleType}
                onChange={(e) => {
                  const next = [...servicePoiTypes]
                  next[i] = { ...next[i], googleType: e.target.value }
                  setServicePoiTypes(next)
                }}
                placeholder="Google Places tipi"
              />
              <input
                type="number"
                className="w-24 rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900"
                value={def.radius}
                onChange={(e) => {
                  const next = [...servicePoiTypes]
                  next[i] = { ...next[i], radius: Number(e.target.value) }
                  setServicePoiTypes(next)
                }}
                placeholder="Yarıçap (m)"
              />
              <select
                className="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900"
                value={def.category}
                onChange={(e) => {
                  const next = [...servicePoiTypes]
                  next[i] = { ...next[i], category: e.target.value as 'amenity' | 'transport' }
                  setServicePoiTypes(next)
                }}
              >
                <option value="amenity">amenity</option>
                <option value="transport">transport</option>
              </select>
              <div className="ml-auto flex items-center gap-1">
                <button type="button" onClick={() => { const n=[...servicePoiTypes]; if(i>0){[n[i-1],n[i]]=[n[i],n[i-1]]; setServicePoiTypes(n)} }} disabled={i===0} className="rounded px-1 text-neutral-400 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800">▲</button>
                <button type="button" onClick={() => { const n=[...servicePoiTypes]; if(i<n.length-1){[n[i],n[i+1]]=[n[i+1],n[i]]; setServicePoiTypes(n)} }} disabled={i===servicePoiTypes.length-1} className="rounded px-1 text-neutral-400 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800">▼</button>
                <button type="button" onClick={() => setServicePoiTypes(servicePoiTypes.filter((_,j)=>j!==i))} className="rounded px-1 text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30">✕</button>
              </div>
            </div>
          ))}
        </div>

        {/* Yeni tip ekle */}
        <div className="mt-3 flex flex-wrap gap-2 rounded-xl border border-dashed border-neutral-300 p-3 dark:border-neutral-700">
          <input
            className="w-28 rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900"
            value={newServicePoiDef.label}
            onChange={(e) => setNewServicePoiDef({ ...newServicePoiDef, label: e.target.value, type: e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') })}
            placeholder="Etiket"
          />
          <input
            className="w-40 rounded-lg border border-neutral-300 bg-white px-2 py-1 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-900"
            value={newServicePoiDef.googleType}
            onChange={(e) => setNewServicePoiDef({ ...newServicePoiDef, googleType: e.target.value })}
            placeholder="Google Places tipi"
          />
          <input
            type="number"
            className="w-24 rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900"
            value={newServicePoiDef.radius}
            onChange={(e) => setNewServicePoiDef({ ...newServicePoiDef, radius: Number(e.target.value) })}
            placeholder="Yarıçap (m)"
          />
          <select
            className="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900"
            value={newServicePoiDef.category}
            onChange={(e) => setNewServicePoiDef({ ...newServicePoiDef, category: e.target.value as 'amenity' | 'transport' })}
          >
            <option value="amenity">amenity</option>
            <option value="transport">transport</option>
          </select>
          <button
            type="button"
            disabled={!newServicePoiDef.label.trim() || !newServicePoiDef.googleType.trim()}
            onClick={() => {
              setServicePoiTypes([...servicePoiTypes, newServicePoiDef])
              setNewServicePoiDef({ type: '', label: '', googleType: '', radius: 10000, category: 'amenity' })
            }}
            className="rounded-lg bg-neutral-800 px-3 py-1 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-40 dark:bg-neutral-200 dark:text-neutral-900"
          >
            + Ekle
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={servicePoiSaving}
            onClick={async () => {
              const token = getStoredAuthToken()
              if (!token) return
              setServicePoiSaving(true)
              try {
                await upsertSiteSetting(token, { key: 'service_poi_types', value_json: JSON.stringify(servicePoiTypes) })
                setServicePoiSaved(true)
                setTimeout(() => setServicePoiSaved(false), 2000)
              } finally {
                setServicePoiSaving(false)
              }
            }}
            className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {servicePoiSaving ? 'Kaydediliyor…' : servicePoiSaved ? '✓ Kaydedildi' : 'Ayarları Kaydet'}
          </button>
          <button
            type="button"
            onClick={() => setServicePoiTypes(DEFAULT_SERVICE_POI_TYPES)}
            className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Varsayılana Dön
          </button>
        </div>
        <p className="mt-2 text-xs text-neutral-400">
          Kaydettikten sonra yukarıdaki &quot;Servis Mekan Koordinatları&quot; batch ile ilçe verilerini yeniden çekin.
        </p>
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
