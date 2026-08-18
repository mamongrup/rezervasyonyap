'use client'

import {
  deleteAllSeoNotFoundLogs,
  deleteSeoNotFoundLog,
  listSeoNotFoundLogs,
  type SeoNotFoundLogRow,
} from '@/lib/travel-api'
import { getStoredAuthToken } from '@/lib/auth-storage'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useVitrinHref } from '@/hooks/use-vitrin-href'

export default function SeoNotFoundLogsSection() {
  const vitrinPath = useVitrinHref()
  const [nfLogs, setNfLogs] = useState<SeoNotFoundLogRow[]>([])
  const [nfErr, setNfErr] = useState<string | null>(null)
  const [nfLoading, setNfLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const reloadNotFoundLogs = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) return
    setNfErr(null)
    setNfLoading(true)
    try {
      const l = await listSeoNotFoundLogs(token)
      setNfLogs(l.logs)
    } catch (e) {
      setNfErr(e instanceof Error ? e.message : 'nf_logs_failed')
    } finally {
      setNfLoading(false)
    }
  }, [])

  useEffect(() => {
    void reloadNotFoundLogs()
  }, [reloadNotFoundLogs])

  const deleteOne = async (row: SeoNotFoundLogRow) => {
    if (!window.confirm(`Bu kırık bağlantı kaydı silinsin mi?\n${row.path}`)) return
    const token = getStoredAuthToken()
    if (!token) return
    setDeletingId(row.id)
    setNfErr(null)
    try {
      await deleteSeoNotFoundLog(token, row.id)
      setNfLogs((current) => current.filter((item) => item.id !== row.id))
    } catch (e) {
      setNfErr(e instanceof Error ? e.message : 'nf_log_delete_failed')
    } finally {
      setDeletingId(null)
    }
  }

  const deleteAll = async () => {
    if (!window.confirm(`${nfLogs.length} kırık bağlantı kaydının tamamı silinsin mi?`)) return
    const token = getStoredAuthToken()
    if (!token) return
    setDeletingId('all')
    setNfErr(null)
    try {
      await deleteAllSeoNotFoundLogs(token)
      setNfLogs([])
    } catch (e) {
      setNfErr(e instanceof Error ? e.message : 'nf_logs_delete_failed')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900/40">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-medium text-neutral-900 dark:text-white">404 günlüğü</h2>
        <div className="flex items-center gap-3">
          {nfLogs.length > 0 ? (
            <button type="button" disabled={deletingId !== null} onClick={() => void deleteAll()} className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50 dark:text-red-400">
              {deletingId === 'all' ? 'Siliniyor…' : 'Tümünü sil'}
            </button>
          ) : null}
          <button type="button" disabled={nfLoading || deletingId !== null} onClick={() => void reloadNotFoundLogs()} className="text-sm text-link-inline disabled:opacity-50">
            {nfLoading ? '…' : 'Yenile'}
          </button>
        </div>
      </div>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        Ön yüzde yakalanan 404 istekleri (<code className="font-mono text-xs">not_found_logs</code>). Sık tekrarlanan
        yollar için{' '}
        <Link href={vitrinPath('/manage/seo/redirects')} className="font-medium text-primary-600 underline dark:text-primary-400">
          301 yönlendirme
        </Link>{' '}
        ekleyebilirsiniz.
      </p>
      {nfErr ? <p className="mt-3 text-sm text-red-600 dark:text-red-400">{nfErr}</p> : null}
      <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/50">
              <th className="px-3 py-2 font-medium">Yol</th>
              <th className="px-3 py-2 font-medium">Dil</th>
              <th className="px-3 py-2 font-medium">Hit</th>
              <th className="px-3 py-2 font-medium">Son görülme</th>
              <th className="px-3 py-2 text-right font-medium">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {nfLoading && nfLogs.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-neutral-500" colSpan={5}>
                  Yükleniyor…
                </td>
              </tr>
            ) : nfLogs.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-neutral-500" colSpan={5}>
                  Kayıt yok.
                </td>
              </tr>
            ) : (
              nfLogs.map((row) => (
                <tr key={row.id} className="border-t border-neutral-100 dark:border-neutral-800">
                  <td className="max-w-md truncate px-3 py-2 font-mono text-xs" title={row.path}>
                    {row.path}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-neutral-600 dark:text-neutral-400">
                    {row.locale_id ?? '—'}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{row.hit_count}</td>
                  <td className="px-3 py-2 text-xs text-neutral-600 dark:text-neutral-400">{row.last_seen}</td>
                  <td className="px-3 py-2 text-right">
                    <button type="button" disabled={deletingId !== null} onClick={() => void deleteOne(row)} className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50 dark:text-red-400">
                      {deletingId === row.id ? 'Siliniyor…' : 'Sil'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
