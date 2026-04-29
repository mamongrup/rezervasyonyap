'use client'

import { Wallet } from 'lucide-react'

type WalletRow = { user: string; balance: string; currency: string; lastTx: string }

export default function Page() {
  const rows: WalletRow[] = []
  const total = rows.reduce((a, w) => a + parseFloat(w.balance), 0)

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-950/40"><Wallet className="h-6 w-6" /></div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Cüzdan Yönetimi</h1>
          <p className="mt-1 text-sm text-neutral-500">Kullanıcı bakiyeleri ve cüzdan işlemleri.</p>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          <p className="text-2xl font-bold text-violet-600">{total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} <span className="text-sm font-normal text-neutral-500">TRY</span></p>
          <p className="text-xs text-neutral-500">Toplam cüzdan bakiyesi</p>
        </div>
        <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{rows.length}</p>
          <p className="text-xs text-neutral-500">Aktif cüzdan</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
        <div className="border-b border-neutral-50 bg-neutral-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:border-neutral-800 dark:bg-neutral-800/50">
          Kullanıcı Cüzdanları
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
              <th className="py-3 pl-5 text-left">Kullanıcı</th>
              <th className="py-3 text-right">Bakiye</th>
              <th className="py-3 pr-5 text-right">Son İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-10 text-center text-sm text-neutral-500">
                  Henüz cüzdan kaydı yok. Veriler API bağlandığında burada listelenecek.
                </td>
              </tr>
            ) : (
              rows.map((w) => (
                <tr key={w.user} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                  <td className="py-3 pl-5 text-neutral-700 dark:text-neutral-300">{w.user}</td>
                  <td className="py-3 text-right font-mono text-sm font-bold text-violet-600">{parseFloat(w.balance).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {w.currency}</td>
                  <td className="py-3 pr-5 text-right text-xs text-neutral-400">{new Date(w.lastTx).toLocaleDateString('tr-TR')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
