'use client'

import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { getStoredAuthToken } from '@/lib/auth-storage'
import { listWhatsappOrderIntents } from '@/lib/travel-api'
import clsx from 'clsx'
import { ExternalLink, Loader2, MessageCircle, Phone, RefreshCw, ShoppingCart } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

type IntentRow = {
  id: string
  phone: string
  cart_id: string | null
  payload_json: string
  created_at: string
}

export default function WhatsappManageClient() {
  const vitrinPath = useVitrinHref()
  const integrationsHref = vitrinPath('/manage/admin/settings/integrations')

  const [intents, setIntents] = useState<IntentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) {
      setErr('Oturum bulunamadı.')
      setLoading(false)
      return
    }
    setLoading(true)
    setErr(null)
    try {
      const r = await listWhatsappOrderIntents(token, 120)
      setIntents(r.intents)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Yükleme hatası')
      setIntents([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="space-y-8">
      <header className="rounded-2xl border border-neutral-200 bg-gradient-to-br from-emerald-50/90 to-white p-6 dark:border-neutral-800 dark:from-emerald-950/25 dark:to-neutral-900/80">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md">
            <MessageCircle className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">WhatsApp</h1>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              <strong>WhatsApp Business Cloud API</strong> ile gelen sipariş niyetleri (telefon, sepet, yük) burada listelenir.
              Tıkla-WhatsApp akışları ve şablon mesajlar için <strong>API anahtarı, telefon numarası ID&apos;si ve şablon adları</strong>{' '}
              entegrasyon ayarlarından tanımlanır — bu sayfa izleme ve teşhis içindir.
            </p>
            <div className="mt-4">
              <Link
                href={integrationsHref}
                className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 shadow-sm hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                WhatsApp API ayarlarını aç
              </Link>
            </div>
          </div>
        </div>
      </header>

      {err ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {err}
        </div>
      ) : null}

      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/40">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Son sipariş niyetleri</h2>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Site veya kampanya bağlantılarından gelen WhatsApp tıklamaları; sepet doğrulaması yapılmışsa <code className="font-mono text-xs">cart_id</code> dolu olabilir.
            </p>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Yenile
          </button>
        </div>

        <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-100 dark:border-neutral-800">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-neutral-50 text-xs font-semibold uppercase text-neutral-500 dark:bg-neutral-950/80 dark:text-neutral-400">
              <tr>
                <th className="px-4 py-3">Tarih</th>
                <th className="px-4 py-3">Telefon</th>
                <th className="px-4 py-3">Sepet</th>
                <th className="px-4 py-3">Özet (payload)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {loading && intents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-neutral-400">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  </td>
                </tr>
              ) : intents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-neutral-400">
                    Henüz kayıtlı niyet yok veya API boş döndü. Entegrasyon ve şablonlar ayarlandıktan sonra burada görünür.
                  </td>
                </tr>
              ) : (
                intents.map((row) => (
                  <tr key={row.id} className="bg-white dark:bg-neutral-900/40">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-neutral-600 dark:text-neutral-400">
                      {formatDate(row.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 font-mono text-xs text-neutral-900 dark:text-neutral-100">
                        <Phone className="h-3.5 w-3.5 text-neutral-400" />
                        {row.phone}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {row.cart_id ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-violet-100 px-2 py-0.5 font-mono text-[11px] text-violet-900 dark:bg-violet-950/50 dark:text-violet-200">
                          <ShoppingCart className="h-3 w-3" />
                          {row.cart_id.slice(0, 10)}…
                        </span>
                      ) : (
                        <span className="text-xs text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="max-w-md px-4 py-3">
                      <PayloadPreview json={row.payload_json} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/50 p-5 dark:border-neutral-700 dark:bg-neutral-950/30">
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Bu modül ne yapmaz?</h3>
        <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-neutral-600 dark:text-neutral-400">
          <li>Şablon mesaj gönderimi veya sohbet oturumu buradan başlatılmaz; Meta Business ve entegrasyon anahtarları gerekir.</li>
          <li>Yeni niyet oluşturmak genelde müşteri tarafındaki WhatsApp bağlantılarıyla yapılır; yönetim paneli kayıtları okur.</li>
        </ul>
      </section>
    </div>
  )
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return iso
  }
}

function PayloadPreview({ json }: { json: string }) {
  let short = json
  try {
    const o = JSON.parse(json) as Record<string, unknown>
    short = JSON.stringify(o).slice(0, 120)
    if (JSON.stringify(o).length > 120) short += '…'
  } catch {
    short = json.slice(0, 120) + (json.length > 120 ? '…' : '')
  }
  return (
    <span className={clsx('font-mono text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-400')} title={json}>
      {short}
    </span>
  )
}
