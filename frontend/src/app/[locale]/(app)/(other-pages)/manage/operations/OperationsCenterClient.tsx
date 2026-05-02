'use client'

import { formatManageApiCatch } from '@/lib/manage-api-error-tr'
import { getStoredAuthToken } from '@/lib/auth-storage'
import { getOperationsOverview, type OperationsOverview, type OperationsTaskItem } from '@/lib/travel-api'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import clsx from 'clsx'
import {
  AlertTriangle,
  Bot,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Loader2,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  Truck,
} from 'lucide-react'
import Link from 'next/link'
import type { ElementType, ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'

function fmtDate(raw?: string) {
  if (!raw) return 'Tarih yok'
  try {
    return new Date(raw).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return raw
  }
}

function fmtAmount(amount?: string, currency = 'TRY') {
  const n = Number.parseFloat(amount ?? '')
  if (!Number.isFinite(n)) return 'Tutar yok'
  try {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(n)
  } catch {
    return `${amount} ${currency}`
  }
}

function KpiCard({
  label,
  value,
  href,
  tone,
  Icon,
}: {
  label: string
  value: number
  href: string
  tone: string
  Icon: ElementType
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div className="flex items-center gap-3">
        <span className={clsx('flex size-10 items-center justify-center rounded-xl', tone)}>
          <Icon className="size-5" />
        </span>
        <div>
          <p className="text-2xl font-bold text-neutral-900 dark:text-white">{value}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
        </div>
      </div>
    </Link>
  )
}

function TaskList({
  title,
  subtitle,
  items,
  href,
  emptyText,
  renderItem,
}: {
  title: string
  subtitle: string
  items: OperationsTaskItem[]
  href: string
  emptyText: string
  renderItem: (item: OperationsTaskItem) => ReactNode
}) {
  return (
    <section className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-neutral-900 dark:text-white">{title}</h2>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</p>
        </div>
        <Link href={href} className="shrink-0 text-xs font-medium text-primary-600 hover:underline">
          Aç
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-200 px-3 py-8 text-center text-sm text-neutral-400 dark:border-neutral-700">
          {emptyText}
        </p>
      ) : (
        <div className="space-y-3">{items.map((item) => <div key={item.id}>{renderItem(item)}</div>)}</div>
      )}
    </section>
  )
}

function SimpleRow({
  title,
  meta,
  badge,
  danger = false,
}: {
  title: string
  meta: string
  badge?: string
  danger?: boolean
}) {
  return (
    <div className="rounded-xl border border-neutral-100 p-3 text-sm dark:border-neutral-800">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-neutral-900 dark:text-white">{title}</p>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{meta}</p>
        </div>
        {badge ? (
          <span
            className={clsx(
              'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium',
              danger
                ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
            )}
          >
            {badge}
          </span>
        ) : null}
      </div>
    </div>
  )
}

export default function OperationsCenterClient() {
  const vitrinHref = useVitrinHref()
  const [data, setData] = useState<OperationsOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const links = useMemo(() => ({
    reservations: vitrinHref('/manage/reservations'),
    provizyon: vitrinHref('/manage/admin/payments/provizyon'),
    chatbot: vitrinHref('/manage/ai/chatbot'),
  }), [vitrinHref])

  const load = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) {
      setError('Oturum bulunamadı')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      setData(await getOperationsOverview(token))
    } catch (e) {
      setError(formatManageApiCatch(e, 'operations_load_failed'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loading && !data) {
    return (
      <div className="flex min-h-[24rem] items-center justify-center text-neutral-500">
        <Loader2 className="me-2 size-5 animate-spin" />
        Operasyon Merkezi yükleniyor…
      </div>
    )
  }

  const counts = data?.counts

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">Operasyon Merkezi</p>
          <h1 className="mt-1 text-2xl font-bold text-neutral-900 dark:text-white">Bugünün İş Takibi</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Rezervasyon, provizyon, transfer, eskalasyon ve chat akışlarını tek ekranda takip edin.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          <RefreshCw className={clsx('size-4', loading && 'animate-spin')} />
          Yenile
        </button>
      </div>

      {error ? (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {counts ? (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-7">
          <KpiCard label="Bekleyen rezervasyon" value={counts.pending_reservations} href={links.reservations} tone="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" Icon={CalendarClock} />
          <KpiCard label="Ödeme bekleyen" value={counts.payment_pending} href={links.provizyon} tone="bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" Icon={CreditCard} />
          <KpiCard label="Tedarikçi onayı" value={counts.supplier_pending} href={links.provizyon} tone="bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300" Icon={ShieldCheck} />
          <KpiCard label="Süresi geçen" value={counts.overdue_provizyon} href={links.provizyon} tone="bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300" Icon={AlertTriangle} />
          <KpiCard label="Açık eskalasyon" value={counts.open_escalations} href={links.provizyon} tone="bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300" Icon={AlertTriangle} />
          <KpiCard label="Açık chat" value={counts.open_chats} href={links.chatbot} tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" Icon={MessageSquare} />
          <KpiCard label="Transfer bekleyen" value={counts.pending_transfers} href={links.provizyon} tone="bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300" Icon={Truck} />
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-2">
        <TaskList
          title="Yaklaşan Giriş / Çıkışlar"
          subtitle="Önümüzdeki 3 gün içinde operasyon gerektiren rezervasyonlar."
          items={data?.tasks.upcoming ?? []}
          href={links.reservations}
          emptyText="Yaklaşan giriş veya çıkış görünmüyor."
          renderItem={(item) => (
            <SimpleRow
              title={`${item.public_code ?? 'Rezervasyon'} · ${item.guest_name ?? 'Misafir'}`}
              meta={`${item.listing_title ?? 'İlan'} · ${item.starts_on ?? '-'} / ${item.ends_on ?? '-'}`}
              badge={item.task_type === 'checkin' ? 'Giriş' : 'Çıkış'}
            />
          )}
        />

        <TaskList
          title="Tedarikçi Onayı"
          subtitle="Onay bekleyen ve süresi geçen provizyonlar."
          items={data?.tasks.supplier_deadlines ?? []}
          href={links.provizyon}
          emptyText="Tedarikçi onayı bekleyen kayıt yok."
          renderItem={(item) => (
            <SimpleRow
              title={`${item.public_code ?? 'Provizyon'} · ${item.guest_name ?? 'Misafir'}`}
              meta={`${item.listing_title ?? 'İlan'} · Deadline: ${fmtDate(item.due_at)}`}
              badge={item.is_overdue ? 'Süre doldu' : item.payment_status}
              danger={item.is_overdue}
            />
          )}
        />

        <TaskList
          title="Transfer / Ödeme İşleri"
          subtitle="Tedarikçiye transfer veya işleme alınması gereken finans işleri."
          items={data?.tasks.payment_transfers ?? []}
          href={links.provizyon}
          emptyText="Bekleyen transfer işi yok."
          renderItem={(item) => (
            <SimpleRow
              title={`${item.public_code ?? 'Rezervasyon'} · ${fmtAmount(item.amount, item.currency_code)}`}
              meta={`${item.task_type ?? 'transfer'} · ${fmtDate(item.due_at)}`}
              badge={item.status}
            />
          )}
        />

        <TaskList
          title="Açık Eskalasyonlar"
          subtitle="Temsilci müdahalesi veya alternatif çözüm gerektiren dosyalar."
          items={data?.tasks.escalations ?? []}
          href={links.provizyon}
          emptyText="Açık eskalasyon yok."
          renderItem={(item) => (
            <SimpleRow
              title={`${item.public_code ?? 'Rezervasyon'} · ${item.reason ?? 'escalation'}`}
              meta={`${fmtDate(item.due_at)}${item.note ? ` · ${item.note}` : ''}`}
              badge={item.status}
              danger
            />
          )}
        />

        <TaskList
          title="Chatbot / Lead Görüşmeleri"
          subtitle="Seyahat asistanından gelen açık görüşmeler."
          items={data?.tasks.chats ?? []}
          href={links.chatbot}
          emptyText="Açık chat görüşmesi yok."
          renderItem={(item) => (
            <SimpleRow
              title={`${item.ai_mode ?? 'chat'} · ${item.locale ?? 'tr'}`}
              meta={item.last_message || `Başlangıç: ${fmtDate(item.started_at)}`}
              badge="Açık"
            />
          )}
        />

        <section className="rounded-2xl border border-primary-100 bg-primary-50/60 p-5 dark:border-primary-900 dark:bg-primary-950/20">
          <div className="flex gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white">
              <Bot className="size-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Sonraki blok</h2>
              <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">
                Tatil evi dışındaki kategori ilan ekleme ve vitrin detay sayfaları bu ekrandan sonra ayrı geliştirme bloğu olarak ele alınacak.
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs font-medium text-primary-700 dark:text-primary-300">
                <CheckCircle2 className="size-4" />
                Otel, araç, tur, aktivite, transfer, vize ve kruvaziyer akışları unutulmadı.
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
