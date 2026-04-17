'use client'

import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { getStoredAuthToken } from '@/lib/auth-storage'
import { getAdminReservations, type StaffReservationRow } from '@/lib/travel-api'
import clsx from 'clsx'
import { BarChart3, CalendarRange, ExternalLink, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

type Period = 7 | 30 | 90 | 0

function parseIso(s: string): Date | null {
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

function startOfPeriod(days: Period): Date | null {
  if (days === 0) return null
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(0, 0, 0, 0)
  return d
}

const STATUS_LABELS: Record<string, string> = {
  inquiry: 'Sorgu',
  held: 'Beklemede',
  confirmed: 'Onaylı',
  cancelled: 'İptal',
  completed: 'Tamamlandı',
  payment_pending: 'Ödeme bekliyor',
}

export default function FinanceReportsClient() {
  const vitrinPath = useVitrinHref()
  const [period, setPeriod] = useState<Period>(30)
  const [rows, setRows] = useState<StaffReservationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) {
      setError('Oturum bulunamadı.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const r = await getAdminReservations(token, { limit: 500 })
      setRows(r.reservations ?? [])
    } catch (e) {
      const raw = e instanceof Error ? e.message : 'Yüklenemedi'
      setError(
        raw === 'forbidden'
          ? 'Bu özet için yönetici oturumu ve kullanıcı okuma izni gerekir.'
          : raw,
      )
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const start = startOfPeriod(period)
    if (!start) return rows
    return rows.filter((r) => {
      const d = parseIso(r.created_at)
      return d != null && d >= start
    })
  }, [rows, period])

  const byStatus = useMemo(() => {
    const m: Record<string, number> = {}
    for (const r of filtered) {
      const k = r.status || 'unknown'
      m[k] = (m[k] ?? 0) + 1
    }
    return Object.entries(m).sort((a, b) => b[1] - a[1])
  }, [filtered])

  const recent = useMemo(() => {
    return [...filtered]
      .sort((a, b) => (parseIso(b.created_at)?.getTime() ?? 0) - (parseIso(a.created_at)?.getTime() ?? 0))
      .slice(0, 12)
  }, [filtered])

  const periodLabel = period === 0 ? 'Tümü (son 500 kayıt)' : `Son ${period} gün`

  return (
    <div className="max-w-5xl space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Mali özet</h1>
            <p className="mt-1 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
              Rezervasyon kayıtlarından hızlı durum dağılımı. Detaylı muhasebe ve komisyon faturaları için ilgili sayfaları
              kullanın.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900"
        >
          <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
          Yenile
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-sm text-neutral-600 dark:text-neutral-400">
          <CalendarRange className="h-4 w-4" />
          Dönem:
        </span>
        {([7, 30, 90, 0] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setPeriod(d)}
            className={clsx(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              period === d
                ? 'bg-[color:var(--manage-primary)] text-white'
                : 'border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300',
            )}
          >
            {d === 0 ? 'Tümü' : `${d} gün`}
          </button>
        ))}
        <span className="text-xs text-neutral-500">{periodLabel}</span>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900/40">
          <p className="text-xs text-neutral-500">Rezervasyon (filtreli)</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900 dark:text-white">{loading ? '…' : filtered.length}</p>
        </div>
        {byStatus.slice(0, 3).map(([st, n]) => (
          <div
            key={st}
            className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900/40"
          >
            <p className="text-xs text-neutral-500">{STATUS_LABELS[st] ?? st}</p>
            <p className="mt-1 text-2xl font-bold text-neutral-900 dark:text-white">{loading ? '…' : n}</p>
          </div>
        ))}
      </div>

      {byStatus.length > 0 ? (
        <section>
          <h2 className="mb-3 text-base font-semibold text-neutral-900 dark:text-white">Durum dağılımı</h2>
          <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-50 text-xs uppercase text-neutral-500 dark:bg-neutral-800">
                <tr>
                  <th className="px-3 py-2 text-left">Durum</th>
                  <th className="px-3 py-2 text-right">Adet</th>
                </tr>
              </thead>
              <tbody>
                {byStatus.map(([st, n]) => (
                  <tr key={st} className="border-t border-neutral-100 dark:border-neutral-800">
                    <td className="px-3 py-2">{STATUS_LABELS[st] ?? st}</td>
                    <td className="px-3 py-2 text-right font-medium">{n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-base font-semibold text-neutral-900 dark:text-white">Son kayıtlar</h2>
        <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 text-xs uppercase text-neutral-500 dark:bg-neutral-800">
              <tr>
                <th className="px-3 py-2 text-left">Kod</th>
                <th className="px-3 py-2 text-left">Durum</th>
                <th className="px-3 py-2 text-left">İlan</th>
                <th className="px-3 py-2 text-left">Oluşturulma</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-neutral-500">
                    Yükleniyor…
                  </td>
                </tr>
              ) : recent.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-neutral-500">
                    Bu dönemde kayıt yok.
                  </td>
                </tr>
              ) : (
                recent.map((r) => (
                  <tr key={r.id} className="border-t border-neutral-100 dark:border-neutral-800">
                    <td className="px-3 py-2 font-mono text-xs">{r.public_code}</td>
                    <td className="px-3 py-2">{STATUS_LABELS[r.status] ?? r.status}</td>
                    <td className="px-3 py-2 text-xs text-neutral-600">{r.listing_slug || '—'}</td>
                    <td className="px-3 py-2 text-xs text-neutral-600">
                      {r.created_at?.slice(0, 19)?.replace('T', ' ') ?? '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href={vitrinPath('/manage/reservations')}
          className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
        >
          Tüm rezervasyonlar
          <ExternalLink className="h-3.5 w-3.5 opacity-60" />
        </Link>
        <Link
          href={vitrinPath('/manage/finance/invoices')}
          className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
        >
          Komisyon faturaları
          <ExternalLink className="h-3.5 w-3.5 opacity-60" />
        </Link>
        <Link
          href={vitrinPath('/manage/finance/payment-gateways')}
          className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
        >
          Sanal POS
          <ExternalLink className="h-3.5 w-3.5 opacity-60" />
        </Link>
      </div>
    </div>
  )
}
