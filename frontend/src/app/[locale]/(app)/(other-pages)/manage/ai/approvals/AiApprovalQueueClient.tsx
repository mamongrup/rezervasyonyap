'use client'

import { getStoredAuthToken } from '@/lib/auth-storage'
import { formatManageApiCatch } from '@/lib/manage-api-error-tr'
import { listAgentRecommendations, patchAgentRecommendation, type AgentRecommendation } from '@/lib/travel-api'
import clsx from 'clsx'
import { Check, Clock3, RefreshCw, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return value
  }
}

function riskFromKind(kind: string) {
  if (/payment|invoice|price|refund|contract/i.test(kind)) return 'Yüksek'
  if (/social|email|sms|campaign|popup/i.test(kind)) return 'Orta'
  return 'Düşük'
}

export default function AiApprovalQueueClient() {
  const [items, setItems] = useState<AgentRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  const load = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const response = await listAgentRecommendations(token)
      setItems(response.recommendations)
    } catch (cause) {
      setError(formatManageApiCatch(cause, 'agent_recommendations_load_failed'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const visible = useMemo(
    () => showHistory ? items : items.filter((item) => item.status === 'pending'),
    [items, showHistory],
  )

  async function review(item: AgentRecommendation, status: 'approved' | 'rejected') {
    const token = getStoredAuthToken()
    if (!token) return
    setBusyId(item.id)
    setError(null)
    try {
      await patchAgentRecommendation(token, item.id, status, status === 'approved' ? 'Hızlı onay kuyruğundan onaylandı.' : 'Hızlı onay kuyruğundan reddedildi.')
      await load()
    } catch (cause) {
      setError(formatManageApiCatch(cause, 'agent_recommendation_review_failed'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">İstisna bazlı yönetim</p>
          <h1 className="mt-1 text-2xl font-bold text-neutral-900 dark:text-white">AI Onay Kuyruğu</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-500 dark:text-neutral-400">Yalnızca yayın, müşteri iletişimi, marka etkisi veya yüksek risk taşıyan AI önerileri burada görünür. Rutin taslaklar ekiplerin çalışma alanında kalır.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setShowHistory((value) => !value)} className="rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700">
            {showHistory ? 'Yalnızca bekleyenler' : 'Geçmişi göster'}
          </button>
          <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700">
            <RefreshCw className={clsx('size-4', loading && 'animate-spin')} /> Yenile
          </button>
        </div>
      </div>

      {error ? <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      {loading ? (
        <div className="flex min-h-48 items-center justify-center text-sm text-neutral-400"><RefreshCw className="mr-2 size-4 animate-spin" /> Kuyruk yükleniyor…</div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 px-6 py-16 text-center dark:border-neutral-700">
          <Check className="mx-auto size-8 text-emerald-500" />
          <h2 className="mt-3 font-semibold text-neutral-900 dark:text-white">İncelenecek AI önerisi yok</h2>
          <p className="mt-1 text-sm text-neutral-500">Rutin işler otomatik olarak taslak aşamasında ilerliyor.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((item) => {
            const pending = item.status === 'pending'
            const risk = riskFromKind(item.kind)
            return (
              <article key={item.id} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-800 dark:bg-violet-950/40 dark:text-violet-200">{item.agent_code}</span>
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">{risk} risk</span>
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">{item.status}</span>
                    </div>
                    <h2 className="mt-2 text-base font-semibold text-neutral-900 dark:text-white">{item.title}</h2>
                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{item.reason || 'AI önerisi için gerekçe belirtilmedi.'}</p>
                    <p className="mt-3 inline-flex items-center gap-1 text-xs text-neutral-400"><Clock3 className="size-3.5" /> {formatDate(item.created_at)}</p>
                  </div>
                  {pending ? (
                    <div className="flex shrink-0 gap-2">
                      <button disabled={busyId === item.id} onClick={() => void review(item, 'rejected')} className="inline-flex items-center gap-1 rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-700 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200"><X className="size-4" /> Reddet</button>
                      <button disabled={busyId === item.id} onClick={() => void review(item, 'approved')} className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-emerald-700"><Check className="size-4" /> Onayla</button>
                    </div>
                  ) : null}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
