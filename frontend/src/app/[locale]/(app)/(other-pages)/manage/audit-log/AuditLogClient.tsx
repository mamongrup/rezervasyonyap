'use client'

import { getStoredAuthToken } from '@/lib/auth-storage'
import { listAdminAuditLog, type AdminAuditEvent } from '@/lib/travel-api'
import clsx from 'clsx'
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

const ACTION_CLASSES: Record<string, string> = {
  create: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  update: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
  delete: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
  login: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400',
  grant: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  revoke: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400',
}

function getActionClass(action: string) {
  for (const key of Object.keys(ACTION_CLASSES)) {
    if (action.toLowerCase().includes(key)) return ACTION_CLASSES[key]
  }
  return 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
}

const PAGE_SIZE = 25

export default function AuditLogClient() {
  const [events, setEvents] = useState<AdminAuditEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterUserId, setFilterUserId] = useState('')
  const [page, setPage] = useState(0)

  const token = getStoredAuthToken() ?? ''

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await listAdminAuditLog(token, filterUserId ? { user_id: filterUserId } : undefined)
      setEvents(res.events)
      setPage(0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Denetim günlüğü yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [token, filterUserId])

  useEffect(() => { void load() }, [load])

  const filtered = useMemo(() => {
    if (!search.trim()) return events
    const s = search.toLowerCase()
    return events.filter(
      (e) =>
        e.action.toLowerCase().includes(s) ||
        e.target_type.toLowerCase().includes(s) ||
        (e.user_id ?? '').includes(s),
    )
  }, [events, search])

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-950/40">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Denetim Günlüğü</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Sistemdeki tüm yönetici eylemleri ve değişikliklerin kaydı.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700"
        >
          <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
          Yenile
        </button>
      </div>

      {error ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
          <button type="button" onClick={() => setError(null)} className="ml-auto"><X className="h-4 w-4" /></button>
        </div>
      ) : null}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            placeholder="Eylem veya hedef ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2 pl-9 pr-3 text-sm focus:border-[color:var(--manage-primary)] focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Kullanıcı ID filtrele…"
            value={filterUserId}
            onChange={(e) => setFilterUserId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void load()}
            className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 font-mono text-sm focus:border-[color:var(--manage-primary)] focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
          />
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-xl bg-[color:var(--manage-primary)] px-3 py-2 text-sm font-semibold text-white"
          >
            Uygula
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-neutral-400">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />Yükleniyor…
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
            <Activity className="mb-3 h-10 w-10 opacity-40" />
            <p className="text-sm">Kayıt bulunamadı.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-neutral-50 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:border-neutral-800 dark:bg-neutral-800/50">
                  <th className="py-3 pl-5 text-left">Eylem</th>
                  <th className="py-3 text-left">Hedef</th>
                  <th className="py-3 text-left">Kullanıcı</th>
                  <th className="py-3 text-left">Kurum</th>
                  <th className="py-3 pr-5 text-right">Tarih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800">
                {paginated.map((e) => (
                  <tr key={e.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                    <td className="py-3 pl-5">
                      <span className={clsx('rounded-full px-2 py-0.5 text-xs font-medium', getActionClass(e.action))}>
                        {e.action}
                      </span>
                    </td>
                    <td className="py-3 text-xs text-neutral-600 dark:text-neutral-400">{e.target_type}</td>
                    <td className="py-3 font-mono text-xs text-neutral-500">
                      {e.user_id ? e.user_id.slice(0, 8) + '…' : '—'}
                    </td>
                    <td className="py-3 font-mono text-xs text-neutral-500">
                      {e.organization_id ? e.organization_id.slice(0, 8) + '…' : '—'}
                    </td>
                    <td className="py-3 pr-5 text-right text-xs text-neutral-400">
                      {new Date(e.created_at).toLocaleString('tr-TR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-neutral-400">
            {filtered.length} kayıt — sayfa {page + 1}/{totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="flex items-center gap-1 rounded-xl border border-neutral-200 px-3 py-1.5 text-xs disabled:opacity-40 dark:border-neutral-700"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Önceki
            </button>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="flex items-center gap-1 rounded-xl border border-neutral-200 px-3 py-1.5 text-xs disabled:opacity-40 dark:border-neutral-700"
            >
              Sonraki
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
