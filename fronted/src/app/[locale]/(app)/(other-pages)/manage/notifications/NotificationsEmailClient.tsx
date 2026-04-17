'use client'

import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { getStoredAuthToken } from '@/lib/auth-storage'
import {
  listEmailTemplates,
  listNotificationJobs,
  type EmailTemplate,
  type NotificationJob,
} from '@/lib/travel-api'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

function JobRow({ job }: { job: NotificationJob }) {
  const st =
    job.status === 'sent'
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      : job.status === 'failed'
        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
  return (
    <tr className="border-b border-neutral-100 dark:border-neutral-800">
      <td className="px-3 py-2 font-mono text-xs text-neutral-600 dark:text-neutral-400">{job.id.slice(0, 8)}…</td>
      <td className="px-3 py-2">
        <span className={st + ' rounded-full px-2 py-0.5 text-xs font-medium'}>{job.status}</span>
      </td>
      <td className="max-w-[200px] truncate px-3 py-2 text-xs text-neutral-500" title={job.scheduled_at}>
        {job.scheduled_at ? new Date(job.scheduled_at).toLocaleString('tr-TR') : '—'}
      </td>
    </tr>
  )
}

export default function NotificationsEmailClient() {
  const vitrinPath = useVitrinHref()
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [emailJobs, setEmailJobs] = useState<NotificationJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) {
      setError('Oturum bulunamadı')
      setLoading(false)
      return
    }
    setError(null)
    setLoading(true)
    try {
      const [t, j] = await Promise.all([
        listEmailTemplates(token),
        listNotificationJobs(token, { limit: 80 }),
      ])
      setTemplates(Array.isArray(t.templates) ? t.templates : [])
      const jobs = Array.isArray(j.jobs) ? j.jobs : []
      setEmailJobs(jobs.filter((x) => x.channel === 'email'))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yükleme başarısız')
      setTemplates([])
      setEmailJobs([])
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
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">E-posta şablonları</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Sistemde tanımlı e-posta şablonları ve çeviri anahtarları. Metinleri düzenlemek için{' '}
          <Link
            href={vitrinPath('/manage/i18n')}
            className="font-medium text-primary-600 underline dark:text-primary-400"
          >
            Diller &amp; çeviriler
          </Link>{' '}
          sayfasını kullanın.
        </p>
      </div>

      <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4 text-sm text-blue-900 dark:border-blue-500/30 dark:bg-blue-950/30 dark:text-blue-200">
        <p>
          <strong>Konu ve gövde</strong> alanları veritabanında <code className="rounded bg-blue-100 px-1 dark:bg-blue-900/50">subject_key</code> ve{' '}
          <code className="rounded bg-blue-100 px-1 dark:bg-blue-900/50">body_key</code> olarak i18n anahtarlarına bağlıdır. Gerçek metinler
          çeviri paketinde tanımlıdır.
        </p>
        <p className="mt-2">
          <Link
            href={vitrinPath('/manage/admin/settings/notifications')}
            className="font-medium text-blue-700 underline dark:text-blue-300"
          >
            Bildirim kuyruğu ve akış (yönetici)
          </Link>
        </p>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">{error}</p>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-700">
            <table className="w-full text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-neutral-700 dark:text-neutral-300">Kod</th>
                  <th className="px-4 py-3 text-left font-semibold text-neutral-700 dark:text-neutral-300">Konu (i18n anahtarı)</th>
                  <th className="px-4 py-3 text-left font-semibold text-neutral-700 dark:text-neutral-300">Gövde (i18n anahtarı)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {templates.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-neutral-500">
                      Kayıtlı şablon yok veya API yanıt vermedi.
                    </td>
                  </tr>
                ) : (
                  templates.map((row) => (
                    <tr key={row.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                      <td className="px-4 py-3 font-mono text-xs text-neutral-800 dark:text-neutral-200">{row.code}</td>
                      <td className="px-4 py-3 font-mono text-xs text-neutral-600 dark:text-neutral-400">{row.subject_key}</td>
                      <td className="px-4 py-3 font-mono text-xs text-neutral-600 dark:text-neutral-400">{row.body_key}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900 dark:text-white">Son e-posta kuyruğu işleri</h2>
            {emailJobs.length === 0 ? (
              <p className="text-sm text-neutral-500">Son kayıtlarda e-posta kanalına ait iş yok.</p>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-700">
                <table className="w-full text-sm">
                  <thead className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-neutral-700 dark:text-neutral-300">İş no</th>
                      <th className="px-3 py-2 text-left font-semibold text-neutral-700 dark:text-neutral-300">Durum</th>
                      <th className="px-3 py-2 text-left font-semibold text-neutral-700 dark:text-neutral-300">Zamanlandı</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emailJobs.slice(0, 25).map((job) => (
                      <JobRow key={job.id} job={job} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
