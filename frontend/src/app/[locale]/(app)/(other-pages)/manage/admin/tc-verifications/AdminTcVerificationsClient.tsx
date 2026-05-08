'use client'

import { getStoredAuthToken } from '@/lib/auth-storage'
import { formatManageApiCatch } from '@/lib/manage-api-error-tr'
import {
  listAdminTcVerificationRequests,
  reviewAdminTcVerificationRequest,
  type TcVerificationAdminRequestRow,
} from '@/lib/travel-api'
import { CheckCircle2, Loader2, RefreshCw, XCircle } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

export default function AdminTcVerificationsClient() {
  const [rows, setRows] = useState<TcVerificationAdminRequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [working, setWorking] = useState<string | null>(null)

  const load = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) {
      setMsg('Oturum bulunamadı.')
      setRows([])
      setLoading(false)
      return
    }
    setLoading(true)
    setMsg('')
    try {
      const r = await listAdminTcVerificationRequests(token)
      setRows(r.requests)
    } catch (e: unknown) {
      setMsg(formatManageApiCatch(e, 'Liste yüklenemedi'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function onApprove(id: string) {
    const token = getStoredAuthToken()
    if (!token) return
    setWorking(id)
    try {
      await reviewAdminTcVerificationRequest(token, id, { decision: 'approve' })
      setMsg('Onaylandı. Kullanıcı hesabında kimlik doğrulandı olarak görünür.')
      await load()
    } catch (e: unknown) {
      setMsg(formatManageApiCatch(e, 'Onay başarısız'))
    } finally {
      setWorking(null)
    }
  }

  async function onReject(id: string) {
    const token = getStoredAuthToken()
    if (!token) return
    setWorking(id)
    try {
      await reviewAdminTcVerificationRequest(token, id, {
        decision: 'reject',
        admin_note: notes[id]?.trim() || undefined,
      })
      setMsg('Başvuru reddedildi. Kullanıcıya gerekçe iletilebilir.')
      await load()
    } catch (e: unknown) {
      setMsg(formatManageApiCatch(e, 'Red başarısız'))
    } finally {
      setWorking(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">TC kimlik başvuruları</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Bekleyen başvuruları inceleyin. Onayda kullanıcıya TC kaydı ve doğrulama zamanı yazılır.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          <RefreshCw className="h-4 w-4" />
          Yenile
        </button>
      </div>

      {msg ? (
        <p className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-800 dark:border-neutral-700 dark:bg-neutral-900/50 dark:text-neutral-200">
          {msg}
        </p>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Yükleniyor…
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-neutral-500">Bekleyen başvuru yok.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700">
          <table className="min-w-[920px] w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/60">
              <tr>
                <th className="px-4 py-3 font-medium">E-posta</th>
                <th className="px-4 py-3 font-medium">Ad Soyad</th>
                <th className="px-4 py-3 font-medium">TC No</th>
                <th className="px-4 py-3 font-medium">Doğum</th>
                <th className="px-4 py-3 font-medium">Gönderim</th>
                <th className="px-4 py-3 font-medium w-[280px]">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {rows.map((r) => (
                <tr key={r.id} className="bg-white dark:bg-neutral-900/40">
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium text-neutral-900 dark:text-neutral-100">{r.email}</div>
                    <div className="text-xs text-neutral-400">{r.user_id}</div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    {r.first_name} {r.last_name}
                    {r.display_name?.trim() ? (
                      <div className="text-xs text-neutral-500">Hesap: {r.display_name}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 align-top font-mono text-xs">{r.tc_kimlik_no}</td>
                  <td className="px-4 py-3 align-top">{r.birth_year}</td>
                  <td className="px-4 py-3 align-top text-xs text-neutral-600 dark:text-neutral-400">
                    {new Date(r.submitted_at).toLocaleString('tr-TR')}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-col gap-2">
                      <textarea
                        value={notes[r.id] ?? ''}
                        onChange={(e) => setNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                        placeholder="Ret gerekçesi (isteğe bağlı)"
                        rows={2}
                        className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-800"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={working === r.id}
                          onClick={() => void onApprove(r.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {working === r.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          Onayla
                        </button>
                        <button
                          type="button"
                          disabled={working === r.id}
                          onClick={() => void onReject(r.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-100 disabled:opacity-50 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Reddet
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
