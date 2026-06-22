'use client'

import React from 'react'
import { Loader2, Play, Clock, CheckCircle2, XCircle, RefreshCw } from 'lucide-react'
import { getStoredAuthToken } from '@/lib/auth-storage'
import { formatManageApiCatch } from '@/lib/manage-api-error-tr'
import { fetchSiteSettingsFromPanel, startAiWorkerBackground, upsertSiteSettingFromPanel } from '@/lib/travel-api'

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

type SyncProvider = 'wtatil' | 'travelrobot' | 'turna' | 'yolcu360'

interface SyncJob {
  id: string
  provider: string
  status: 'pending' | 'running' | 'done' | 'error'
  progress: number
  total: number
  log_tail: string
  error_text: string | null
  started_at: string
  finished_at: string | null
}

interface ImportSchedule {
  wtatil: number[]
  travelrobot: number[]
  turna: number[]
  yolcu360: number[]
}

const PROVIDERS: { key: SyncProvider; label: string; desc: string }[] = [
  { key: 'wtatil', label: 'Wtatil (Tur)', desc: 'Tüm wtatil turlarını günceller / yeni tur ekler' },
  { key: 'travelrobot', label: 'Travelrobot (Tur · Otel · Uçuş)', desc: 'KPlus tur, otel ve uçuş ilanlarını içe aktarır (panel ayarındaki açık modüller)' },
  { key: 'turna', label: 'Turna (Uçak)', desc: 'Turna uçak biletlerini içe aktarır' },
  { key: 'yolcu360', label: 'Yolcu360 (Araç)', desc: 'Yolcu360 araç kiralama ilanlarını içe aktarır' },
]

const EMPTY_SCHEDULE: ImportSchedule = {
  wtatil: [],
  travelrobot: [],
  turna: [],
  yolcu360: [],
}

const SETTINGS_KEY = 'import_schedule'

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('tr-TR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function pct(progress: number, total: number): number {
  if (!total || total <= 0) return progress > 0 ? 100 : 0
  return Math.min(100, Math.round((progress / total) * 100))
}

function parseScheduleHours(raw: string): number[] {
  return raw
    .split(/[,\s]+/)
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n >= 0 && n <= 23)
    .sort((a, b) => a - b)
    .filter((v, i, arr) => arr.indexOf(v) === i)
}

async function fetchJobStatus(provider: string): Promise<SyncJob | null> {
  try {
    const res = await fetch(`/api/manage/sync/${provider}`, { credentials: 'include', cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json() as { job?: SyncJob }
    return data.job ?? null
  } catch {
    return null
  }
}

async function startImport(provider: string): Promise<{ job_id: string } | null> {
  try {
    const res = await fetch(`/api/manage/sync/${provider}`, {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
    })
    if (!res.ok) {
      const e = await res.json().catch(() => ({})) as { error?: string; hint?: string }
      throw new Error(e.hint ?? e.error ?? `HTTP ${res.status}`)
    }
    return await res.json() as { job_id: string }
  } catch (e) {
    throw new Error(formatManageApiCatch(e, 'Import başlatılamadı'))
  }
}

// ──────────────────────────────────────────────────────────
// Per-provider row
// ──────────────────────────────────────────────────────────

interface ProviderRowProps {
  provider: SyncProvider
  label: string
  desc: string
  scheduleHours: number[]
  onScheduleChange: (hours: number[]) => void
  onScheduleSave: () => void
  scheduleSaving: boolean
}

function ProviderRow({ provider, label, desc, scheduleHours, onScheduleChange, onScheduleSave, scheduleSaving }: ProviderRowProps) {
  const [job, setJob] = React.useState<SyncJob | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [running, setRunning] = React.useState(false)
  const [msg, setMsg] = React.useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [hoursInput, setHoursInput] = React.useState(scheduleHours.join(', '))
  const pollRef = React.useRef<ReturnType<typeof setInterval> | null>(null)

  // Zamanlama input'u dışarıdan güncelleme
  React.useEffect(() => {
    setHoursInput(scheduleHours.join(', '))
  }, [scheduleHours])

  // İlk yükleme — son iş durumunu al
  React.useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const j = await fetchJobStatus(provider)
        setJob(j)
        if (j?.status === 'running' || j?.status === 'pending') {
          startPolling()
        }
      } finally {
        setLoading(false)
      }
    }
    void load()
    return () => stopPolling()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider])

  // Zamanlama yalnızca sunucu tarafında (travel-import-scheduler.timer) yönetilir.

  function startPolling() {
    if (pollRef.current) return
    pollRef.current = setInterval(async () => {
      const j = await fetchJobStatus(provider)
      setJob(j)
      if (j?.status === 'done' || j?.status === 'error' || !j) {
        stopPolling()
        setRunning(false)
      }
    }, 3000)
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  async function handleRun() {
    if (running) return
    setMsg(null)
    setRunning(true)
    try {
      const result = await startImport(provider)
      if (result?.job_id) {
        setJob({ id: result.job_id, provider, status: 'pending', progress: 0, total: 0, log_tail: '', error_text: null, started_at: new Date().toISOString(), finished_at: null })
        startPolling()
      }
    } catch (e) {
      setMsg({ type: 'err', text: formatManageApiCatch(e, 'Başlatma hatası') })
      setRunning(false)
    }
  }

  const isRunning = running || job?.status === 'pending' || job?.status === 'running'
  const percentage = job ? pct(job.progress, job.total) : 0
  const logLines = job?.log_tail ? job.log_tail.split('\n').filter(Boolean).slice(-8) : []

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-800/50">
      {/* Başlık + Çalıştır butonu */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-neutral-900 dark:text-white">{label}</h3>
          <p className="text-xs text-neutral-500 mt-0.5">{desc}</p>
        </div>
        <button
          type="button"
          onClick={() => void handleRun()}
          disabled={isRunning || loading}
          className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {isRunning ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Çalışıyor…</>
          ) : (
            <><Play className="h-4 w-4" /> İmport Başlat</>
          )}
        </button>
      </div>

      {/* Son iş bilgisi */}
      {loading && (
        <p className="mt-3 text-xs text-neutral-400 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Durum yükleniyor…</p>
      )}

      {job && !loading && (
        <div className="mt-4 space-y-3">
          {/* Durum satırı */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500">
            <span className="flex items-center gap-1">
              {job.status === 'done' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
              {job.status === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
              {(job.status === 'running' || job.status === 'pending') && <Loader2 className="h-4 w-4 animate-spin text-primary-500" />}
              <span className={
                job.status === 'done' ? 'text-emerald-600 font-medium' :
                job.status === 'error' ? 'text-red-600 font-medium' :
                'text-primary-600 font-medium'
              }>
                {job.status === 'pending' ? 'Hazırlanıyor' : job.status === 'running' ? 'Çalışıyor' : job.status === 'done' ? 'Tamamlandı' : 'Hata'}
              </span>
            </span>
            <span>Başladı: {fmtTime(job.started_at)}</span>
            {job.finished_at && <span>Bitti: {fmtTime(job.finished_at)}</span>}
            {job.total > 0 && <span>{job.progress} / {job.total} kayıt</span>}
          </div>

          {/* İlerleme çubuğu */}
          {(job.status === 'running' || job.status === 'pending' || job.status === 'done') && (
            <div>
              <div className="flex justify-between text-xs text-neutral-400 mb-1">
                <span>İlerleme</span>
                <span>{job.total > 0 ? `%${percentage}` : job.progress > 0 ? `${job.progress} kayıt` : '—'}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-neutral-100 dark:bg-neutral-700 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${job.status === 'done' ? 'bg-emerald-500' : 'bg-primary-500'}`}
                  style={{ width: `${job.total > 0 ? percentage : job.status === 'running' ? 50 : job.status === 'done' ? 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {/* Hata */}
          {job.status === 'error' && job.error_text && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300">
              {job.error_text}
            </p>
          )}

          {/* Log */}
          {logLines.length > 0 && (
            <div className="rounded-lg bg-neutral-50 px-3 py-2 dark:bg-neutral-900/50 max-h-32 overflow-y-auto">
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-neutral-400">Son log</p>
              {logLines.map((line, i) => (
                <p key={i} className="text-[11px] font-mono text-neutral-600 dark:text-neutral-300 leading-relaxed">{line}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {msg && (
        <p className={`mt-3 text-xs rounded-lg px-3 py-2 ${msg.type === 'err' ? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300' : 'bg-emerald-50 text-emerald-700'}`}>
          {msg.text}
        </p>
      )}

      {/* Zamanlayıcı */}
      <div className="mt-4 border-t border-neutral-100 dark:border-neutral-700 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <Clock className="h-4 w-4 text-neutral-400 shrink-0" />
          <label className="text-xs font-medium text-neutral-600 dark:text-neutral-300 shrink-0">Otomatik çalışma saatleri (UTC):</label>
          <input
            type="text"
            value={hoursInput}
            onChange={(e) => {
              setHoursInput(e.target.value)
              onScheduleChange(parseScheduleHours(e.target.value))
            }}
            placeholder="ör. 3, 15 (virgülle ayır)"
            className="flex-1 min-w-[140px] rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
          />
          <button
            type="button"
            onClick={onScheduleSave}
            disabled={scheduleSaving}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-700 disabled:opacity-50"
          >
            {scheduleSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Kaydet
          </button>
        </div>
        {scheduleHours.length > 0 && (
          <p className="mt-1.5 text-[11px] text-neutral-400">
            Saat {scheduleHours.map((h) => `${String(h).padStart(2, '0')}:00`).join(', ')} UTC'de otomatik çalışır (panel açıkken)
          </p>
        )}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Main section
// ──────────────────────────────────────────────────────────

export default function AdminSyncSection() {
  const [schedule, setSchedule] = React.useState<ImportSchedule>(EMPTY_SCHEDULE)
  const [loadingSchedule, setLoadingSchedule] = React.useState(true)
  const [savingSchedule, setSavingSchedule] = React.useState(false)
  const [scheduleMsg, setScheduleMsg] = React.useState<string | null>(null)
  const [aiWorkerRunning, setAiWorkerRunning] = React.useState(false)
  const [aiWorkerMsg, setAiWorkerMsg] = React.useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  React.useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchSiteSettingsFromPanel({ scope: 'platform', key: SETTINGS_KEY })
        const row = Array.isArray(data.settings)
          ? data.settings.find((s) => s.key === SETTINGS_KEY)
          : null
        if (row?.value_json) {
          const v = typeof row.value_json === 'string' ? JSON.parse(row.value_json) : row.value_json
          if (v && typeof v === 'object') {
            setSchedule({ ...EMPTY_SCHEDULE, ...v })
          }
        }
      } catch {
        // schedule yüklenemedi — varsayılan kullanılır
      } finally {
        setLoadingSchedule(false)
      }
    }
    void load()
  }, [])

  const updateSchedule = (provider: SyncProvider, hours: number[]) => {
    setSchedule((prev) => ({ ...prev, [provider]: hours }))
  }

  const saveSchedule = async (provider: SyncProvider) => {
    setSavingSchedule(true)
    setScheduleMsg(null)
    try {
      const updated = { ...schedule }
      await upsertSiteSettingFromPanel({
        key: SETTINGS_KEY,
        value_json: JSON.stringify(updated),
      })
      setScheduleMsg(`${PROVIDERS.find((p) => p.key === provider)?.label ?? provider} zamanlaması kaydedildi.`)
      setTimeout(() => setScheduleMsg(null), 3000)
    } catch (e) {
      setScheduleMsg(formatManageApiCatch(e, 'Zamanlama kaydedilemedi'))
    } finally {
      setSavingSchedule(false)
    }
  }

  const startAiWorker = async () => {
    if (aiWorkerRunning) return
    const token = getStoredAuthToken()
    if (!token) {
      setAiWorkerMsg({ type: 'err', text: 'Oturum bulunamadı. Lütfen tekrar giriş yapın.' })
      return
    }
    setAiWorkerRunning(true)
    setAiWorkerMsg(null)
    try {
      const result = await startAiWorkerBackground(token, {
        steps: 1000,
        delayMs: 20000,
        district: true,
        region: true,
        place: true,
        trip: true,
        blue: true,
      })
      setAiWorkerMsg({
        type: 'ok',
        text:
          result.message ??
          'AI işleri sunucu zamanlayıcısına bırakıldı; paneli kapatsanız da arka planda kontrollü devam eder.',
      })
    } catch (e) {
      setAiWorkerMsg({ type: 'err', text: formatManageApiCatch(e, 'AI işçisi başlatılamadı') })
    } finally {
      setAiWorkerRunning(false)
    }
  }

  if (loadingSchedule) {
    return (
      <div className="flex items-center gap-2 py-4 text-neutral-400 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Zamanlama yükleniyor…
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">İlan Import & Zamanlama</h2>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Her entegrasyon için manuel import başlatın veya otomatik çalışma saatlerini ayarlayın.
          İlerleme çubuğu her 3 saniyede güncellenir.
        </p>
      </div>

      <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-5 shadow-sm dark:border-violet-900/60 dark:bg-violet-950/20">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-neutral-900 dark:text-white">AI içerik işçisi</h3>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
              İlçe gezi fikirleri, bölge tanıtımı, blog yazıları ve rota kuyruklarını arka planda işler.
              Panel veya bağlantı kapansa da sunucuda devam eder.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void startAiWorker()}
            disabled={aiWorkerRunning}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {aiWorkerRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Arka Planda Başlat
          </button>
        </div>
        {aiWorkerMsg ? (
          <p
            className={
              aiWorkerMsg.type === 'ok'
                ? 'mt-3 text-sm text-emerald-700 dark:text-emerald-300'
                : 'mt-3 text-sm text-red-700 dark:text-red-300'
            }
          >
            {aiWorkerMsg.text}
          </p>
        ) : null}
      </div>

      {scheduleMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
          {scheduleMsg}
        </div>
      )}

      {PROVIDERS.map((p) => (
        <ProviderRow
          key={p.key}
          provider={p.key}
          label={p.label}
          desc={p.desc}
          scheduleHours={schedule[p.key] ?? []}
          onScheduleChange={(hours) => updateSchedule(p.key, hours)}
          onScheduleSave={() => void saveSchedule(p.key)}
          scheduleSaving={savingSchedule}
        />
      ))}
    </div>
  )
}
