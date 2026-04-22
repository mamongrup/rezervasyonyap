'use client'

import React from 'react'
import { ManageAccessGuard } from '@/lib/use-manage-access'
import { getStoredAuthToken } from '@/lib/auth-storage'

export default function ManageListingReportsPage() {
  return (
    <ManageAccessGuard
      required={{ permissionsPrefixAny: ['admin.'], rolesAny: ['admin'] }}
      featureHint="admin.listing-reports"
    >
      <ListingReportsClient />
    </ManageAccessGuard>
  )
}

type ReportRow = {
  id: string
  listing_id: string
  reason_code: string
  message: string
  reporter_email: string
  status: 'open' | 'reviewing' | 'resolved' | 'rejected'
  created_at: string
}

const REASON_LABELS: Record<string, string> = {
  inappropriate: 'Uygunsuz içerik',
  fake: 'Sahte/yanıltıcı',
  scam: 'Dolandırıcılık şüphesi',
  wrong_info: 'Yanlış bilgi',
  price_issue: 'Fiyat sorunu',
  other: 'Diğer',
}

const STATUS_OPTIONS: { code: ReportRow['status']; label: string }[] = [
  { code: 'open', label: 'Açık' },
  { code: 'reviewing', label: 'İnceleniyor' },
  { code: 'resolved', label: 'Çözüldü' },
  { code: 'rejected', label: 'Reddedildi' },
]

function ListingReportsClient() {
  const [rows, setRows] = React.useState<ReportRow[]>([])
  const [loading, setLoading] = React.useState(false)
  const [err, setErr] = React.useState<string | null>(null)
  const [statusFilter, setStatusFilter] = React.useState<'all' | ReportRow['status']>('open')
  const [busyId, setBusyId] = React.useState<string | null>(null)
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? ''

  const load = React.useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) {
      setErr('Oturum bulunamadı.')
      return
    }
    setLoading(true)
    setErr(null)
    try {
      const qs = statusFilter === 'all' ? '' : `?status=${statusFilter}`
      const res = await fetch(`${apiBase}/api/v1/admin/listing-reports${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) {
        setErr(data?.error ?? `liste_${res.status}`)
        return
      }
      setRows((data.reports ?? []) as ReportRow[])
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'load_failed')
    } finally {
      setLoading(false)
    }
  }, [apiBase, statusFilter])

  React.useEffect(() => {
    void load()
  }, [load])

  async function changeStatus(id: string, status: ReportRow['status']) {
    const token = getStoredAuthToken()
    if (!token) return
    setBusyId(id)
    try {
      const res = await fetch(`${apiBase}/api/v1/admin/listing-reports/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setErr(j?.error ?? `patch_${res.status}`)
        return
      }
      await load()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
            İlan şikayetleri
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Vitrinden gönderilen tüm şikayet ve sorun bildirimleri.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-neutral-500">Durum</label>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as typeof statusFilter)
            }
            className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100"
          >
            <option value="all">Tümü</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.code} value={s.code}>
                {s.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100"
          >
            Yenile
          </button>
        </div>
      </header>

      {err ? <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-900/40 dark:text-rose-200">{err}</p> : null}
      {loading ? <p className="text-sm text-neutral-400">Yükleniyor…</p> : null}

      {!loading && rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
          <p className="text-sm text-neutral-500">Bu filtrede kayıt yok.</p>
        </div>
      ) : null}

      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-neutral-200 dark:border-neutral-700">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500 dark:bg-neutral-800">
              <tr>
                <th className="px-3 py-2">Tarih</th>
                <th className="px-3 py-2">İlan</th>
                <th className="px-3 py-2">Neden</th>
                <th className="px-3 py-2">Mesaj</th>
                <th className="px-3 py-2">E-posta</th>
                <th className="px-3 py-2">Durum</th>
                <th className="px-3 py-2">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {rows.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="px-3 py-2 text-xs text-neutral-500">
                    {new Date(r.created_at).toLocaleString('tr-TR')}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-neutral-600">
                    {r.listing_id.slice(0, 8)}…
                  </td>
                  <td className="px-3 py-2">{REASON_LABELS[r.reason_code] ?? r.reason_code}</td>
                  <td className="px-3 py-2 max-w-[26rem] whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">
                    {r.message || <span className="text-neutral-400">—</span>}
                  </td>
                  <td className="px-3 py-2 text-xs text-neutral-600">
                    {r.reporter_email || <span className="text-neutral-400">—</span>}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        'inline-flex rounded-full px-2 py-0.5 text-xs ' +
                        (r.status === 'open'
                          ? 'bg-amber-100 text-amber-700'
                          : r.status === 'reviewing'
                            ? 'bg-blue-100 text-blue-700'
                            : r.status === 'resolved'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-neutral-200 text-neutral-700')
                      }
                    >
                      {STATUS_OPTIONS.find((s) => s.code === r.status)?.label ?? r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      disabled={busyId === r.id}
                      value={r.status}
                      onChange={(e) =>
                        void changeStatus(r.id, e.target.value as ReportRow['status'])
                      }
                      className="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs disabled:opacity-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.code} value={s.code}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
