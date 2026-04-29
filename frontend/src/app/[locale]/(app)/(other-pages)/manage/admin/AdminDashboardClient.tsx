'use client'

import { getStoredAuthToken } from '@/lib/auth-storage'
import { getStaffInvoices, getStaffReservations, listSeoNotFoundLogs, type StaffInvoiceRow, type StaffReservationRow } from '@/lib/travel-api'
import clsx from 'clsx'
import {
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  CalendarCheck2,
  CreditCard,
  Globe,
  Layers,
  Link2,
  MessageSquare,
  PenSquare,
  RefreshCw,
  ShoppingBag,
  Star,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { normalizeHrefForLocale } from '@/lib/i18n-config'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number, currency = 'TRY') {
  try {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n)
  } catch {
    return `${n.toLocaleString('tr-TR')} ${currency}`
  }
}

function fmtCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

// ─── SVG Bar Chart ────────────────────────────────────────────────────────────

type BarDataPoint = { label: string; value: number; value2?: number }

function SvgBarChart({
  data,
  color = '#00a76f',
  color2 = '#c8facd',
  label2,
}: {
  data: BarDataPoint[]
  color?: string
  color2?: string
  label2?: string
}) {
  const max = Math.max(...data.map((d) => Math.max(d.value, d.value2 ?? 0)), 1)
  const W = 480
  const H = 140
  const PAD = { t: 8, r: 8, b: 28, l: 40 }
  const chartW = W - PAD.l - PAD.r
  const chartH = H - PAD.t - PAD.b
  const barW = data.length > 0 ? (chartW / data.length) * 0.4 : 20
  const gap = data.length > 0 ? chartW / data.length : 40

  const yTicks = 4
  const tickValues = Array.from({ length: yTicks + 1 }, (_, i) => (max / yTicks) * i)

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      aria-hidden="true"
      style={{ overflow: 'visible' }}
    >
      {/* Y grid lines + labels */}
      {tickValues.map((v, i) => {
        const y = PAD.t + chartH - (v / max) * chartH
        return (
          <g key={i}>
            <line
              x1={PAD.l}
              y1={y}
              x2={W - PAD.r}
              y2={y}
              stroke="currentColor"
              strokeOpacity={0.08}
              strokeWidth={1}
            />
            <text
              x={PAD.l - 4}
              y={y + 3}
              fontSize={9}
              fill="currentColor"
              opacity={0.4}
              textAnchor="end"
            >
              {v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v.toFixed(0)}
            </text>
          </g>
        )
      })}

      {/* Bars */}
      {data.map((d, i) => {
        const cx = PAD.l + gap * i + gap / 2
        const bh = (d.value / max) * chartH
        const bh2 = d.value2 !== undefined ? (d.value2 / max) * chartH : 0
        const hasTwo = d.value2 !== undefined && label2

        return (
          <g key={i}>
            {hasTwo ? (
              <>
                <rect
                  x={cx - barW - 1}
                  y={PAD.t + chartH - bh}
                  width={barW}
                  height={Math.max(bh, 1)}
                  rx={2}
                  fill={color}
                  opacity={0.9}
                />
                <rect
                  x={cx + 1}
                  y={PAD.t + chartH - bh2}
                  width={barW}
                  height={Math.max(bh2, 1)}
                  rx={2}
                  fill={color2}
                  opacity={0.9}
                />
              </>
            ) : (
              <rect
                x={cx - barW / 2}
                y={PAD.t + chartH - bh}
                width={barW}
                height={Math.max(bh, 1)}
                rx={2}
                fill={color}
                opacity={0.85}
              />
            )}
            <text
              x={cx}
              y={H - PAD.b + 12}
              fontSize={9}
              fill="currentColor"
              opacity={0.5}
              textAnchor="middle"
            >
              {d.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ─── SVG Donut Chart ──────────────────────────────────────────────────────────

type DonutSegment = { label: string; value: number; color: string }

function SvgDonut({ segments, size = 120 }: { segments: DonutSegment[]; size?: number }) {
  const total = segments.reduce((s, d) => s + d.value, 0)
  const R = 40
  const cx = size / 2
  const cy = size / 2
  const circ = 2 * Math.PI * R

  let cumulative = 0
  const slices = segments.map((seg) => {
    const pct = total > 0 ? seg.value / total : 0
    const dash = pct * circ
    const offset = circ - cumulative * circ
    cumulative += pct
    return { ...seg, dash, offset }
  })

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="currentColor" strokeOpacity={0.06} strokeWidth={16} />
      {total === 0 ? null : slices.map((s, i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={R}
          fill="none"
          stroke={s.color}
          strokeWidth={16}
          strokeDasharray={`${s.dash} ${circ - s.dash}`}
          strokeDashoffset={s.offset}
          strokeLinecap="butt"
          style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px` }}
        />
      ))}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize={14} fontWeight="700" fill="currentColor">
        {fmtCount(total)}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize={8} fill="currentColor" opacity={0.5}>
        toplam
      </text>
    </svg>
  )
}

// ─── SVG Sparkline ────────────────────────────────────────────────────────────

function Sparkline({ values, color = '#00a76f' }: { values: number[]; color?: string }) {
  const W = 80
  const H = 28
  if (values.length < 2) return null
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const step = W / (values.length - 1)
  const pts = values
    .map((v, i) => `${(i * step).toFixed(1)},${(H - ((v - min) / range) * H).toFixed(1)}`)
    .join(' ')
  return (
    <svg width={W} height={H} aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

type KpiProps = {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  iconColor?: string
  trend?: number
  sparkline?: number[]
}

function KpiCard({ label, value, sub, icon: Icon, iconColor = '#00a76f', trend, sparkline }: KpiProps) {
  const up = trend !== undefined && trend >= 0
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
      <div className="flex items-start justify-between">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${iconColor}20` }}
        >
          <Icon className="h-5 w-5" style={{ color: iconColor }} />
        </div>
        {trend !== undefined ? (
          <div className={clsx('flex items-center gap-0.5 text-xs font-semibold', up ? 'text-emerald-600' : 'text-red-500')}>
            {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {Math.abs(trend).toFixed(1)}%
          </div>
        ) : null}
      </div>
      <div>
        <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{value}</p>
        <p className="mt-0.5 text-xs text-neutral-500">{label}</p>
        {sub ? <p className="mt-0.5 text-[11px] text-neutral-400">{sub}</p> : null}
      </div>
      {sparkline ? (
        <div className="mt-auto">
          <Sparkline values={sparkline} color={iconColor} />
        </div>
      ) : null}
    </div>
  )
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  inquiry: '#facc15',
  held: '#60a5fa',
  confirmed: '#00a76f',
  cancelled: '#f87171',
  completed: '#a78bfa',
}
const STATUS_LABELS: Record<string, string> = {
  inquiry: 'Talep',
  held: 'Ödeme bekliyor',
  confirmed: 'Onaylandı',
  cancelled: 'İptal',
  completed: 'Tamamlandı',
}

// ─── Yer tutucu: gerçek admin KPI endpoint’i gelene kadar 0 gösterilir ───────

function buildMonthLabels(n = 6) {
  const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
  const now = new Date()
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1)
    return months[d.getMonth()]
  })
}

const EMPTY_SPARKLINE_6 = [0, 0, 0, 0, 0, 0]

// ─── Quick Actions ────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: 'Blog Yazıları', icon: PenSquare, href: '/manage/admin/content/blog', color: '#3b82f6' },
  { label: 'Provizyon', icon: Zap, href: '/manage/admin/payments/provizyon', color: '#f59e0b' },
  { label: 'Bildirimler', icon: MessageSquare, href: '/manage/admin/settings/notifications', color: '#10b981' },
  { label: 'Tüm Faturalar', icon: CreditCard, href: '/manage/finance/invoices', color: '#ef4444' },
  { label: 'Entegrasyonlar', icon: Globe, href: '/manage/admin/settings/integrations', color: '#06b6d4' },
  { label: 'Merchant & Sosyal Satış', icon: ShoppingBag, href: '/manage/admin/marketing/merchant', color: '#a855f7' },
]

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function AdminDashboardClient() {
  const [invoices, setInvoices] = useState<StaffInvoiceRow[]>([])
  const [reservations, setReservations] = useState<StaffReservationRow[]>([])
  const [notFoundCount, setNotFoundCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const monthLabels = useMemo(() => buildMonthLabels(6), [])
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const vitrinPath = useVitrinHref()

  const load = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) { setLoading(false); return }
    try {
      const [invRes, resRes, seoRes] = await Promise.allSettled([
        getStaffInvoices(token),
        getStaffReservations(token),
        listSeoNotFoundLogs(token),
      ])
      if (invRes.status === 'fulfilled') setInvoices(invRes.value.invoices)
      if (resRes.status === 'fulfilled') setReservations(resRes.value.reservations)
      if (seoRes.status === 'fulfilled') setNotFoundCount(seoRes.value.logs.length)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  // Real data derivations
  const realCommission = useMemo(() => {
    return invoices
      .filter((i) => i.status === 'issued')
      .reduce((sum, i) => sum + parseFloat(i.commission_total || '0'), 0)
  }, [invoices])

  const totalCommission = realCommission

  const pendingReservations = reservations.filter((r) => r.status === 'pending').length
  const confirmedToday = reservations.filter((r) => {
    if (r.status !== 'confirmed') return false
    const d = new Date(r.created_at)
    const now = new Date()
    return d.toDateString() === now.toDateString()
  }).length

  // Attention items
  const attentionItems = [
    pendingReservations > 0 && { label: 'Onay bekleyen rezervasyon', count: pendingReservations, href: '/manage/reservations', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/20', border: 'border-amber-200 dark:border-amber-900/30' },
    notFoundCount > 0 && { label: '404 kırık bağlantı', count: notFoundCount, href: '/manage/seo/404', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/20', border: 'border-red-200 dark:border-red-900/30' },
  ].filter(Boolean) as { label: string; count: number; href: string; color: string; bg: string; border: string }[]

  // Status donut data
  const liveStatusCounts = reservations.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1
    return acc
  }, {})
  const statusCounts = liveStatusCounts
  const statusSegments: DonutSegment[] = Object.entries(statusCounts).map(([key, val]) => ({
    label: STATUS_LABELS[key] ?? key,
    value: val,
    color: STATUS_COLORS[key] ?? '#888',
  }))
  const totalReservations = Object.values(statusCounts).reduce((a, b) => a + b, 0)

  const now = new Date()
  const greeting = now.getHours() < 12 ? 'Günaydın' : now.getHours() < 18 ? 'İyi günler' : 'İyi akşamlar'
  const dateStr = now.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="min-h-screen bg-[color:var(--manage-page-bg)] p-6 lg:p-8">
      {/* Başlık */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-neutral-400">{dateStr}</p>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            {greeting} 👋
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Platform genel durumu ve istatistikler
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
        >
          <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
          Yenile
        </button>
      </div>

      {/* ── Dikkat gerektiren öğeler ───────────────────────────────────────── */}
      {attentionItems.length > 0 && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {attentionItems.map((item) => (
            <Link
              key={item.href}
              href={normalizeHrefForLocale(locale, vitrinPath(item.href.startsWith('/') ? item.href : `/${item.href}`))}
              className={clsx('flex items-center justify-between rounded-2xl border px-4 py-3 transition-all hover:shadow-md', item.bg, item.border)}
            >
              <span className={clsx('text-sm font-medium', item.color)}>{item.label}</span>
              <span className={clsx('rounded-full px-2.5 py-1 text-sm font-bold', item.color, item.bg)}>
                {item.count}
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* ── Bugünün özeti ─────────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap gap-3">
        {[
          { label: 'Bugün giriş yapacak', value: confirmedToday, color: '#10b981' },
          { label: 'Toplam rezervasyon', value: reservations.length || totalReservations, color: '#3b82f6' },
          { label: 'Bekleyen onay', value: pendingReservations, color: '#f59e0b' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-[color:var(--manage-card-border)] bg-[color:var(--manage-card-bg)] px-4 py-2.5 shadow-sm backdrop-blur-sm">
            <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-neutral-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Hızlı Eylemler ───────────────────────────────────────────────── */}
      <div className="mb-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">Hızlı Eylemler</h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={normalizeHrefForLocale(locale, vitrinPath(action.href.startsWith('/') ? action.href : `/${action.href}`))}
              className="flex flex-col items-center gap-2 rounded-2xl border border-[color:var(--manage-card-border)] bg-[color:var(--manage-card-bg)] p-4 text-center shadow-sm backdrop-blur-sm transition-all hover:border-[color:var(--manage-primary-border)] hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${action.color}18` }}>
                <action.icon className="h-5 w-5" style={{ color: action.color }} />
              </div>
              <span className="text-[11px] font-medium leading-tight text-neutral-600 dark:text-neutral-400">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── KPI Kartları ──────────────────────────────────────────────────── */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          label="Toplam ilan"
          value={fmtCount(0)}
          sub="yayında"
          icon={Layers}
          iconColor="#00a76f"
          sparkline={EMPTY_SPARKLINE_6}
        />
        <KpiCard
          label="Rezervasyonlar"
          value={fmtCount(totalReservations)}
          sub="tüm zamanlar"
          icon={CalendarCheck2}
          iconColor="#3b82f6"
          sparkline={EMPTY_SPARKLINE_6}
        />
        <KpiCard
          label="Brüt gelir"
          value={fmt(0)}
          sub="son 30 gün"
          icon={TrendingUp}
          iconColor="#8b5cf6"
          sparkline={EMPTY_SPARKLINE_6.slice(-5)}
        />
        <KpiCard
          label="Net komisyon"
          value={fmt(totalCommission)}
          sub="kesilmiş faturalar"
          icon={CreditCard}
          iconColor="#f59e0b"
          sparkline={EMPTY_SPARKLINE_6}
        />
        <KpiCard
          label="Reklam harcaması"
          value={fmt(0)}
          sub="tedarikçi promosyon"
          icon={Globe}
          iconColor="#ef4444"
          sparkline={EMPTY_SPARKLINE_6}
        />
      </div>

      {/* ── Orta bölüm: Durum kartları + Donut ───────────────────────────── */}
      <div className="mb-8 grid gap-4 lg:grid-cols-3">
        {/* Rezervasyon durum kartları */}
        <div className="col-span-2 rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              Rezervasyon Durumları
            </h2>
            <span className="text-xs text-neutral-400">Son 30 gün</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {Object.keys(statusCounts).length === 0 ? (
              <p className="col-span-full text-sm text-neutral-500">Henüz rezervasyon kaydı yok.</p>
            ) : (
            Object.entries(statusCounts).map(([status, count]) => {
              const color = STATUS_COLORS[status] ?? '#888'
              const pct = ((count / totalReservations) * 100).toFixed(0)
              return (
                <div key={status} className="rounded-xl border border-neutral-100 p-3 dark:border-neutral-800">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      {STATUS_LABELS[status] ?? status}
                    </span>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    {fmtCount(count)}
                  </p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-neutral-400">%{pct}</p>
                </div>
              )
            })
            )}
          </div>
        </div>

        {/* Donut grafik */}
        <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          <h2 className="mb-4 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            Durum Dağılımı
          </h2>
          <div className="flex flex-col items-center gap-4">
            <SvgDonut segments={statusSegments} size={140} />
            <ul className="w-full space-y-1.5">
              {statusSegments.map((s) => (
                <li key={s.label} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-neutral-600 dark:text-neutral-300">{s.label}</span>
                  </span>
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">{s.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── Alt bölüm: Çubuk grafikler ────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Aylık gelir bar grafiği */}
        <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          <div className="mb-3 flex items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                Aylık Brüt Gelir
              </h2>
              <p className="text-xs text-neutral-400">Son 6 ay</p>
            </div>
            <BarChart3 className="h-4 w-4 text-neutral-300" />
          </div>
          <SvgBarChart
            data={monthLabels.map((label, i) => ({
              label,
              value: EMPTY_SPARKLINE_6[i] ?? 0,
            }))}
            color="#00a76f"
          />
          <div className="mt-3 flex items-center justify-between border-t border-neutral-50 pt-3 dark:border-neutral-800">
            <span className="text-xs text-neutral-400">Toplam (6 ay)</span>
            <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
              {fmt(0)}
            </span>
          </div>
        </div>

        {/* Aylık rezervasyon bar grafiği */}
        <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          <div className="mb-3 flex items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                Aylık Rezervasyon
              </h2>
              <p className="text-xs text-neutral-400">Son 6 ay</p>
            </div>
            <Users className="h-4 w-4 text-neutral-300" />
          </div>
          <SvgBarChart
            data={monthLabels.map((label, i) => ({
              label,
              value: EMPTY_SPARKLINE_6[i] ?? 0,
            }))}
            color="#3b82f6"
          />
          <div className="mt-3 flex items-center justify-between border-t border-neutral-50 pt-3 dark:border-neutral-800">
            <span className="text-xs text-neutral-400">Toplam (6 ay)</span>
            <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
              0 rezervasyon
            </span>
          </div>
        </div>
      </div>

      {/* ── Son faturalar tablosu ─────────────────────────────────────────── */}
      {invoices.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          <h2 className="mb-4 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            Son Komisyon Faturaları
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-neutral-400 dark:border-neutral-800">
                  <th className="pb-2 text-left font-medium">Fatura No</th>
                  <th className="pb-2 text-left font-medium">Tür</th>
                  <th className="pb-2 text-right font-medium">Komisyon</th>
                  <th className="pb-2 text-left font-medium">Durum</th>
                  <th className="pb-2 text-left font-medium">Tarih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800">
                {invoices.slice(0, 6).map((inv) => (
                  <tr key={inv.id}>
                    <td className="py-2 font-mono text-xs">{inv.invoice_number}</td>
                    <td className="py-2">
                      <span className={clsx(
                        'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                        inv.kind === 'agency'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                      )}>
                        {inv.kind === 'agency' ? 'Acente' : 'Tedarikçi'}
                      </span>
                    </td>
                    <td className="py-2 text-right font-semibold text-[color:var(--manage-primary)]">
                      {parseFloat(inv.commission_total).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {inv.currency_code}
                    </td>
                    <td className="py-2">
                      <span className={clsx(
                        'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                        inv.status === 'issued' ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-600'
                      )}>
                        {inv.status === 'issued' ? 'Kesildi' : 'İptal'}
                      </span>
                    </td>
                    <td className="py-2 text-xs text-neutral-400">
                      {new Date(inv.created_at).toLocaleDateString('tr-TR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  )
}
