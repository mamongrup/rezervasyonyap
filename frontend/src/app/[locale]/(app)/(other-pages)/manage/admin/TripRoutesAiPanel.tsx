'use client'

import {
  getTripRoutesStats,
  processNextTripRoute,
  queueAllTripRoutes,
  resetStuckTripRouteJobs,
  type AiTripRoutesProfile,
  type TripRoutesStats,
} from '@/lib/travel-api'
import { timeoutMsForProfile } from '@/lib/ai-upstream-timeouts'
import { formatManageApiCatch } from '@/lib/manage-api-error-tr'
import { getStoredAuthToken } from '@/lib/auth-storage'
import { parseLenientJson } from '@/lib/json-parse'
import { listSiteSettings } from '@/lib/travel-api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import clsx from 'clsx'
import { RefreshCw, Route } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

function jobStatusBadge(status: string) {
  const s = status.toLowerCase()
  if (s === 'succeeded' || s === 'done' || s === 'success')
    return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
  if (s === 'failed' || s === 'error')
    return 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300'
  if (s === 'queued' || s === 'running' || s === 'pending')
    return 'bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200'
  return 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
}

async function fetchAiSettingsSnapshot(): Promise<Record<string, unknown>> {
  const token = getStoredAuthToken()
  if (!token) return {}
  try {
    const raw = await listSiteSettings(token, { scope: 'platform', key: 'ai' }).then(
      (r) => r.settings?.[0]?.value_json ?? '',
    )
    return raw?.trim() ? (parseLenientJson(raw) as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

type Props = {
  profile: AiTripRoutesProfile
  title: string
  description: string
  accent: 'emerald' | 'sky'
}

export default function TripRoutesAiPanel({ profile, title, description, accent }: Props) {
  const [stats, setStats] = useState<TripRoutesStats | null>(null)
  const [running, setRunning] = useState(false)
  const [log, setLog] = useState<string[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [batchCount, setBatchCount] = useState(10)
  const [resetBusy, setResetBusy] = useState(false)
  const stopRef = useRef(false)

  const loadStats = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) return
    try {
      const s = await getTripRoutesStats(token, profile)
      setStats(s)
      setErr(null)
    } catch (e) {
      setErr(formatManageApiCatch(e, 'trip_routes_stats_failed'))
    }
  }, [profile])

  useEffect(() => {
    void loadStats()
  }, [loadStats])

  async function onQueue() {
    const token = getStoredAuthToken()
    if (!token) return
    setErr(null)
    try {
      const r = await queueAllTripRoutes(token, profile)
      if (r.message === 'no_locations_need_routes' || (r.queued === 0 && r.total_found === 0)) {
        setLog((l) => [...l, 'Kuyruğa eklenecek bölge yok (rota alanı boş ve bekleyen iş yok).'])
      } else {
        setLog((l) => [...l, `${r.queued} bölge kuyruğa alındı (aday: ${r.total_found}).`])
      }
      await loadStats()
    } catch (e) {
      setErr(formatManageApiCatch(e, 'trip_routes_queue_failed'))
    }
  }

  async function onProcess(opts: { untilDone: boolean; maxItems?: number }) {
    const token = getStoredAuthToken()
    if (!token) return
    stopRef.current = false
    setRunning(true)
    setErr(null)
    let processed = 0
    const limit = opts.maxItems ?? (opts.untilDone ? 0 : 1)
    const timeoutProfile = profile === 'trip_planner' ? 'trip_planner' : 'blue_cruise_routes'
    try {
      while (!stopRef.current) {
        if (limit > 0 && processed >= limit) break
        const snap = await fetchAiSettingsSnapshot()
        const ms = timeoutMsForProfile(snap, timeoutProfile)
        const r = await processNextTripRoute(token, profile, { upstreamTimeoutMs: ms })
        if (r.done) {
          setLog((l) => [...l, 'Kuyruk tamamlandı.'])
          break
        }
        processed++
        setLog((l) => [
          ...l,
          `#${processed}${limit > 0 ? `/${limit}` : ''} – ${r.routes_stored ? '✓' : '⚠'} ${r.location_page_id?.slice(0, 8) ?? ''}…`,
        ])
        if (processed % 5 === 0) await loadStats()
        await new Promise((res) => setTimeout(res, 800))
      }
    } catch (e) {
      setErr(formatManageApiCatch(e, 'trip_routes_process_failed'))
    } finally {
      setRunning(false)
      await loadStats()
    }
  }

  async function onResetStuck() {
    const token = getStoredAuthToken()
    if (!token) return
    setResetBusy(true)
    try {
      const r = await resetStuckTripRouteJobs(token, profile)
      setLog((l) => [...l, `Takılı iş sıfırlandı: ${r.reset}`])
      await loadStats()
    } catch (e) {
      setErr(formatManageApiCatch(e, 'trip_routes_reset_failed'))
    } finally {
      setResetBusy(false)
    }
  }

  const emptyCount = stats?.locations_routes_empty ?? 0
  const jobEntries = Object.entries(stats?.jobs ?? {})
  const border =
    accent === 'sky'
      ? 'border-sky-200 dark:border-sky-900'
      : 'border-teal-200 dark:border-teal-900'
  const iconBg =
    accent === 'sky'
      ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200'
      : 'bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-200'
  const btn =
    accent === 'sky'
      ? 'bg-sky-600 hover:bg-sky-700'
      : 'bg-teal-600 hover:bg-teal-700'

  return (
    <div className={clsx('rounded-2xl border bg-white p-6 shadow-sm dark:bg-neutral-900/40', border)}>
      <div className="mb-4 flex flex-wrap items-start gap-3">
        <div className={clsx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', iconBg)}>
          <Route className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-white">{title}</h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
        </div>
      </div>

      {stats ? (
        <div className="mb-4 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-neutral-100 px-3 py-1 dark:bg-neutral-800">
            Toplam: <strong>{stats.total_locations}</strong>
          </span>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            Rota var: <strong>{stats.locations_with_routes}</strong>
          </span>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            Boş: <strong>{emptyCount}</strong>
          </span>
          {jobEntries.map(([status, cnt]) => (
            <span key={status} className={clsx('rounded-full px-3 py-1', jobStatusBadge(status))}>
              {status}: <strong>{cnt}</strong>
            </span>
          ))}
        </div>
      ) : null}

      {err ? (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {err}
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <ButtonPrimary type="button" disabled={running} onClick={() => void onQueue()} className={btn}>
          1. Kuyruğa Al
        </ButtonPrimary>
        {!running ? (
          <>
            <button
              type="button"
              onClick={() => void onProcess({ untilDone: false })}
              className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-200"
            >
              2a. Tek adım
            </button>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={1}
                max={200}
                value={batchCount}
                onChange={(e) => setBatchCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 rounded-xl border border-neutral-200 bg-neutral-50 px-2 py-2 text-center text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
              <button
                type="button"
                onClick={() => void onProcess({ untilDone: true, maxItems: batchCount })}
                className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-600"
              >
                2b. {batchCount} bölge işle
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => { stopRef.current = true }}
            className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700"
          >
            Durdur
          </button>
        )}
        <button
          type="button"
          onClick={() => void loadStats()}
          className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm"
        >
          <RefreshCw className="h-4 w-4" />
          Yenile
        </button>
        <button
          type="button"
          onClick={() => void onResetStuck()}
          disabled={resetBusy}
          className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700 disabled:opacity-60"
        >
          Takılı işleri sıfırla
        </button>
      </div>

      {log.length > 0 ? (
        <div className="mt-4 max-h-36 overflow-y-auto rounded-xl border bg-neutral-50 p-3 font-mono text-[11px] dark:bg-neutral-950/40">
          {log.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
