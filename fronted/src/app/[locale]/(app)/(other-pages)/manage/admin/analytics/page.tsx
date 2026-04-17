'use client'

import clsx from 'clsx'
import { BarChart2, Check, Loader2, Save, TrendingUp } from 'lucide-react'
import { useState } from 'react'

const MOCK_PAGES = [
  { path: '/', views: 12450, sessions: 8230, bounce: '42%' },
  { path: '/villas', views: 8320, sessions: 5410, bounce: '38%' },
  { path: '/bodrum', views: 5230, sessions: 3120, bounce: '45%' },
  { path: '/fethiye', views: 4180, sessions: 2650, bounce: '41%' },
  { path: '/yachts', views: 2900, sessions: 1820, bounce: '52%' },
]

export default function Page() {
  const [gaId, setGaId] = useState('')
  const [gtmId, setGtmId] = useState('')
  const [metaPixel, setMetaPixel] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-950/40"><TrendingUp className="h-6 w-6" /></div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Analitik & Takip</h1>
          <p className="mt-1 text-sm text-neutral-500">Google Analytics, GTM ve Meta Pixel entegrasyonları.</p>
        </div>
      </div>

      <div className="space-y-6">
        <section className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          <h2 className="mb-4 text-sm font-semibold">Takip Kodları</h2>
          <div className="grid gap-4 sm:grid-cols-3 max-w-2xl">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Google Analytics ID</label>
              <input value={gaId} onChange={(e) => setGaId(e.target.value)} placeholder="G-XXXXXXXXXX"
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 font-mono text-sm focus:border-[color:var(--manage-primary)] focus:outline-none dark:border-neutral-700 dark:bg-neutral-800" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Google Tag Manager ID</label>
              <input value={gtmId} onChange={(e) => setGtmId(e.target.value)} placeholder="GTM-XXXXXXX"
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 font-mono text-sm focus:border-[color:var(--manage-primary)] focus:outline-none dark:border-neutral-700 dark:bg-neutral-800" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Meta (Facebook) Pixel ID</label>
              <input value={metaPixel} onChange={(e) => setMetaPixel(e.target.value)} placeholder="XXXXXXXXXXXXXXXXXX"
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 font-mono text-sm focus:border-[color:var(--manage-primary)] focus:outline-none dark:border-neutral-700 dark:bg-neutral-800" />
            </div>
          </div>
          <button onClick={async () => { setSaving(true); await new Promise(r => setTimeout(r, 700)); setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500) }} disabled={saving}
            className={clsx('mt-4 flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white', saved ? 'bg-emerald-600' : 'bg-[color:var(--manage-primary)]')}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saved ? 'Kaydedildi' : 'Kaydet'}
          </button>
        </section>

        <section className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          <h2 className="mb-4 text-sm font-semibold">En Çok Görüntülenen Sayfalar (Demo)</h2>
          <div className="overflow-hidden rounded-xl border border-neutral-100 dark:border-neutral-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-50 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:border-neutral-800 dark:bg-neutral-800/50">
                  <th className="py-3 pl-4 text-left">Sayfa</th>
                  <th className="py-3 text-right">Görüntülenme</th>
                  <th className="py-3 text-right">Oturum</th>
                  <th className="py-3 pr-4 text-right">Hemen Çıkma</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800">
                {MOCK_PAGES.map((p) => (
                  <tr key={p.path} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                    <td className="py-2 pl-4 font-mono text-xs">{p.path}</td>
                    <td className="py-2 text-right text-xs font-medium text-blue-600">{p.views.toLocaleString('tr-TR')}</td>
                    <td className="py-2 text-right text-xs text-neutral-500">{p.sessions.toLocaleString('tr-TR')}</td>
                    <td className="py-2 pr-4 text-right text-xs text-neutral-500">{p.bounce}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-neutral-400">* Gerçek veri için Google Analytics API entegrasyonu yapılandırın.</p>
        </section>
      </div>
    </div>
  )
}
