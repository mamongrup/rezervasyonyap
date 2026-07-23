'use client'

import { getStoredAuthToken } from '@/lib/auth-storage'
import { getAiControlCenterOverview, type AiControlCenterOverview } from '@/lib/travel-api'
import {
  Activity,
  AlertTriangle,
  Brain,
  CircleDollarSign,
  Database,
  HeartPulse,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'
import type { ElementType } from 'react'
import { useCallback, useEffect, useState } from 'react'

const healthLabels: Record<string, string> = {
  healthy: 'Sağlıklı',
  idle: 'Hazır',
  degraded: 'Kontrol ediliyor',
  half_open: 'Deneme çalışması',
  quarantined: 'Karantinada',
  paused: 'Duraklatıldı',
}

function healthClass(status: string) {
  if (status === 'healthy') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
  if (status === 'degraded' || status === 'half_open') return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
  if (status === 'quarantined') return 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
  return 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
}

export default function AiControlCenterClient() {
  const [data, setData] = useState<AiControlCenterOverview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) return
    setLoading(true)
    try {
      setData(await getAiControlCenterOverview(token))
      setError(null)
    } catch {
      setError('AI kontrol merkezi yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const cards: Array<[string, string | number, ElementType]> = data ? [
    ['Kuyruk', data.counts.queued + data.counts.running, Activity],
    ['Onay', data.counts.awaiting_approval, ShieldCheck],
    ['Kalite', Number(data.quality.average_7d).toFixed(1), Brain],
    ['Bilgi kaynağı', data.counts.knowledge_sources, Database],
    ['30 günlük maliyet', `$${Number(data.cost.usd_30d).toFixed(2)}`, CircleDollarSign],
    ['Açık olay', data.supervisor.open_incidents, AlertTriangle],
    ['Karantina', data.supervisor.quarantined_agents, HeartPulse],
  ] : []

  return <div className="p-6 lg:p-8">
    <div className="mb-6 flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">AI işletim sistemi</p>
        <h1 className="mt-1 text-2xl font-bold">Kontrol Merkezi</h1>
        <p className="mt-1 text-sm text-neutral-500">Operasyon amiri, ajan sağlığı, kalite, maliyet ve istisnalar.</p>
      </div>
      <button onClick={() => void load()} className="flex items-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-sm font-semibold text-white">
        <RefreshCw className={loading ? 'size-4 animate-spin' : 'size-4'} />Yenile
      </button>
    </div>

    {error ? <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
    {data ? <>
      <div className={`mb-4 rounded-2xl border p-4 ${data.autopilot.enabled ? 'border-violet-200 bg-violet-50 dark:bg-violet-950/20' : 'border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900'}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold">
              Autopilot {data.autopilot.enabled ? 'aktif' : 'kapalı'}
            </p>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
              Eksik işleri kendisi bulur, uzmanlara dağıtır ve doğrulanmış düşük riskli içeriği otomatik uygular.
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${data.autopilot.enabled ? 'bg-violet-600 text-white' : 'bg-neutral-200 text-neutral-600'}`}>
            {data.autopilot.auto_apply_verified_content ? 'Güvenli otomatik uygulama' : 'Yalnızca taslak'}
          </span>
        </div>
        <p className="mt-3 text-xs text-neutral-500">
          Son tur: {data.autopilot.last_tick_at ? new Date(data.autopilot.last_tick_at).toLocaleString('tr-TR') : 'Henüz çalışmadı'}
          {' · '}Bulunan: {data.autopilot.last_result.discovered ?? 0}
          {' · '}Uygulanan: {data.autopilot.last_result.auto_applied ?? 0}
        </p>
        {data.autopilot.last_result.error ? <p className="mt-2 text-xs font-medium text-red-600">{data.autopilot.last_result.error}</p> : null}
      </div>

      <div className={`mb-4 rounded-2xl border p-4 ${data.supervisor.requires_attention ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/20' : 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20'}`}>
        <p className="font-semibold">{data.supervisor.requires_attention ? 'Operasyon amiri müdahale bekliyor' : 'Operasyon amiri: sistem normal çalışıyor'}</p>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{data.supervisor.degraded_agents} ajan izleniyor, {data.supervisor.critical_incidents} kritik olay var.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
        {cards.map(([label, value, Icon]) => <div key={label} className="rounded-2xl border bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <Icon className="size-5 text-violet-600" /><p className="mt-3 text-2xl font-bold">{value}</p><p className="text-xs text-neutral-500">{label}</p>
        </div>)}
      </div>

      {data.incidents.length ? <section className="mt-6 rounded-2xl border border-amber-200 bg-white p-5 dark:border-amber-900 dark:bg-neutral-900">
        <h2 className="font-semibold">Operasyon olayları</h2>
        <div className="mt-3 space-y-2">{data.incidents.map(i => <div key={i.id} className="rounded-xl border p-3 dark:border-neutral-800">
          <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">{i.title}</p><span className="text-xs text-neutral-500">{i.occurrence_count} kez</span></div>
          <p className="mt-1 line-clamp-2 text-xs text-neutral-500">{i.last_error}</p>
        </div>)}</div>
      </section> : null}

      <section className="mt-6 rounded-2xl border bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="font-semibold">AI kadrosu</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{data.agents.map(a => <div key={a.code} className="rounded-xl border p-3 dark:border-neutral-800">
          <div className="flex items-start justify-between gap-2"><p className="text-sm font-semibold">{a.display_name}</p><span className={`rounded-full px-2 py-1 text-[11px] font-medium ${healthClass(a.health_status)}`}>{healthLabels[a.health_status] ?? a.health_status}</span></div>
          <p className="mt-2 text-xs text-neutral-500">24s: {a.succeeded_24h} başarılı · {a.failed_24h} hata</p>
          <p className="mt-1 text-xs text-neutral-500">Kalite: {Number(a.quality_7d).toFixed(1)} · 30g: ${Number(a.cost_30d).toFixed(3)}</p>
          {a.consecutive_failures > 0 ? <p className="mt-1 text-xs text-amber-600">Ardışık hata: {a.consecutive_failures}</p> : null}
        </div>)}</div>
      </section>
    </> : loading ? <p className="py-20 text-center text-neutral-400">Yükleniyor…</p> : null}
  </div>
}
