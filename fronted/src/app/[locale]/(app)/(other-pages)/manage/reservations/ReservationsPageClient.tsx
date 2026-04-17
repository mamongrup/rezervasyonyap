'use client'

import { getStoredAuthToken } from '@/lib/auth-storage'
import { getAdminReservations, getAuthMe, getStaffReservations, type StaffReservationRow } from '@/lib/travel-api'
import { isFullAdminUser } from '@/lib/manage-nav-access'
import clsx from 'clsx'
import {
  Calendar,
  Check,
  Clock,
  Download,
  Loader2,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

type FilterStatus = 'all' | 'confirmed' | 'pending' | 'payment_pending' | 'cancelled' | 'completed'

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Onaylandı',
  pending: 'Talep',
  payment_pending: 'Ödeme bekliyor',
  cancelled: 'İptal',
  completed: 'Tamamlandı',
}

const STATUS_CLASS: Record<string, string> = {
  confirmed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  payment_pending: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
  completed: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={clsx('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_CLASS[status] ?? STATUS_CLASS.pending)}>
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

function KpiCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}22` }}>
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <div>
        <p className="text-xl font-bold text-neutral-900 dark:text-neutral-100">{value}</p>
        <p className="text-xs text-neutral-500">{label}</p>
      </div>
    </div>
  )
}

export default function ReservationsPageClient() {
  const [reservations, setReservations] = useState<StaffReservationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [adminResolved, setAdminResolved] = useState<boolean | null>(null)

  const token = getStoredAuthToken() ?? ''

  // Önce rol tespiti yap, sonra yükle
  useEffect(() => {
    if (!token) { setAdminResolved(false); return }
    void getAuthMe(token).then((u) => {
      const perms = Array.isArray(u.permissions) ? u.permissions : []
      const roles = Array.isArray(u.roles) ? u.roles : []
      setAdminResolved(isFullAdminUser(perms, roles))
    }).catch(() => { setAdminResolved(false) })
  }, [token])

  const load = useCallback(async (asAdmin: boolean) => {
    setLoading(true)
    setError(null)
    try {
      const res = asAdmin
        ? await getAdminReservations(token)
        : await getStaffReservations(token)
      setReservations(res.reservations)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Rezervasyonlar yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (adminResolved === null) return
    void load(adminResolved)
  }, [adminResolved, load])

  const filtered = useMemo(() => {
    let list = reservations
    if (filterStatus !== 'all') list = list.filter((r) => r.status === filterStatus)
    if (search.trim()) {
      const s = search.toLowerCase()
      list = list.filter(
        (r) =>
          r.public_code.toLowerCase().includes(s) ||
          r.guest_email.toLowerCase().includes(s) ||
          r.listing_slug.toLowerCase().includes(s),
      )
    }
    return list
  }, [reservations, filterStatus, search])

  // Counts
  const counts = useMemo(() => {
    const c = { confirmed: 0, pending: 0, payment_pending: 0, cancelled: 0, completed: 0 }
    reservations.forEach((r) => {
      if (r.status in c) c[r.status as keyof typeof c]++
    })
    return c
  }, [reservations])

  const exportCsv = () => {
    const rows = [
      ['Kod', 'Durum', 'E-posta', 'İlan', 'Tarih'],
      ...filtered.map((r) => [r.public_code, STATUS_LABEL[r.status] ?? r.status, r.guest_email, r.listing_slug, new Date(r.created_at).toLocaleDateString('tr-TR')]),
    ]
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`
    a.download = `rezervasyonlar-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Başlık */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Rezervasyonlar</h1>
          <p className="mt-1 text-sm text-neutral-500">Tüm rezervasyon ve teklifleri yönetin.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load(adminResolved ?? false)}
            className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700"
          >
            <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300"
          >
            <Download className="h-4 w-4" />
            CSV İndir
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
          <button type="button" onClick={() => setError(null)} className="ml-auto"><X className="h-4 w-4" /></button>
        </div>
      ) : null}

      {/* KPI Cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard icon={Clock} label="Talep" value={counts.pending} color="#f59e0b" />
        <KpiCard icon={Calendar} label="Ödeme bekliyor" value={counts.payment_pending} color="#3b82f6" />
        <KpiCard icon={Check} label="Onaylandı" value={counts.confirmed} color="#10b981" />
        <KpiCard icon={X} label="İptal" value={counts.cancelled} color="#ef4444" />
        <KpiCard icon={Check} label="Tamamlandı" value={counts.completed} color="#6b7280" />
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            placeholder="Kod, e-posta veya ilan ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2 pl-9 pr-3 text-sm focus:border-[color:var(--manage-primary)] focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
          className="rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
        >
          <option value="all">Tüm durumlar</option>
          <option value="pending">Talep</option>
          <option value="payment_pending">Ödeme bekliyor</option>
          <option value="confirmed">Onaylandı</option>
          <option value="cancelled">İptal</option>
          <option value="completed">Tamamlandı</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-neutral-400">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />Yükleniyor…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
            <Calendar className="mb-3 h-10 w-10 opacity-40" />
            <p className="text-sm">
              {reservations.length === 0 ? 'Henüz rezervasyon yok.' : 'Filtreyle eşleşen rezervasyon yok.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-neutral-50 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:border-neutral-800 dark:bg-neutral-800/50">
                  <th className="py-3 pl-5 text-left">Rezervasyon Kodu</th>
                  <th className="py-3 text-left">İlan</th>
                  <th className="py-3 text-left">Misafir</th>
                  <th className="py-3 text-left">Durum</th>
                  <th className="py-3 pr-5 text-right">Tarih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                    <td className="py-3 pl-5">
                      <span className="font-mono text-xs font-semibold text-[color:var(--manage-primary)]">
                        {r.public_code}
                      </span>
                    </td>
                    <td className="py-3 max-w-[180px] truncate text-xs text-neutral-600 dark:text-neutral-400">
                      {r.listing_slug}
                    </td>
                    <td className="py-3 text-xs text-neutral-600 dark:text-neutral-400">
                      {r.guest_email}
                    </td>
                    <td className="py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="py-3 pr-5 text-right text-xs text-neutral-400">
                      {new Date(r.created_at).toLocaleDateString('tr-TR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="mt-3 text-xs text-neutral-400">
        {filtered.length} rezervasyon{filtered.length !== reservations.length ? ` / toplam ${reservations.length}` : ''}
      </p>
    </div>
  )
}
