'use client'

import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { getStoredAuthToken } from '@/lib/auth-storage'
import { listNotificationTriggers, type NotificationTrigger } from '@/lib/travel-api'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

export default function NotificationsPushClient() {
  const vitrinPath = useVitrinHref()
  const [triggers, setTriggers] = useState<NotificationTrigger[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      const t = await listNotificationTriggers(token)
      setTriggers(Array.isArray(t.triggers) ? t.triggers : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yükleme başarısız')
      setTriggers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">Push bildirimleri</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Tarayıcı ve mobil cihaz push bildirimleri için altyapı (VAPID / FCM / APNs) bu projede henüz üretime bağlanmadı.
        </p>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100">
        <p className="font-medium">Mevcut durum</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>
            Bildirim <strong>kuyruğu</strong> şu an <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/50">sms</code>,{' '}
            <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/50">email</code> ve{' '}
            <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/50">whatsapp</code> kanallarını destekler.
          </li>
          <li>Web Push veya mobil push için uçtan uca akış (izin isteme, abonelik kaydı, gönderim) planlanmalıdır.</li>
        </ul>
        <p className="mt-3">
          <Link
            href={vitrinPath('/manage/admin/settings/notifications')}
            className="font-medium text-amber-900 underline dark:text-amber-200"
          >
            Bildirim ayarları ve kuyruk
          </Link>{' '}
          sayfasından diğer kanalları yönetebilirsiniz.
        </p>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-white">Olay tetikleyicileri (referans)</h2>
        <p className="mb-4 text-sm text-neutral-500">
          Gelecekte push eklendiğinde aynı tetikleyiciler kullanılabilir. Liste API üzerinden gelir.
        </p>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-700">
            <table className="w-full text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-neutral-700 dark:text-neutral-300">Kod</th>
                  <th className="px-4 py-3 text-left font-semibold text-neutral-700 dark:text-neutral-300">Açıklama</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {triggers.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-8 text-center text-neutral-500">
                      Tetikleyici bulunamadı.
                    </td>
                  </tr>
                ) : (
                  triggers.map((t) => (
                    <tr key={t.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                      <td className="px-4 py-3 font-mono text-xs text-neutral-800 dark:text-neutral-200">{t.code}</td>
                      <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">{t.description || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
