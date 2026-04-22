'use client'

import { getStoredAuthToken } from '@/lib/auth-storage'
import { invoiceStatusBadgeClass, invoiceStatusLabelTr } from '@/lib/invoice-ui'
import { getStaffInvoices, type StaffInvoiceRow } from '@/lib/travel-api'
import clsx from 'clsx'
import {
  ArrowUpRight,
  FileText,
  Printer,
  RefreshCw,
  Search,
} from 'lucide-react'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

type FilterStatus = 'all' | 'issued' | 'cancelled'
type FilterKind = 'all' | 'agency' | 'supplier'

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatAmount(val: string, currency: string): string {
  const n = parseFloat(val)
  if (isNaN(n)) return val
  try {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(n)
  } catch {
    return `${n.toFixed(2)} ${currency}`
  }
}

function printInvoice(row: StaffInvoiceRow) {
  const title =
    row.kind === 'agency' ? 'Acente komisyon faturası' : 'Tedarikçi komisyon faturası'
  const html = `<!DOCTYPE html>
<html lang="tr"><head><meta charset="utf-8" />
<title>${row.invoice_number} — ${title}</title>
<style>
  body{font-family:system-ui,sans-serif;font-size:12px;color:#111;margin:24px}
  h1{font-size:18px;margin:0 0 8px}
  .muted{color:#555;font-size:11px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;margin-top:16px}
  .label{color:#555;font-size:11px}
  .notes{margin-top:16px;white-space:pre-wrap;border:1px solid #ddd;padding:8px;min-height:2em}
  @media print{body{margin:12mm}}
</style></head>
<body>
<h1>${title}</h1>
<div class="grid">
  <div><span class="label">Fatura no</span><br /><strong>${row.invoice_number}</strong></div>
  <div><span class="label">Durum</span><br />${invoiceStatusLabelTr(row.status)}</div>
  <div><span class="label">Tür</span><br />${row.kind === 'agency' ? 'Acente' : 'Tedarikçi'}</div>
  <div><span class="label">Para birimi</span><br />${row.currency_code}</div>
  <div><span class="label">Dönem</span><br />${formatDate(row.period_from)} → ${formatDate(row.period_to)}</div>
  <div><span class="label">Satır sayısı</span><br />${row.line_count}</div>
  <div><span class="label">Brüt toplam</span><br /><strong>${formatAmount(row.gross_total, row.currency_code)}</strong></div>
  <div><span class="label">Komisyon toplam</span><br /><strong>${formatAmount(row.commission_total, row.currency_code)}</strong></div>
  <div><span class="label">Oluşturulma</span><br />${formatDate(row.created_at)}</div>
</div>
${row.notes ? `<p class="label" style="margin-top:16px">Not</p><div class="notes">${row.notes}</div>` : ''}
<p class="muted" style="margin-top:24px">Yazdırırken hedef olarak "PDF'ye kaydet" seçebilirsiniz.</p>
</body></html>`
  const w = window.open('', '_blank', 'noopener,noreferrer')
  if (!w) { window.alert('Pop-up engelleyiciyi kapatıp tekrar deneyin.'); return }
  w.document.open(); w.document.write(html); w.document.close(); w.focus(); w.print()
}

type SummaryCardProps = { label: string; value: string; sub?: string; highlight?: boolean }
function SummaryCard({ label, value, sub, highlight }: SummaryCardProps) {
  return (
    <div className={clsx(
      'rounded-xl border p-4 shadow-sm',
      highlight
        ? 'border-[color:var(--manage-primary)] bg-[color:var(--manage-primary-soft)]'
        : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900'
    )}>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className={clsx(
        'mt-1 text-xl font-bold',
        highlight ? 'text-[color:var(--manage-primary)]' : 'text-neutral-900 dark:text-neutral-100'
      )}>{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-neutral-500">{sub}</p> : null}
    </div>
  )
}

export default function AdminInvoicesClient() {
  const vitrinPath = useVitrinHref()

  const [invoices, setInvoices] = useState<StaffInvoiceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [filterKind, setFilterKind] = useState<FilterKind>('all')

  const load = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) { setError('Oturum bulunamadı.'); setLoading(false); return }
    setLoading(true); setError(null)
    try {
      const res = await getStaffInvoices(token)
      setInvoices(res.invoices)
    } catch (e) {
      const raw = e instanceof Error ? e.message : 'Faturalar yüklenemedi.'
      const friendly =
        raw === 'forbidden'
          ? 'Bu liste için yetkiniz yok. Yönetici (kullanıcı okuma) veya personel fatura izni gerekir.'
          : raw === 'not_staff'
            ? 'Personel fatura görünümü için staff rolü ve kurum ataması gerekir.'
            : raw
      setError(friendly)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      if (filterStatus !== 'all' && inv.status !== filterStatus) return false
      if (filterKind !== 'all' && inv.kind !== filterKind) return false
      if (search && !inv.invoice_number.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [invoices, filterStatus, filterKind, search])

  // Summary stats
  const stats = useMemo(() => {
    const issued = invoices.filter(i => i.status === 'issued')
    const totalComm = issued.reduce((sum, i) => sum + parseFloat(i.commission_total || '0'), 0)
    const agencyCount = invoices.filter(i => i.kind === 'agency').length
    const supplierCount = invoices.filter(i => i.kind === 'supplier').length
    return { total: invoices.length, issued: issued.length, totalComm, agencyCount, supplierCount }
  }, [invoices])

  const CHIP = 'rounded-full border px-3 py-1 text-xs font-medium transition-colors cursor-pointer select-none'
  const CHIP_ON = 'border-[color:var(--manage-primary)] bg-[color:var(--manage-primary)] text-white'
  const CHIP_OFF = 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300'

  return (
    <div className="p-6 lg:p-8">
      {/* Başlık */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Fatura Yönetimi
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Acente ve tedarikçi komisyon faturalarını görüntüleyin.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={vitrinPath('/manage/agency')}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
          >
            Acente faturaları
            <ArrowUpRight className="h-3.5 w-3.5 opacity-60" />
          </Link>
          <Link
            href={vitrinPath('/manage/supplier')}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
          >
            Tedarikçi faturaları
            <ArrowUpRight className="h-3.5 w-3.5 opacity-60" />
          </Link>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900"
          >
            <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
            Yenile
          </button>
        </div>
      </div>

      {/* Özet kartları */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-5">
        <SummaryCard label="Toplam fatura" value={String(stats.total)} />
        <SummaryCard label="Kesilmiş" value={String(stats.issued)} highlight />
        <SummaryCard label="Acente" value={String(stats.agencyCount)} sub="fatura" />
        <SummaryCard label="Tedarikçi" value={String(stats.supplierCount)} sub="fatura" />
        <SummaryCard
          label="Komisyon toplamı (bilgi)"
          value={stats.issued > 0 && stats.totalComm > 0 ? stats.totalComm.toFixed(2) : '—'}
          sub="PB karışıksa anlamlı değil; satırda para birimine bakın."
        />
      </div>

      {/* Filtreler ve arama */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            placeholder="Fatura no ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-neutral-50 py-2 pl-9 pr-3 text-sm focus:border-[color:var(--manage-primary)] focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <div className="flex items-center gap-2">
          {(['all', 'issued', 'cancelled'] as FilterStatus[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilterStatus(s)}
              className={clsx(CHIP, filterStatus === s ? CHIP_ON : CHIP_OFF)}
            >
              {s === 'all' ? 'Tümü' : s === 'issued' ? 'Kesilmiş' : 'İptal'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {(['all', 'agency', 'supplier'] as FilterKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilterKind(k)}
              className={clsx(CHIP, filterKind === k ? CHIP_ON : CHIP_OFF)}
            >
              {k === 'all' ? 'Hepsi' : k === 'agency' ? 'Acente' : 'Tedarikçi'}
            </button>
          ))}
        </div>
      </div>

      {/* Hata */}
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {/* Tablo */}
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-neutral-400">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Yükleniyor...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
            <FileText className="mb-3 h-10 w-10" />
            <p className="text-sm">Fatura bulunamadı.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:bg-neutral-800/50">
                  <th className="py-3 pl-4 text-left">Fatura No</th>
                  <th className="py-3 text-left">Tür</th>
                  <th className="py-3 text-left">Dönem</th>
                  <th className="py-3 text-right">Brüt Toplam</th>
                  <th className="py-3 text-right">Komisyon</th>
                  <th className="py-3 text-left">PB</th>
                  <th className="py-3 text-center">Satır</th>
                  <th className="py-3 text-left">Durum</th>
                  <th className="py-3 text-left">Tarih</th>
                  <th className="py-3 pr-4 text-center">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800">
                {filtered.map((inv) => (
                  <tr
                    key={inv.id}
                    className="transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/40"
                  >
                    <td className="py-3 pl-4 font-mono text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                      {inv.invoice_number}
                    </td>
                    <td className="py-3">
                      <span className={clsx(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        inv.kind === 'agency'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                      )}>
                        {inv.kind === 'agency' ? 'Acente' : 'Tedarikçi'}
                      </span>
                    </td>
                    <td className="py-3 text-xs text-neutral-600 dark:text-neutral-300">
                      {formatDate(inv.period_from)}<br />
                      <span className="text-neutral-400">→ {formatDate(inv.period_to)}</span>
                    </td>
                    <td className="py-3 text-right font-medium text-neutral-800 dark:text-neutral-200">
                      {formatAmount(inv.gross_total, inv.currency_code)}
                    </td>
                    <td className="py-3 text-right font-semibold text-[color:var(--manage-primary)]">
                      {formatAmount(inv.commission_total, inv.currency_code)}
                    </td>
                    <td className="py-3 text-xs text-neutral-500">
                      {inv.currency_code}
                    </td>
                    <td className="py-3 text-center text-xs text-neutral-500">
                      {inv.line_count}
                    </td>
                    <td className="py-3">
                      <span className={clsx(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        invoiceStatusBadgeClass(inv.status)
                      )}>
                        {invoiceStatusLabelTr(inv.status)}
                      </span>
                    </td>
                    <td className="py-3 text-xs text-neutral-500">
                      {formatDate(inv.created_at)}
                    </td>
                    <td className="py-3 pr-4 text-center">
                      <button
                        type="button"
                        onClick={() => printInvoice(inv)}
                        title="Yazdır / PDF"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Alt bilgi */}
      <div className="mt-4 flex items-center justify-between text-xs text-neutral-400">
        <span>{filtered.length} fatura gösteriliyor{filtered.length !== invoices.length ? ` (toplam ${invoices.length})` : ''}</span>
        <span>
          Fatura oluşturma / iptal için{' '}
          <Link href={vitrinPath('/manage/agency')} className="underline hover:text-neutral-600">
            Acente portali
          </Link>
          {' '}veya{' '}
          <Link href={vitrinPath('/manage/supplier')} className="underline hover:text-neutral-600">
            Tedarikçi portali
          </Link>
          'ni kullanın.
        </span>
      </div>
    </div>
  )
}
