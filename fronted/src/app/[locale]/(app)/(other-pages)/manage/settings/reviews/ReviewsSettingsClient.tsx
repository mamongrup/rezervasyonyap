'use client'

import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { getStoredAuthToken } from '@/lib/auth-storage'
import { listReviewsAdmin, patchReviewModeration, type Review } from '@/lib/travel-api'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

type StatusFilter = 'pending' | 'approved' | 'rejected' | 'hidden' | 'all'

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  hidden: 'bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300',
}

export default function ReviewsSettingsClient() {
  const vitrinPath = useVitrinHref()
  const [filter, setFilter] = useState<StatusFilter>('pending')
  const [rows, setRows] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actingId, setActingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) {
      setError('Oturum gerekli')
      setLoading(false)
      return
    }
    setError(null)
    setLoading(true)
    try {
      const r = await listReviewsAdmin(token, { status: filter, limit: 200 })
      setRows(Array.isArray(r.reviews) ? r.reviews : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Liste yüklenemedi')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    void load()
  }, [load])

  async function moderate(id: string, status: 'approved' | 'rejected' | 'hidden') {
    const token = getStoredAuthToken()
    if (!token) return
    setActingId(id)
    setError(null)
    try {
      await patchReviewModeration(token, id, { status })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Güncelleme başarısız')
    } finally {
      setActingId(null)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">Yorum yönetimi</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Misafir yorumları <strong>pending</strong> ile gelir; onaylandığında vitrin ve listelerde görünür. İlan UUID
          için{' '}
          <Link href={vitrinPath('/manage/catalog')} className="text-primary-600 underline dark:text-primary-400">
            katalog
          </Link>{' '}
          üzerinden ilan detayına gidin.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Durum:</label>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as StatusFilter)}
          className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="pending">Bekleyen</option>
          <option value="approved">Onaylı</option>
          <option value="rejected">Reddedilen</option>
          <option value="hidden">Gizli</option>
          <option value="all">Tümü</option>
        </select>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700"
        >
          Yenile
        </button>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">{error}</p>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-700">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Durum</th>
                <th className="px-3 py-2 text-left font-semibold">Puan</th>
                <th className="px-3 py-2 text-left font-semibold">Varlık</th>
                <th className="px-3 py-2 text-left font-semibold">Metin</th>
                <th className="px-3 py-2 text-left font-semibold">Tarih</th>
                <th className="px-3 py-2 text-left font-semibold">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-neutral-500">
                    Kayıt yok.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[r.status] ?? 'bg-neutral-100 text-neutral-700'}`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono">{r.rating}</td>
                    <td className="max-w-[140px] px-3 py-2 font-mono text-xs text-neutral-600 dark:text-neutral-400">
                      <div>{r.entity_type}</div>
                      <div className="truncate" title={r.entity_id}>
                        {r.entity_id}
                      </div>
                    </td>
                    <td className="max-w-md px-3 py-2 text-neutral-700 dark:text-neutral-300">
                      <div className="font-medium">{r.title || '—'}</div>
                      <div className="line-clamp-2 text-xs text-neutral-500">{r.body || ''}</div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-neutral-500">
                      {r.created_at ? new Date(r.created_at).toLocaleString('tr-TR') : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-1">
                        {r.status !== 'approved' && (
                          <button
                            type="button"
                            disabled={actingId === r.id}
                            onClick={() => void moderate(r.id, 'approved')}
                            className="text-left text-xs font-medium text-green-600 underline disabled:opacity-50 dark:text-green-400"
                          >
                            Onayla
                          </button>
                        )}
                        {r.status !== 'rejected' && (
                          <button
                            type="button"
                            disabled={actingId === r.id}
                            onClick={() => void moderate(r.id, 'rejected')}
                            className="text-left text-xs font-medium text-red-600 underline disabled:opacity-50 dark:text-red-400"
                          >
                            Reddet
                          </button>
                        )}
                        {r.status !== 'hidden' && r.status !== 'rejected' && (
                          <button
                            type="button"
                            disabled={actingId === r.id}
                            onClick={() => void moderate(r.id, 'hidden')}
                            className="text-left text-xs font-medium text-neutral-600 underline disabled:opacity-50"
                          >
                            Gizle
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
