'use client'

import { getAiJob, listAiFeatureProfiles, listAiJobs, listAiProviders } from '@/lib/travel-api'
import { getStoredAuthToken } from '@/lib/auth-storage'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import clsx from 'clsx'
import { Activity, Bot, Cpu, Info, Layers, RefreshCw, Search } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'

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
  }, [refresh])

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
