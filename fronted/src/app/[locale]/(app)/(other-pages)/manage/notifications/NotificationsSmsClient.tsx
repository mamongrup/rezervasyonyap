'use client'

import { getStoredAuthToken } from '@/lib/auth-storage'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { listNotificationJobs, sendNetgsmTestSms, type NotificationJob } from '@/lib/travel-api'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

function EnvBadge({ name, description, required }: { name: string; description: string; required?: boolean }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-neutral-200 p-3 dark:border-neutral-700">
      <code className="mt-0.5 shrink-0 rounded bg-neutral-100 px-2 py-0.5 text-xs font-mono dark:bg-neutral-800 dark:text-neutral-300">
        {name}
      </code>
      <div className="min-w-0">
        <p className="text-sm text-neutral-700 dark:text-neutral-300">{description}</p>
        {required && (
          <span className="mt-1 inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
            Zorunlu
          </span>
        )}
      </div>
    </div>
  )
}

export default function NotificationsSmsClient() {
  const vitrinPath = useVitrinHref()
  const [smsJobs, setSmsJobs] = useState<NotificationJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [gsm, setGsm] = useState('')
  const [message, setMessage] = useState('RezervasyonYap test SMS')
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<string | null>(null)

  const loadJobs = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const j = await listNotificationJobs(token, { limit: 80 })
      const jobs = Array.isArray(j.jobs) ? j.jobs : []
      setSmsJobs(jobs.filter((x) => x.channel === 'sms'))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kuyruk yüklenemedi')
      setSmsJobs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadJobs()
  }, [loadJobs])

  async function onSendTest(e: React.FormEvent) {
    e.preventDefault()
    const token = getStoredAuthToken()
    if (!token) return
    setSending(true)
    setSendResult(null)
    try {
      const res = await sendNetgsmTestSms(token, { gsm: gsm.trim(), message: message.trim() })
      setSendResult(res.provider_raw ? `Gönderildi. Yanıt: ${res.provider_raw.slice(0, 200)}` : 'Gönderildi.')
      void loadJobs()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gönderim başarısız'
      const low = msg.toLowerCase()
      if (msg.includes('403') || low.includes('forbidden') || low.includes('netgsm_sms_403')) {
        setSendResult(
          'Bu işlem için admin.integrations.write izni gerekir. NetGSM ortam değişkenleri sunucuda tanımlı olmalıdır.',
        )
      } else {
        setSendResult(msg)
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">SMS (NetGSM)</h1>
        <p className="mt-1 text-sm text-neutral-500">
          NetGSM ortam değişkenleri ve test gönderimi. Tam kuyruk görünümü için{' '}
          <Link
            href={vitrinPath('/manage/admin/settings/notifications')}
            className="font-medium text-primary-600 underline dark:text-primary-400"
          >
            Bildirim ayarları
          </Link>
          .
        </p>
      </div>

      <div className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-700">
        <div className="mb-4 flex items-center gap-2">
          <span className="text-2xl">📱</span>
          <div>
            <h2 className="font-semibold text-neutral-800 dark:text-white">Sunucu ortamı</h2>
            <p className="text-xs text-neutral-500">Değerler backend (.env) üzerinden okunur; burada yalnızca referans.</p>
          </div>
        </div>
        <div className="space-y-2">
          <EnvBadge name="NETGSM_USERCODE" description="NetGSM kullanıcı kodu" required />
          <EnvBadge name="NETGSM_PASSWORD" description="NetGSM şifresi" required />
          <EnvBadge name="NETGSM_MSGHEADER" description="SMS başlığı (ör. onaylı başlık). Opsiyonel." />
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-700">
        <h2 className="mb-3 font-semibold text-neutral-800 dark:text-white">Test SMS</h2>
        <p className="mb-4 text-sm text-neutral-500">
          <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">admin.integrations.write</code> izni gerektirir.
        </p>
        <form onSubmit={onSendTest} className="max-w-lg space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">GSM</label>
            <input
              type="text"
              className="w-full rounded-xl border border-neutral-200 p-2.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              placeholder="905551234567"
              value={gsm}
              onChange={(e) => setGsm(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Mesaj</label>
            <textarea
              className="w-full rounded-xl border border-neutral-200 p-2.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={sending}
            className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {sending ? 'Gönderiliyor…' : 'Test gönder'}
          </button>
        </form>
        {sendResult && (
          <p className="mt-4 rounded-xl bg-neutral-100 p-3 text-sm text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
            {sendResult}
          </p>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Son SMS kuyruğu işleri</h2>
          <button
            type="button"
            onClick={() => void loadJobs()}
            disabled={loading}
            className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm dark:border-neutral-700"
          >
            Yenile
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          </div>
        ) : smsJobs.length === 0 ? (
          <p className="text-sm text-neutral-500">Son kayıtlarda SMS kanalına ait iş yok.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-700">
            <table className="w-full text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/50">
                <tr>
                  <th className="px-3 py-2 text-left">İş</th>
                  <th className="px-3 py-2 text-left">Durum</th>
                  <th className="px-3 py-2 text-left">Zaman</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {smsJobs.slice(0, 25).map((job) => (
                  <tr key={job.id}>
                    <td className="px-3 py-2 font-mono text-xs">{job.id.slice(0, 10)}…</td>
                    <td className="px-3 py-2">{job.status}</td>
                    <td className="px-3 py-2 text-xs text-neutral-500">
                      {job.scheduled_at ? new Date(job.scheduled_at).toLocaleString('tr-TR') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
