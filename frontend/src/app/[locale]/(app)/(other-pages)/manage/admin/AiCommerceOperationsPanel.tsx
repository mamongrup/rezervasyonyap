'use client'

import {
  getCommerceAgentOverview,
  runDueCommerceAgents,
  type CommerceAgentOverview,
} from '@/lib/travel-api'
import { formatManageApiError } from '@/lib/manage-api-error-tr'
import { getStoredAuthToken } from '@/lib/auth-storage'
import ButtonPrimary from '@/shared/ButtonPrimary'
import clsx from 'clsx'
import { Bot, Play, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

function jobStatusBadge(status: string) {
  switch (status) {
    case 'succeeded':
    case 'active':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
    case 'failed':
      return 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200'
    case 'queued':
    case 'running':
      return 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200'
    case 'paused':
    case 'disabled':
      return 'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
    default:
      return 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
  }
}

export default function AiCommerceOperationsPanel() {
  const [overview, setOverview] = useState<CommerceAgentOverview | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [runMsg, setRunMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) {
      setErr('Oturum bulunamadı.')
      return
    }
    setErr(null)
    try {
      const data = await getCommerceAgentOverview(token)
      setOverview(data)
    } catch (e) {
      setErr(e instanceof Error ? formatManageApiError(e.message) : formatManageApiError('load_failed'))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleRunDue() {
    const token = getStoredAuthToken()
    if (!token) return
    setBusy(true)
    setRunMsg(null)
    try {
      const r = await runDueCommerceAgents(token)
      setRunMsg(`${r.processed} ticari iş işlendi.`)
      await load()
    } catch (e) {
      setRunMsg(
        e instanceof Error ? formatManageApiError(e.message) : formatManageApiError('run_failed'),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-2xl border border-violet-200 bg-white p-6 shadow-sm dark:border-violet-900/60 dark:bg-neutral-900/40">
      <div className="mb-4 flex flex-wrap items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-200">
          <Bot className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
            Ticari İşletim Merkezi
          </h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Ödeme onaylı rezervasyonlarda concierge planı, ilan sahibi brifingi ve muhasebe özeti üretir.
            İlan sahibi ve muhasebe çıktıları onay kuyruğuna düşer.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <RefreshCw className="h-4 w-4" />
            Yenile
          </button>
          <ButtonPrimary type="button" disabled={busy} onClick={() => void handleRunDue()}>
            <Play className="mr-1.5 inline h-4 w-4" />
            {busy ? 'Çalışıyor…' : 'Kuyruğu işle'}
          </ButtonPrimary>
        </div>
      </div>

      {err ? (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {err}
        </div>
      ) : null}
      {runMsg ? (
        <div className="mb-3 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-900 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-100">
          {runMsg}
        </div>
      ) : null}

      {overview ? (
        <>
          <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {overview.agents.map((agent) => (
              <div
                key={agent.code}
                className="rounded-xl border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-950/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-neutral-900 dark:text-white">
                    {agent.code}
                  </span>
                  <span
                    className={clsx(
                      'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
                      jobStatusBadge(agent.status),
                    )}
                  >
                    {agent.status}
                  </span>
                </div>
                <p className="mt-1 text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  {agent.display_name}
                </p>
                <p className="mt-2 text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                  {agent.description}
                </p>
                <p className="mt-2 text-[10px] text-neutral-400">
                  Mod: <strong>{agent.mode}</strong> · Risk: <strong>{agent.risk_level}</strong>
                </p>
              </div>
            ))}
          </div>

          {overview.recommendation_counts.length > 0 ? (
            <p className="mb-3 text-xs text-neutral-500">
              Onay kuyruğu:{' '}
              {overview.recommendation_counts
                .map((c) => `${c.status}: ${c.count}`)
                .join(' · ')}
              {' '}
              (Agent Merkezi → Öneriler)
            </p>
          ) : null}

          <div className="rounded-xl border border-neutral-100 dark:border-neutral-800">
            <p className="border-b border-neutral-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:border-neutral-800">
              Son ticari AI işleri
            </p>
            <ul className="max-h-48 divide-y divide-neutral-100 overflow-y-auto dark:divide-neutral-800">
              {overview.recent_jobs.length === 0 ? (
                <li className="px-3 py-4 text-sm text-neutral-400">Henüz iş yok.</li>
              ) : (
                overview.recent_jobs.map((j) => (
                  <li
                    key={j.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs"
                  >
                    <span className="font-mono text-neutral-500">{j.profile_code}</span>
                    <span
                      className={clsx(
                        'rounded-full px-2 py-0.5 font-semibold uppercase',
                        jobStatusBadge(j.status),
                      )}
                    >
                      {j.status}
                    </span>
                    <span className="text-neutral-400">{j.created_at.slice(0, 16)}</span>
                    {j.error ? (
                      <span className="w-full text-red-600 dark:text-red-400">{j.error}</span>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          </div>
        </>
      ) : (
        <p className="text-sm text-neutral-400">Yükleniyor…</p>
      )}
    </div>
  )
}
