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

type AiUnit = {
  title: string
  description: string
  automation: string
  approval: string
  path: string
}

const AI_UNITS: AiUnit[] = [
  { title: 'İlan ve katalog operasyonu', description: 'İlan kalitesi, eksik bilgi, görsel ve yayın kontrolü.', automation: 'Taslak ve kalite önerisi', approval: 'Yayın değişikliği onaylı', path: '/manage/catalog' },
  { title: 'Gelir ve kampanya yönetimi', description: 'Talep, dönüşüm ve marja göre kampanya fırsatları.', automation: 'Fırsat tespiti ve taslak', approval: 'Fiyat/indirim onaylı', path: '/manage/campaigns' },
  { title: 'Pazarlama ve sosyal medya', description: 'İçerik takvimi, kanal performansı ve yanıt taslakları.', automation: 'İçerik üretimi ve plan', approval: 'Yayın onaylı', path: '/manage/social' },
  { title: 'Satış ve müşteri adayı', description: 'Chatbot ile ihtiyaç keşfi, teklif yönlendirmesi ve takip.', automation: '7/24 görüşme ve lead özeti', approval: 'İzinli takip / teklif onaylı', path: '/manage/ai/chatbot' },
  { title: 'Rezervasyon ve müşteri başarısı', description: 'Öncesi, sırası ve sonrası destek; aksama eskalasyonları.', automation: 'Hatırlatma ve risk uyarısı', approval: 'İade/değişiklik onaylı', path: '/manage/reservations' },
  { title: 'Tedarikçi başarısı', description: 'Onay süreleri, içerik kalitesi ve tedarikçi iletişimi.', automation: 'SLA takibi ve brifing taslağı', approval: 'Sözleşme/ödeme onaylı', path: '/manage/supplier-verify' },
  { title: 'Finans ve faturalandırma', description: 'Fatura, komisyon, provizyon ve mutabakat istisnaları.', automation: 'Eşleştirme ve anomali uyarısı', approval: 'Ödeme ve muhasebe kaydı onaylı', path: '/manage/finance/invoices' },
  { title: 'Risk, kalite ve uyum', description: 'Dolandırıcılık, olağandışı işlem, şikâyet ve denetim izleri.', automation: 'Risk skoru ve vaka özeti', approval: 'Kısıtlama/karar insan onaylı', path: '/manage/audit-log' },
  { title: 'Veri ve büyüme analitiği', description: 'Dönüşüm hunisi, birim ekonomi ve aksiyon önceliği.', automation: 'Günlük içgörü ve öneri', approval: 'Strateji insan onaylı', path: '/manage/admin' },
]

const AI_ORG_DIRECTORS = [
  { title: 'İlan Operasyon Müdürü', workers: 'İlan Kalite · Görsel · İlan Metni · TR → Çoklu Dil Çeviri', path: '/manage/catalog' },
  { title: 'Gelir ve Kampanya Müdürü', workers: 'Fiyat İçgörü · Kampanya Uzmanı', path: '/manage/campaigns' },
  { title: 'Pazarlama ve Büyüme Müdürü', workers: 'Sosyal Medya Yayın · Blog · SEO · Bölge İçeriği', path: '/manage/social' },
  { title: 'Satış ve Müşteri Operasyon Müdürü', workers: 'AI Satış Temsilcisi · Destek Triyaj · Concierge', path: '/manage/ai/chatbot' },
  { title: 'Finans ve Muhasebe Müdürü', workers: 'Fatura Kontrol · Muhasebe Özet', path: '/manage/finance/invoices' },
  { title: 'Risk, Kalite ve Uyum Müdürü', workers: 'Risk Sinyali · Denetim Kontrol', path: '/manage/audit-log' },
  { title: 'Veri ve İçgörü Müdürü', workers: 'Günlük İçgörü · KPI Analiz', path: '/manage/admin' },
]

const AI_CONTENT_LIFECYCLE = [
  ['01', 'Alım', 'İlan, sayfa, bölge, blog veya kampanya'],
  ['02', 'Doğrulama', 'Eksik, çelişkili ve riskli bilgileri bulur'],
  ['03', 'Türkçe içerik', 'Marka, yazım ve satış kurallarına uygunlaştırır'],
  ['04', 'Görsel', 'Kalite, sıra, alt metin ve performansı hazırlar'],
  ['05', 'Yerelleştirme', 'Türkçe kaynağı her hedef dile kültürel olarak uyarlar'],
  ['06', 'Çok dilli SEO', 'Her dilde ayrı arama niyeti ve SEO paketi üretir'],
  ['07', 'Kalite kapısı', 'Kaynak, doğruluk, tekrar ve marka kontrolü yapar'],
  ['08', 'Yayın', 'Yalnızca gerekli istisnaları onaya gönderir'],
  ['09', 'Dağıtım', 'Sosyal medya ve kanala özel paylaşım üretir'],
  ['10', 'Öğrenme', 'Dönüşümü ölçer ve içeriği sürekli geliştirir'],
] as const

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
        <Link href={href} className="shrink-0 text-xs font-medium text-link-muted-underline">
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
    approvals: vitrinHref('/manage/ai/approvals'),
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
        <Link href={links.approvals} className="rounded-xl bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700">
          AI onay kuyruğu
        </Link>
      </div>

      {error ? (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-4 dark:border-neutral-800 dark:bg-neutral-950/30">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">Yönetim yapısı</p>
          <h2 className="mt-1 text-lg font-bold text-neutral-900 dark:text-white">Sizin AI operasyon kadronuz</h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Her kritik karar size gelir; ajanlar yalnızca tanımlı yetki ve onay sınırlarında çalışır.</p>
        </div>
        <div className="p-5">
          <div className="mx-auto max-w-sm rounded-xl border-2 border-primary-200 bg-primary-50 px-4 py-3 text-center dark:border-primary-800 dark:bg-primary-950/30">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-300">Sahip ve son onay</p>
            <p className="mt-1 font-bold text-neutral-900 dark:text-white">Siz</p>
          </div>
          <div className="mx-auto h-5 w-px bg-primary-200 dark:bg-primary-800" />
          <div className="mx-auto max-w-sm rounded-xl bg-violet-600 px-4 py-3 text-center text-white shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-100">AI Genel Müdürü</p>
            <p className="mt-1 font-bold">Öncelik, risk ve onay kuyruğu</p>
          </div>
          <div className="mx-auto h-5 w-px bg-violet-200 dark:bg-violet-800" />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {AI_ORG_DIRECTORS.map((director) => (
              <Link key={director.title} href={vitrinHref(director.path)} className="rounded-xl border border-neutral-200 p-3 transition hover:border-violet-300 hover:shadow-sm dark:border-neutral-800 dark:hover:border-violet-800">
                <p className="text-sm font-semibold text-neutral-900 dark:text-white">{director.title}</p>
                <div className="my-2 border-t border-dashed border-neutral-200 dark:border-neutral-700" />
                <p className="text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400"><span className="font-semibold text-violet-700 dark:text-violet-300">Uzman ajanlar:</span> {director.workers}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

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

      <section className="mb-6 rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-50/70 to-white p-5 dark:border-cyan-900/50 dark:from-cyan-950/20 dark:to-neutral-900">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700 dark:text-cyan-300">Sitenin beyni ve sinir sistemi</p>
            <h2 className="mt-1 text-lg font-semibold text-neutral-900 dark:text-white">Evrensel içerik yaşam döngüsü</h2>
            <p className="mt-1 max-w-3xl text-sm text-neutral-600 dark:text-neutral-300">Her içerik aynı kalite zincirinden geçer. Ajanlar işi birbirine devreder; siz yalnızca yayın, para, risk veya marka istisnası olduğunda devreye girersiniz.</p>
          </div>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">İstisna bazlı yönetim</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {AI_CONTENT_LIFECYCLE.map(([number, title, description]) => (
            <div key={number} className="relative rounded-xl border border-white bg-white/90 p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/80">
              <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-300">{number}</span>
              <h3 className="mt-1 text-sm font-semibold text-neutral-900 dark:text-white">{title}</h3>
              <p className="mt-1 text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-6 rounded-2xl border border-violet-100 bg-violet-50/40 p-5 dark:border-violet-900/60 dark:bg-violet-950/15">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">AI işletim modeli</p>
            <h2 className="mt-1 text-lg font-semibold text-neutral-900 dark:text-white">Az insanla çalışan operasyon birimleri</h2>
            <p className="mt-1 max-w-3xl text-sm text-neutral-600 dark:text-neutral-300">
              Yapay zeka düşük riskli işleri hazırlar ve takip eder; para, sözleşme, fiyat, iade ve dışarıya gönderilen kritik iletişimler onay kuyruğundan geçer.
            </p>
          </div>
          <Link href={links.chatbot} className="rounded-xl bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700">
            AI satış temsilcisini aç
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {AI_UNITS.map((unit) => (
            <Link key={unit.title} href={vitrinHref(unit.path)} className="rounded-xl border border-white/80 bg-white/85 p-4 transition hover:-translate-y-0.5 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900/80">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">{unit.title}</h3>
              <p className="mt-1 min-h-10 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">{unit.description}</p>
              <p className="mt-3 text-[11px] font-medium text-violet-700 dark:text-violet-300">AI: {unit.automation}</p>
              <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">Kontrol: {unit.approval}</p>
            </Link>
          ))}
        </div>
      </section>

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
