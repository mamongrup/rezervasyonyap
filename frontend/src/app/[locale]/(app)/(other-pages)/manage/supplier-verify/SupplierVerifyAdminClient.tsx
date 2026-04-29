'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  ShieldCheck,
  ShieldX,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertTriangle,
} from 'lucide-react'
import { getStoredAuthToken } from '@/lib/auth-storage'

// ─── Tipler ───────────────────────────────────────────────────────────────────
// Gerçek sistemde backend'den gelir; API bağlanana kadar boş liste.
type VerifyStatus = 'admin_pending' | 'admin_approved' | 'admin_rejected' | 'gib_found' | 'vkn_valid' | 'gib_not_found'

interface SupplierVerifyRecord {
  id: string
  userId?: string
  userEmail?: string
  vkn: string
  companyName: string
  taxOffice?: string
  gibTitle?: string
  gibTaxOffice?: string
  status: VerifyStatus
  submittedAt: string
  adminNote?: string
  reviewedAt?: string
  reviewedBy?: string
}

const STATUS_LABELS: Record<VerifyStatus, string> = {
  admin_pending: 'İnceleme Bekliyor',
  admin_approved: 'Onaylandı',
  admin_rejected: 'Reddedildi',
  gib_found: "GİB'de Bulundu",
  vkn_valid: 'VKN Geçerli',
  gib_not_found: "GİB'de Bulunamadı",
}

const STATUS_BADGE: Record<VerifyStatus, string> = {
  admin_pending: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  admin_approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  admin_rejected: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300',
  gib_found: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300',
  vkn_valid: 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300',
  gib_not_found: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400',
}

function loadInitialRecords(): SupplierVerifyRecord[] {
  return []
}

// ─── Ana bileşen ─────────────────────────────────────────────────────────────
export default function SupplierVerifyAdminClient() {
  const [records, setRecords] = useState<SupplierVerifyRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | VerifyStatus>('all')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    // Gerçek sistemde: API ile yüklenir
    setTimeout(() => {
      const initial = loadInitialRecords()
      setRecords(initial)
      setNoteInputs(initial.length ? Object.fromEntries(initial.map((r) => [r.id, r.adminNote ?? ''])) : {})
      setLoading(false)
    }, 400)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function handleApprove(id: string) {
    setBusy(id)
    setTimeout(() => {
      setRecords((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status: 'admin_approved',
                reviewedAt: new Date().toISOString(),
                reviewedBy: 'admin',
                adminNote: noteInputs[id] || undefined,
              }
            : r,
        ),
      )
      setBusy(null)
    }, 500)
  }

  function handleReject(id: string) {
    setBusy(id)
    setTimeout(() => {
      setRecords((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status: 'admin_rejected',
                reviewedAt: new Date().toISOString(),
                reviewedBy: 'admin',
                adminNote: noteInputs[id] || 'Red gerekçesi belirtilmedi.',
              }
            : r,
        ),
      )
      setBusy(null)
    }, 500)
  }

  async function reQueryGib(record: SupplierVerifyRecord) {
    setBusy(record.id)
    try {
      const res = await fetch('/api/verify-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vkn: record.vkn,
          company_name: record.companyName,
          tax_office: record.taxOffice,
        }),
      })
      const data = await res.json() as {
        valid: boolean
        gib_found?: boolean
        gib_title?: string | null
        gib_tax_office?: string | null
        error?: string
      }
      setRecords((prev) =>
        prev.map((r) =>
          r.id === record.id
            ? {
                ...r,
                gibTitle: data.gib_title ?? r.gibTitle,
                gibTaxOffice: data.gib_tax_office ?? r.gibTaxOffice,
                status: data.gib_found ? 'gib_found' : 'gib_not_found',
              }
            : r,
        ),
      )
    } catch {
      // ignore
    } finally {
      setBusy(null)
    }
  }

  const filtered = records.filter((r) => {
    if (filter !== 'all' && r.status !== filter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        r.companyName.toLowerCase().includes(q) ||
        r.vkn.includes(q) ||
        (r.userEmail?.toLowerCase().includes(q) ?? false) ||
        (r.gibTitle?.toLowerCase().includes(q) ?? false)
      )
    }
    return true
  })

  const pendingCount = records.filter((r) => r.status === 'admin_pending').length
  const approvedCount = records.filter((r) => r.status === 'admin_approved').length
  const rejectedCount = records.filter((r) => r.status === 'admin_rejected').length

  return (
    <div className="p-6 lg:p-8">
      {/* Başlık */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary-600" />
          Tedarikçi Firma Doğrulama
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Tedarikçi hesapları için VKN ve firma doğrulama başvurularını yönetin.
        </p>
      </div>

      {/* Özet kartlar */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium text-amber-600 dark:text-amber-400">Bekleyen</div>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-1 text-3xl font-bold text-amber-900 dark:text-amber-100">{pendingCount}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Onaylanan</div>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-1 text-3xl font-bold text-emerald-900 dark:text-emerald-100">{approvedCount}</div>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-950/20">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium text-red-600 dark:text-red-400">Reddedilen</div>
            <XCircle className="h-4 w-4 text-red-500" />
          </div>
          <div className="mt-1 text-3xl font-bold text-red-900 dark:text-red-100">{rejectedCount}</div>
        </div>
      </div>

      {/* Filtreler */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Firma, VKN veya e-posta ara…"
            className="w-full rounded-xl border border-neutral-200 bg-white py-2 pl-9 pr-4 text-sm text-neutral-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {(['all', 'admin_pending', 'admin_approved', 'admin_rejected', 'gib_found', 'gib_not_found'] as const).map(
            (f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  filter === f
                    ? 'bg-primary-600 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'
                }`}
              >
                {f === 'all' ? 'Tümü' : STATUS_LABELS[f]}
              </button>
            ),
          )}
        </div>
        <button
          type="button"
          onClick={load}
          className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-600 shadow-sm hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Yenile
        </button>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-neutral-400">
          <RefreshCw className="h-5 w-5 animate-spin mr-2" />
          Yükleniyor…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 py-16 dark:border-neutral-700 dark:bg-neutral-900/30">
          <Building2 className="h-8 w-8 text-neutral-300 dark:text-neutral-600" />
          <p className="mt-3 text-sm text-neutral-500">Kayıt bulunamadı.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((record) => {
            const isExpanded = expanded === record.id
            const isBusy = busy === record.id

            return (
              <div
                key={record.id}
                className="rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900/40"
              >
                {/* Başlık satırı */}
                <button
                  type="button"
                  onClick={() => setExpanded(isExpanded ? null : record.id)}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
                    <Building2 className="h-5 w-5 text-neutral-500 dark:text-neutral-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-neutral-900 dark:text-white truncate">
                        {record.companyName}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[record.status]}`}
                      >
                        {STATUS_LABELS[record.status]}
                      </span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
                      <span className="font-mono">VKN: {record.vkn}</span>
                      {record.userEmail && <span>{record.userEmail}</span>}
                      <span>{new Date(record.submittedAt).toLocaleString('tr-TR')}</span>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-neutral-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-neutral-400" />
                  )}
                </button>

                {/* Detay paneli */}
                {isExpanded && (
                  <div className="border-t border-neutral-100 px-5 pb-5 pt-4 dark:border-neutral-800">
                    <div className="grid gap-4 sm:grid-cols-2">
                      {/* Sol: Tedarikçi bilgileri */}
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                          Tedarikçi Bilgileri
                        </p>
                        <dl className="space-y-1 text-sm">
                          <div className="flex gap-2">
                            <dt className="w-28 text-neutral-500 shrink-0">Firma:</dt>
                            <dd className="font-medium text-neutral-900 dark:text-white">{record.companyName}</dd>
                          </div>
                          <div className="flex gap-2">
                            <dt className="w-28 text-neutral-500 shrink-0">VKN:</dt>
                            <dd className="font-mono text-neutral-900 dark:text-white">{record.vkn}</dd>
                          </div>
                          {record.taxOffice && (
                            <div className="flex gap-2">
                              <dt className="w-28 text-neutral-500 shrink-0">Vergi dairesi:</dt>
                              <dd className="text-neutral-900 dark:text-white">{record.taxOffice}</dd>
                            </div>
                          )}
                          {record.userEmail && (
                            <div className="flex gap-2">
                              <dt className="w-28 text-neutral-500 shrink-0">E-posta:</dt>
                              <dd className="text-neutral-900 dark:text-white">{record.userEmail}</dd>
                            </div>
                          )}
                        </dl>
                      </div>

                      {/* Sağ: GİB sonucu */}
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                            GİB Sorgu Sonucu
                          </p>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void reQueryGib(record)}
                            className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400"
                          >
                            <RefreshCw className={`h-3 w-3 ${isBusy ? 'animate-spin' : ''}`} />
                            Yeniden sorgula
                          </button>
                        </div>
                        {record.gibTitle || record.gibTaxOffice ? (
                          <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3 dark:border-blue-900/40 dark:bg-blue-950/20">
                            <div className="flex items-start gap-2">
                              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                              <dl className="space-y-0.5 text-xs">
                                {record.gibTitle && (
                                  <div>
                                    <dt className="text-blue-500">GİB Ünvanı</dt>
                                    <dd className="font-medium text-blue-900 dark:text-blue-100">{record.gibTitle}</dd>
                                  </div>
                                )}
                                {record.gibTaxOffice && (
                                  <div>
                                    <dt className="text-blue-500">Vergi Dairesi</dt>
                                    <dd className="font-medium text-blue-900 dark:text-blue-100">{record.gibTaxOffice}</dd>
                                  </div>
                                )}
                              </dl>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            GİB'de kayıt bulunamadı. Manuel inceleme gerekebilir.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Admin notu */}
                    <div className="mt-4">
                      <label className="block text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-1.5">
                        Admin Notu {record.status === 'admin_rejected' && <span className="text-red-500">*</span>}
                      </label>
                      <textarea
                        rows={2}
                        value={noteInputs[record.id] ?? ''}
                        onChange={(e) =>
                          setNoteInputs((prev) => ({ ...prev, [record.id]: e.target.value }))
                        }
                        placeholder={
                          record.status === 'admin_pending'
                            ? 'Onay veya red notu ekleyin (opsiyonel)…'
                            : 'Not…'
                        }
                        disabled={record.status === 'admin_approved'}
                        className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                      />
                    </div>

                    {/* Aksiyon butonları */}
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      {record.status !== 'admin_approved' && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleApprove(record.id)}
                          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <ShieldCheck className="h-4 w-4" />
                          {isBusy ? 'İşleniyor…' : 'Onayla'}
                        </button>
                      )}
                      {record.status !== 'admin_rejected' && record.status !== 'admin_approved' && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleReject(record.id)}
                          className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 shadow-sm hover:bg-red-50 disabled:opacity-50 dark:border-red-900/50 dark:bg-neutral-900 dark:text-red-300 dark:hover:bg-red-950/40"
                        >
                          <ShieldX className="h-4 w-4" />
                          Reddet
                        </button>
                      )}
                      {record.status === 'admin_approved' && (
                        <div className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                          <CheckCircle2 className="h-4 w-4" />
                          Onaylandı
                          {record.reviewedAt && (
                            <span className="ml-2 text-xs text-emerald-600">
                              {new Date(record.reviewedAt).toLocaleDateString('tr-TR')}
                            </span>
                          )}
                        </div>
                      )}
                      {record.status === 'admin_rejected' && (
                        <div className="flex items-center gap-1.5 rounded-xl bg-red-50 px-4 py-2 text-sm font-medium text-red-800 dark:bg-red-950/30 dark:text-red-300">
                          <XCircle className="h-4 w-4" />
                          Reddedildi
                        </div>
                      )}
                      <button
                        type="button"
                        className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Evrak Talep Et
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Bilgi notu */}
      <div className="mt-6 rounded-xl border border-neutral-100 bg-neutral-50 p-4 text-xs text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/30">
        <p className="font-medium text-neutral-600 dark:text-neutral-400 mb-1">Doğrulama Akışı</p>
        <ol className="list-decimal list-inside space-y-0.5">
          <li>Tedarikçi VKN ve firma adını girer, sistem GİB sorgusu yapar</li>
          <li>GİB'de bulunursa <strong className="text-blue-600">GİB'de Bulundu</strong> statüsüne geçer</li>
          <li>Admin inceleyerek onaylar veya reddeder, gerekirse evrak talep eder</li>
          <li>Onay sonrası tedarikçi tüm faturalama özelliklerine erişir</li>
        </ol>
      </div>
    </div>
  )
}
