'use client'

import {
  listEmailTemplates,
  listNotificationJobs,
  listNotificationTriggers,
  queueNotificationJob,
  type EmailTemplate,
  type NotificationJob,
  type NotificationTrigger,
} from '@/lib/travel-api'
import { getStoredAuthToken } from '@/lib/auth-storage'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import clsx from 'clsx'
import { Inbox, Info, Mail, RefreshCw, Send, Zap } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'

function jobStatusBadge(status: string) {
  const s = status.toLowerCase()
  if (s === 'sent' || s === 'completed' || s === 'done')
    return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
  if (s === 'failed' || s === 'error' || s === 'cancelled')
    return 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300'
  if (s === 'pending' || s === 'queued' || s === 'scheduled')
    return 'bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200'
  return 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
}

export default function AdminMessagingSection() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [triggers, setTriggers] = useState<NotificationTrigger[]>([])
  const [jobs, setJobs] = useState<NotificationJob[]>([])
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const [jobStatus, setJobStatus] = useState('')
  const [jobLimit, setJobLimit] = useState('80')

  const [qTrigger, setQTrigger] = useState('')
  const [qUserId, setQUserId] = useState('')
  const [qChannel, setQChannel] = useState<'email' | 'sms' | 'whatsapp'>('email')
  const [qPayload, setQPayload] = useState('{}')
  const [qSchedule, setQSchedule] = useState('')

  const refresh = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) return
    setLoadErr(null)
    setRefreshing(true)
    try {
      const lim = Math.min(500, Math.max(1, Number.parseInt(jobLimit, 10) || 80))
      const [t, tr, j] = await Promise.all([
        listEmailTemplates(token),
        listNotificationTriggers(token),
        listNotificationJobs(token, {
          ...(jobStatus.trim() ? { status: jobStatus.trim() } : {}),
          limit: lim,
        }),
      ])
      setTemplates(t.templates)
      setTriggers(tr.triggers)
      setJobs(j.jobs)
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'messaging_load_failed')
    } finally {
      setRefreshing(false)
    }
  }, [jobStatus, jobLimit])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function onQueue(e: FormEvent) {
    e.preventDefault()
    const token = getStoredAuthToken()
    if (!token) return
    if (!qTrigger.trim() || !qSchedule.trim()) {
      setLoadErr('trigger_code ve scheduled_at zorunlu.')
      return
    }
    let payload = qPayload.trim() || '{}'
    try {
      JSON.parse(payload)
    } catch {
      setLoadErr('payload_json geçerli JSON olmalı.')
      return
    }
    setBusy(true)
    setLoadErr(null)
    try {
      await queueNotificationJob(token, {
        trigger_code: qTrigger.trim(),
        channel: qChannel,
        payload_json: payload,
        scheduled_at: qSchedule.trim(),
        ...(qUserId.trim() ? { user_id: qUserId.trim() } : {}),
      })
      setQTrigger('')
      setQUserId('')
      setQPayload('{}')
      setQSchedule('')
      await refresh()
    } catch (err) {
      setLoadErr(err instanceof Error ? err.message : 'messaging_queue_failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div id="admin-messaging-block" className="space-y-8">
      <header className="rounded-2xl border border-neutral-200 bg-gradient-to-br from-white to-neutral-50/80 p-6 dark:border-neutral-800 dark:from-neutral-900/80 dark:to-neutral-950/50">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-100 text-primary-600 dark:bg-primary-950/50 dark:text-primary-400">
            <Send className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">Mesajlaşma kataloğu</h1>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Bu ekranda <strong>hangi e-posta şablonlarının</strong> tanımlı olduğunu,{' '}
              <strong>hangi olayların (tetikleyici)</strong> bildirim üretebileceğini ve{' '}
              <strong>kuyrukta bekleyen veya gönderilmiş işleri</strong> izlersiniz. Yeni gönderimler arka plandaki{' '}
              worker tarafından işlenir.
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
            className="mt-1 w-44 font-mono text-sm"
            placeholder="Örn. pending"
            value={jobStatus}
            onChange={(e) => setJobStatus(e.target.value)}
          />
        </Field>
        <Field>
          <Label>Kayıt limiti</Label>
          <Input className="mt-1 w-24 font-mono text-sm" value={jobLimit} onChange={(e) => setJobLimit(e.target.value)} />
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
        <PanelCard
          icon={<Mail className="h-5 w-5" />}
          title="E-posta şablonları"
          subtitle="Sistemde kayıtlı şablon kodları; konu ve gövde metin anahtarları i18n ile eşlenir."
          empty={templates.length === 0}
          emptyText="Henüz şablon dönmedi. API veya veritabanında kayıt olmayabilir."
        >
          <div className="hidden sm:grid sm:grid-cols-[1fr_1fr_1fr] gap-px rounded-lg bg-neutral-200 text-[11px] font-medium text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400">
            <div className="bg-neutral-50 px-2 py-1.5 dark:bg-neutral-900/80">Kod</div>
            <div className="bg-neutral-50 px-2 py-1.5 dark:bg-neutral-900/80">Konu anahtarı</div>
            <div className="bg-neutral-50 px-2 py-1.5 dark:bg-neutral-900/80">Gövde anahtarı</div>
          </div>
          <div className="max-h-56 space-y-0 overflow-y-auto rounded-lg border border-neutral-100 dark:border-neutral-800 sm:border-0">
            {templates.map((t) => (
              <div
                key={t.id}
                className="grid gap-1 border-b border-neutral-100 px-2 py-2 text-[11px] last:border-0 sm:grid-cols-[1fr_1fr_1fr] sm:items-center dark:border-neutral-800"
              >
                <span className="font-mono text-neutral-900 dark:text-white">{t.code}</span>
                <span className="font-mono text-neutral-600 dark:text-neutral-400">{t.subject_key}</span>
                <span className="font-mono text-neutral-500 dark:text-neutral-500">{t.body_key}</span>
              </div>
            ))}
          </div>
        </PanelCard>

        <PanelCard
          icon={<Zap className="h-5 w-5" />}
          title="Tetikleyiciler"
          subtitle="Olay kodları — kuyruğa iş eklerken aynı kodları kullanın."
          empty={triggers.length === 0}
          emptyText="Tetikleyici listesi boş."
        >
          <ul className="max-h-56 space-y-2 overflow-y-auto pr-1 text-sm">
            {triggers.map((t) => (
              <li
                key={t.id}
                className="rounded-lg border border-neutral-100 bg-neutral-50/80 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-950/40"
              >
                <span className="font-mono text-xs font-semibold text-primary-700 dark:text-primary-400">{t.code}</span>
                {t.description ? (
                  <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">{t.description}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </PanelCard>

        <PanelCard
          icon={<Inbox className="h-5 w-5" />}
          title="Son işler"
          subtitle="Filtre ve limit üstte; durum rozetleri gönderim aşamasını gösterir."
          empty={jobs.length === 0}
          emptyText="Bu filtreye uyan iş yok. Filtreyi temizleyip yenileyin."
        >
          <div className="max-h-56 space-y-1 overflow-y-auto">
            {jobs.map((j) => (
              <div
                key={j.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-neutral-100 px-2 py-1.5 text-[10px] dark:border-neutral-800"
              >
                <span className={clsx('rounded-md px-1.5 py-0.5 font-medium', jobStatusBadge(j.status))}>{j.status}</span>
                <span className="font-mono text-neutral-500">{j.channel}</span>
                <span className="font-mono text-neutral-400" title={j.id}>
                  {j.id.slice(0, 8)}…
                </span>
              </div>
            ))}
          </div>
        </PanelCard>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/40">
        <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Kuyruğa iş ekle</h2>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Test veya manuel tetiklemeler için zamanlanmış bir bildirim kaydı oluşturur. <code className="font-mono text-xs">scheduled_at</code> ISO
          zamanı (UTC) olmalıdır.
        </p>
        <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={(e) => void onQueue(e)}>
          <Field>
            <Label>Tetikleyici kodu</Label>
            <Input
              className="mt-1 font-mono text-sm"
              placeholder="ör. reservation_confirmed"
              value={qTrigger}
              onChange={(e) => setQTrigger(e.target.value)}
              required
            />
          </Field>
          <Field>
            <Label>Kanal</Label>
            <select
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
              value={qChannel}
              onChange={(e) => setQChannel(e.target.value as 'email' | 'sms' | 'whatsapp')}
            >
              <option value="email">E-posta</option>
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </Field>
          <Field className="md:col-span-2">
            <Label>Kullanıcı ID (UUID, isteğe bağlı)</Label>
            <Input
              className="mt-1 font-mono text-sm"
              placeholder="Hedef kullanıcı"
              value={qUserId}
              onChange={(e) => setQUserId(e.target.value)}
            />
          </Field>
          <Field className="md:col-span-2">
            <Label>Payload (JSON)</Label>
            <Textarea
              className="mt-1 font-mono text-sm"
              rows={4}
              value={qPayload}
              onChange={(e) => setQPayload(e.target.value)}
            />
          </Field>
          <Field className="md:col-span-2">
            <Label>Zamanlama (scheduled_at)</Label>
            <Input
              className="mt-1 font-mono text-sm"
              placeholder="2026-04-03T15:00:00Z"
              value={qSchedule}
              onChange={(e) => setQSchedule(e.target.value)}
              required
            />
          </Field>
          <div className="md:col-span-2">
            <ButtonPrimary type="submit" disabled={busy}>
              {busy ? 'Gönderiliyor…' : 'Kuyruğa ekle'}
            </ButtonPrimary>
          </div>
        </form>
      </div>
    </div>
  )
}

function PanelCard({
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
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
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
