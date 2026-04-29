'use client'

import { FileText, Plus } from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'

type Offer = { id: string; guestName: string; guestEmail: string; listing: string; checkIn: string; checkOut: string; totalPrice: string; status: 'draft' | 'sent' | 'accepted' | 'rejected' }

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-neutral-100 text-neutral-600',
  sent: 'bg-blue-100 text-blue-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
}
const STATUS_LABELS: Record<string, string> = { draft: 'Taslak', sent: 'Gönderildi', accepted: 'Kabul Edildi', rejected: 'Reddedildi' }

export default function Page() {
  const [offers, setOffers] = useState<Offer[]>([])

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950/40"><FileText className="h-6 w-6" /></div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Teklifler</h1>
            <p className="mt-1 text-sm text-neutral-500">Rezervasyon öncesi fiyat teklifleri oluşturun ve gönderin.</p>
          </div>
        </div>
        <button onClick={() => setOffers((p) => [...p, { id: Date.now().toString(), guestName: '', guestEmail: '', listing: '', checkIn: '', checkOut: '', totalPrice: '', status: 'draft' }])}
          className="flex items-center gap-2 rounded-xl bg-[color:var(--manage-primary)] px-4 py-2 text-sm font-semibold text-white">
          <Plus className="h-4 w-4" />Yeni teklif
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-50 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:border-neutral-800 dark:bg-neutral-800/50">
              <th className="py-3 pl-5 text-left">Misafir</th>
              <th className="py-3 text-left">İlan</th>
              <th className="py-3 text-left">Tarihler</th>
              <th className="py-3 text-right">Tutar</th>
              <th className="py-3 pr-5 text-right">Durum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800">
            {offers.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-sm text-neutral-500">
                  Henüz teklif yok. &quot;Yeni teklif&quot; ile ekleyebilirsiniz.
                </td>
              </tr>
            ) : (
              offers.map((offer) => (
              <tr key={offer.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                <td className="py-3 pl-5">
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{offer.guestName || '—'}</p>
                  <p className="text-xs text-neutral-400">{offer.guestEmail}</p>
                </td>
                <td className="py-3 text-xs text-neutral-600 dark:text-neutral-400">{offer.listing || '—'}</td>
                <td className="py-3 text-xs text-neutral-500">
                  {offer.checkIn && offer.checkOut ? `${new Date(offer.checkIn).toLocaleDateString('tr-TR')} – ${new Date(offer.checkOut).toLocaleDateString('tr-TR')}` : '—'}
                </td>
                <td className="py-3 text-right font-mono text-sm font-bold text-neutral-800 dark:text-neutral-200">
                  {offer.totalPrice ? `${parseInt(offer.totalPrice).toLocaleString('tr-TR')} ₺` : '—'}
                </td>
                <td className="py-3 pr-5 text-right">
                  <select value={offer.status} onChange={(e) => setOffers((p) => p.map((o) => o.id === offer.id ? { ...o, status: e.target.value as Offer['status'] } : o))}
                    className={clsx('rounded-xl border-0 px-2 py-1 text-xs font-semibold focus:outline-none', STATUS_STYLES[offer.status])}>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </td>
              </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
