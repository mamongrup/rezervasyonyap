'use client'

import React from 'react'
import { getStoredAuthToken } from '@/lib/auth-storage'

interface NotificationJob {
  id: string
  channel: string
  status: string
  scheduled_at: string
  sent_at: string | null
  payload_json: string
  recipient?: string
  error_message?: string
}

const CHANNEL_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  sms: { label: 'SMS', icon: '📱', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  email: { label: 'E-posta', icon: '✉️', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  whatsapp: { label: 'WhatsApp', icon: '💬', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Bekliyor', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  sent: { label: 'Gönderildi', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  failed: { label: 'Başarısız', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
}

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

export default function AdminNotificationSettingsSection() {
  const [jobs, setJobs] = React.useState<NotificationJob[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [activeTab, setActiveTab] = React.useState<'config' | 'queue'>('config')

  const loadJobs = React.useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) return
    const b = process.env.NEXT_PUBLIC_API_URL
    if (!b) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${b}/api/v1/messaging/jobs?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setJobs(Array.isArray(data.jobs) ? data.jobs : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yükleme başarısız')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (activeTab === 'queue') loadJobs()
  }, [activeTab, loadJobs])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-neutral-800 dark:text-white">Bildirim Ayarları</h2>
        <p className="mt-1 text-sm text-neutral-500">
          SMS (NetGSM), e-posta (Resend) ve WhatsApp bildirimleri için yapılandırma.
          Bildirimler rezervasyon oluştuğunda otomatik gönderilir.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-neutral-200 bg-neutral-50 p-1 dark:border-neutral-700 dark:bg-neutral-800/50">
        {[
          { id: 'config' as const, label: 'Yapılandırma' },
          { id: 'queue' as const, label: 'Bildirim Kuyruğu' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={[
              'flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all',
              activeTab === t.id
                ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white'
                : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'config' && (
        <div className="space-y-6">
          {/* SMS */}
          <div className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-700">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-2xl">📱</span>
              <div>
                <h3 className="font-semibold text-neutral-800 dark:text-white">SMS — NetGSM</h3>
                <p className="text-xs text-neutral-500">Anlık bildirim, tedarikçi + müşteri</p>
              </div>
            </div>
            <div className="space-y-2">
              <EnvBadge
                name="NETGSM_USERCODE"
                description="NetGSM kullanıcı kodunuz"
                required
              />
              <EnvBadge
                name="NETGSM_PASSWORD"
                description="NetGSM şifreniz"
                required
              />
              <EnvBadge
                name="NETGSM_MSGHEADER"
                description="SMS başlığı (ör: REZERVASYON). Varsayılan: REZERVASYON"
              />
            </div>
          </div>

          {/* E-posta */}
          <div className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-700">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-2xl">✉️</span>
              <div>
                <h3 className="font-semibold text-neutral-800 dark:text-white">E-posta — Resend</h3>
                <p className="text-xs text-neutral-500">HTML/Text e-posta, tedarikçi + müşteri</p>
              </div>
            </div>
            <div className="space-y-2">
              <EnvBadge
                name="RESEND_API_KEY"
                description="Resend API anahtarınız (resend.com ücretsiz plan: 3.000 e-posta/ay)"
                required
              />
              <EnvBadge
                name="SUPPLIER_NOTIFY_FROM"
                description="Tedarikçi bildirimlerinde 'Gönderen' adresi (ör: rezervasyon@siteniz.com.tr). Yoksa INVOICE_NOTIFY_FROM kullanılır."
              />
              <EnvBadge
                name="INVOICE_NOTIFY_FROM"
                description="Genel sistem e-posta gönderim adresi (fatura + rezervasyon bildirimleri)"
              />
            </div>
          </div>

          {/* WhatsApp */}
          <div className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-700">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-2xl">💬</span>
              <div>
                <h3 className="font-semibold text-neutral-800 dark:text-white">WhatsApp</h3>
                <p className="text-xs text-neutral-500">
                  Şu an notification_jobs kuyruğuna alınır. WA Business API entegrasyonu yakında.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                WhatsApp mesajları şu an <strong>notification_jobs</strong> tablosuna kuyruğa alınmaktadır.
                Kuyruktaki mesajlar &ldquo;Bildirim Kuyruğu&rdquo; sekmesinden görüntülenebilir ve manuel
                gönderim için <code className="rounded bg-amber-100 px-1">wa.me</code> linki mevcuttur.
              </p>
              <EnvBadge
                name="listing_owner_contacts.contact_whatsapp"
                description="İlan tedarikçisine ait WhatsApp numarasını ilan detay formunda girebilirsiniz. Yoksa contact_phone kullanılır."
              />
            </div>
          </div>

          {/* Site URL */}
          <div className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-700">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-2xl">🔗</span>
              <div>
                <h3 className="font-semibold text-neutral-800 dark:text-white">Site URL</h3>
                <p className="text-xs text-neutral-500">Bildirim e-postalarında tedarikçi onay linkini oluşturmak için</p>
              </div>
            </div>
            <EnvBadge
              name="SITE_URL"
              description="Site URL'niz (ör: https://rezervasyonyap.com.tr). Varsayılan: https://rezervasyonyap.com.tr"
              required
            />
          </div>

          {/* Bildirim akışı */}
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-800/50 dark:bg-blue-900/10">
            <h3 className="mb-3 font-semibold text-blue-800 dark:text-blue-300">Bildirim Akışı</h3>
            <ol className="space-y-2 text-sm text-blue-700 dark:text-blue-400">
              <li className="flex gap-2">
                <span className="shrink-0 font-bold">1.</span>
                <span>Müşteri ödemeyi tamamlar → checkout transaction commit olur</span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 font-bold">2.</span>
                <span><code className="rounded bg-blue-100 px-1 dark:bg-blue-900/40">fn_compute_provizyon()</code> tetiklenir → tutarlar + deadline hesaplanır</span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 font-bold">3.</span>
                <span>Tedarikçiye: SMS + E-posta + WhatsApp kuyruğu (onay linki içerir)</span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 font-bold">4.</span>
                <span>Müşteriye: SMS + E-posta (ödeme alındı, onay bekleniyor)</span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 font-bold">5.</span>
                <span>Tedarikçi onaylarsa → Müşteriye onay SMS + E-posta</span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 font-bold">6.</span>
                <span>Deadline aşılırsa → Tedarikçiye son uyarı SMS + WhatsApp → Eskalasyon açılır</span>
              </li>
            </ol>
          </div>
        </div>
      )}

      {activeTab === 'queue' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-neutral-500">Son 50 bildirim işi</p>
            <button
              onClick={loadJobs}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <svg className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Yenile
            </button>
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </p>
          )}

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
            </div>
          ) : jobs.length === 0 ? (
            <p className="py-8 text-center text-sm text-neutral-500">Kuyrukta bildirim yok.</p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-700">
              <table className="w-full text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-neutral-700 dark:text-neutral-300">Kanal</th>
                    <th className="px-4 py-3 text-left font-semibold text-neutral-700 dark:text-neutral-300">Durum</th>
                    <th className="px-4 py-3 text-left font-semibold text-neutral-700 dark:text-neutral-300">Alıcı</th>
                    <th className="px-4 py-3 text-left font-semibold text-neutral-700 dark:text-neutral-300">Zamanlandı</th>
                    <th className="px-4 py-3 text-left font-semibold text-neutral-700 dark:text-neutral-300">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {jobs.map((job) => {
                    const channelInfo = CHANNEL_LABELS[job.channel] ?? { label: job.channel, icon: '📤', color: 'bg-neutral-100 text-neutral-600' }
                    const statusInfo = STATUS_LABELS[job.status] ?? { label: job.status, color: 'bg-neutral-100 text-neutral-600' }
                    let waLink: string | null = null
                    if (job.channel === 'whatsapp') {
                      try {
                        const p = JSON.parse(job.payload_json)
                        if (p.wa_link) waLink = p.wa_link
                        else if (p.phone) waLink = `https://wa.me/${String(p.phone).replace(/\D/g, '')}?text=${encodeURIComponent(p.message ?? '')}`
                      } catch { /* ignore */ }
                    }
                    return (
                      <tr key={job.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${channelInfo.color}`}>
                            {channelInfo.icon} {channelInfo.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-neutral-500">{job.recipient ?? '—'}</td>
                        <td className="px-4 py-3 text-xs text-neutral-500">
                          {job.scheduled_at ? new Date(job.scheduled_at).toLocaleString('tr-TR') : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {waLink && job.status === 'pending' && (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg bg-green-100 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
                            >
                              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                              </svg>
                              Gönder
                            </a>
                          )}
                          {job.error_message && (
                            <span className="text-xs text-red-500">{job.error_message}</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
