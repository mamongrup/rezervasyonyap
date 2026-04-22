'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Briefcase,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  ShieldCheck,
  ShieldX,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  BadgeCheck,
  Loader2,
} from 'lucide-react'
import {
  listAdminAgencyProfiles,
  patchAdminAgencyProfiles,
  type AdminAgencyProfileRow,
} from '@/lib/travel-api'
import { getStoredAuthToken } from '@/lib/auth-storage'

// ─── Tipler ───────────────────────────────────────────────────────────────────
/** Backend `agency_profiles.document_status` alanı için izinli değerler.
 *  Sunucu tarafı doğrulama: `valid_agency_document_status` (identity_http.gleam). */
type DocStatus = 'pending' | 'approved' | 'rejected'

interface AgencyVerifyRecord {
  organizationId: string
  userId: string
  userEmail: string
  organizationName: string
  organizationSlug: string
  tursabNo: string
  tursabVerifyUrl: string
  discountPercent: string
  status: DocStatus
  submittedAt: string
}

const STATUS_LABELS: Record<DocStatus, string> = {
  pending: 'Onay Bekliyor',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
}

const STATUS_BADGE: Record<DocStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300',
}

/** Backend'in döndürdüğü ham `document_status` değerini UI tipine indirger.
 *  Bilinmeyen değerleri `pending` kabul eder (yeni eklenecek statüler için güvenli varsayılan). */
function normalizeStatus(raw: string): DocStatus {
  const s = (raw ?? '').trim().toLowerCase()
  if (s === 'approved') return 'approved'
  if (s === 'rejected') return 'rejected'
  return 'pending'
}

function rowToRecord(row: AdminAgencyProfileRow): AgencyVerifyRecord {
  return {
    organizationId: row.organization_id ?? '',
    userId: row.user_id,
    userEmail: row.email ?? '',
    organizationName: row.organization_name ?? '(adsız acente)',
    organizationSlug: row.organization_slug ?? '',
    tursabNo: row.tursab_license_no ?? '',
    tursabVerifyUrl: row.tursab_verify_url ?? '',
    discountPercent: row.discount_percent ?? '0',
    status: normalizeStatus(row.document_status),
    submittedAt: row.created_at ?? '',
  }
}

// ─── Ana bileşen ─────────────────────────────────────────────────────────────
export default function AgencyVerifyAdminClient() {
  const [records, setRecords] = useState<AgencyVerifyRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | DocStatus>('all')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [discountInputs, setDiscountInputs] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [actionMsg, setActionMsg] = useState<{ id: string; ok: boolean; text: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    const token = getStoredAuthToken()
    if (!token) {
      setLoadError('Oturum gerekli. Lütfen yönetici olarak giriş yapın.')
      setLoading(false)
      return
    }
    try {
      const { profiles } = await listAdminAgencyProfiles(token, '')
      const data = profiles.map(rowToRecord)
      setRecords(data)
      setDiscountInputs(
        Object.fromEntries(data.map((r) => [r.organizationId, r.discountPercent])),
      )
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'list_failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function patchStatus(orgId: string, status: DocStatus) {
    const token = getStoredAuthToken()
    if (!token) {
      setActionMsg({ id: orgId, ok: false, text: 'Oturum gerekli.' })
      return
    }
    setBusy(orgId)
    setActionMsg(null)
    try {
      const discount = discountInputs[orgId]?.trim()
      const body: { agency_organization_id: string; document_status: string; discount_percent?: string } = {
        agency_organization_id: orgId,
        document_status: status,
      }
      if (discount && discount !== '') body.discount_percent = discount
      await patchAdminAgencyProfiles(token, body)
      setRecords((prev) =>
        prev.map((r) =>
          r.organizationId === orgId
            ? { ...r, status, discountPercent: discount && discount !== '' ? discount : r.discountPercent }
            : r,
        ),
      )
      setActionMsg({
        id: orgId,
        ok: true,
        text:
          status === 'approved'
            ? 'Acente onaylandı. Belge durumu güncellendi.'
            : status === 'rejected'
              ? 'Başvuru reddedildi.'
              : 'Durum güncellendi.',
      })
      setTimeout(() => setActionMsg(null), 4000)
    } catch (e) {
      setActionMsg({
        id: orgId,
        ok: false,
        text: e instanceof Error ? e.message : 'update_failed',
      })
      setTimeout(() => setActionMsg(null), 6000)
    } finally {
      setBusy(null)
    }
  }

  const filtered = records.filter((r) => {
    if (filter !== 'all' && r.status !== filter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        r.organizationName.toLowerCase().includes(q) ||
        r.tursabNo.toLowerCase().includes(q) ||
        r.organizationSlug.toLowerCase().includes(q) ||
        r.userEmail.toLowerCase().includes(q)
      )
    }
    return true
  })

  const pendingCount = records.filter((r) => r.status === 'pending').length
  const approvedCount = records.filter((r) => r.status === 'approved').length
  const rejectedCount = records.filter((r) => r.status === 'rejected').length

  return (
    <div className="p-6 lg:p-8">
      {/* Başlık */}
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-neutral-900 dark:text-white">
          <Briefcase className="h-6 w-6 text-primary-600" />
          Acente TÜRSAB Doğrulama
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Acente kuruluşları için TÜRSAB belge numarası doğrulayın, belge durumunu ve indirim yüzdesini güncelleyin.
        </p>
      </div>

      {/* Özet kartlar */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Bekleyen</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-1 text-3xl font-bold text-amber-900 dark:text-amber-100">{pendingCount}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Onaylanan</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-1 text-3xl font-bold text-emerald-900 dark:text-emerald-100">{approvedCount}</div>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-red-600 dark:text-red-400">Reddedilen</span>
            <XCircle className="h-4 w-4 text-red-500" />
          </div>
          <div className="mt-1 text-3xl font-bold text-red-900 dark:text-red-100">{rejectedCount}</div>
        </div>
      </div>

      {/* TÜRSAB sorgulama linki */}
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm dark:border-blue-900/30 dark:bg-blue-950/20">
        <BadgeCheck className="h-4 w-4 shrink-0 text-blue-500" />
        <span className="text-blue-700 dark:text-blue-300">
          TÜRSAB belge numarasını doğrulamak için:{' '}
          <a
            href="https://www.tursab.org.tr/acente-sorgulama"
            target="_blank"
            rel="noreferrer"
            className="font-semibold underline"
          >
            tursab.org.tr/acente-sorgulama
          </a>
          {' '}— Belge numarasını ve unvanı buradan kontrol edebilirsiniz.
        </span>
      </div>

      {loadError && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Liste yüklenemedi: {loadError}</span>
        </div>
      )}

      {/* Filtreler */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Acente adı, TÜRSAB no, slug veya e-posta ara…"
            className="w-full rounded-xl border border-neutral-200 bg-white py-2 pl-9 pr-4 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                filter === f
                  ? 'bg-primary-600 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400'
              }`}
            >
              {f === 'all' ? 'Tümü' : STATUS_LABELS[f]}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-600 shadow-sm hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Yenile
        </button>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-neutral-400">
          <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
          Yükleniyor…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 py-16 dark:border-neutral-700 dark:bg-neutral-900/30">
          <Briefcase className="h-8 w-8 text-neutral-300 dark:text-neutral-600" />
          <p className="mt-3 text-sm text-neutral-500">Kayıt bulunamadı.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((record) => {
            const isExpanded = expanded === record.organizationId
            const isBusy = busy === record.organizationId
            const msg = actionMsg?.id === record.organizationId ? actionMsg : null
            const verifyHref =
              record.tursabVerifyUrl && record.tursabVerifyUrl.trim() !== ''
                ? record.tursabVerifyUrl
                : `https://www.tursab.org.tr/acente-sorgulama?q=${encodeURIComponent(record.tursabNo)}`

            return (
              <div
                key={record.organizationId}
                className="rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900/40"
              >
                {/* Başlık satırı */}
                <button
                  type="button"
                  onClick={() => setExpanded(isExpanded ? null : record.organizationId)}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
                    <Briefcase className="h-5 w-5 text-neutral-500 dark:text-neutral-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-semibold text-neutral-900 dark:text-white">
                        {record.organizationName}
                      </span>
                      {record.tursabNo && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 font-mono text-xs font-semibold text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
                          TÜRSAB {record.tursabNo}
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[record.status]}`}
                      >
                        {STATUS_LABELS[record.status]}
                      </span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
                      {record.organizationSlug && <span>/{record.organizationSlug}</span>}
                      {record.userEmail && <span>{record.userEmail}</span>}
                      {record.submittedAt && (
                        <span>{new Date(record.submittedAt).toLocaleString('tr-TR')}</span>
                      )}
                      <span className="font-mono">İndirim: %{record.discountPercent}</span>
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
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                          Acente Bilgileri
                        </p>
                        <dl className="space-y-2 text-sm">
                          <div className="flex gap-2">
                            <dt className="w-32 shrink-0 text-neutral-500">Ad:</dt>
                            <dd className="font-medium">{record.organizationName}</dd>
                          </div>
                          {record.organizationSlug && (
                            <div className="flex gap-2">
                              <dt className="w-32 shrink-0 text-neutral-500">Slug:</dt>
                              <dd className="font-mono">{record.organizationSlug}</dd>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <dt className="w-32 shrink-0 text-neutral-500">TÜRSAB No:</dt>
                            <dd>
                              <span className="rounded-lg bg-blue-50 px-2 py-0.5 font-mono font-bold text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
                                {record.tursabNo || '—'}
                              </span>
                            </dd>
                          </div>
                          {record.userEmail && (
                            <div className="flex gap-2">
                              <dt className="w-32 shrink-0 text-neutral-500">Kullanıcı:</dt>
                              <dd>
                                <a
                                  href={`mailto:${record.userEmail}`}
                                  className="text-primary-600 hover:underline dark:text-primary-400"
                                >
                                  {record.userEmail}
                                </a>
                              </dd>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <dt className="w-32 shrink-0 text-neutral-500">Org ID:</dt>
                            <dd className="font-mono text-xs text-neutral-500">{record.organizationId}</dd>
                          </div>
                        </dl>
                      </div>

                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                          Doğrulama
                        </p>
                        <a
                          href={verifyHref}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300"
                        >
                          <BadgeCheck className="h-4 w-4" />
                          TÜRSAB'da Sorgula
                        </a>

                        <div className="mt-4">
                          <label
                            htmlFor={`discount-${record.organizationId}`}
                            className="mb-1 block text-xs font-medium text-neutral-500"
                          >
                            İndirim Yüzdesi (acenteye uygulanır)
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              id={`discount-${record.organizationId}`}
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={discountInputs[record.organizationId] ?? ''}
                              onChange={(e) =>
                                setDiscountInputs((prev) => ({
                                  ...prev,
                                  [record.organizationId]: e.target.value,
                                }))
                              }
                              className="w-28 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                            />
                            <span className="text-sm text-neutral-500">%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Mesaj */}
                    {msg && (
                      <div
                        className={`mt-3 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm ${
                          msg.ok
                            ? 'border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300'
                            : 'border border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300'
                        }`}
                      >
                        {msg.ok ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                        )}
                        {msg.text}
                      </div>
                    )}

                    {/* Aksiyon butonları */}
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      {record.status !== 'approved' && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void patchStatus(record.organizationId, 'approved')}
                          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {isBusy ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ShieldCheck className="h-4 w-4" />
                          )}
                          Onayla
                        </button>
                      )}
                      {record.status !== 'rejected' && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void patchStatus(record.organizationId, 'rejected')}
                          className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 shadow-sm hover:bg-red-50 disabled:opacity-50 dark:border-red-900/50 dark:bg-neutral-900 dark:text-red-300"
                        >
                          {isBusy ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ShieldX className="h-4 w-4" />
                          )}
                          Reddet
                        </button>
                      )}
                      {record.status !== 'pending' && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void patchStatus(record.organizationId, 'pending')}
                          className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400"
                        >
                          <Clock className="h-3.5 w-3.5" />
                          Beklemeye Al
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Alt bilgi */}
      <div className="mt-6 rounded-xl border border-neutral-100 bg-neutral-50 p-4 text-xs text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/30">
        <p className="mb-1 font-medium text-neutral-600 dark:text-neutral-400">Onay Akışı</p>
        <ol className="list-inside list-decimal space-y-0.5">
          <li>Acente kuruluşu (organizations.org_type='agency') TÜRSAB belge numarasını yönetici panelinden tanımlar.</li>
          <li>Admin <strong>tursab.org.tr/acente-sorgulama</strong> üzerinden belgeyi doğrular.</li>
          <li>Eşleşiyorsa onaylanır → backend `agency_profiles.document_status = 'approved'`.</li>
          <li>Onay sonrası acente, sepet ve checkout akışlarında (booking_http) bağlı kullanıcılarla işlem yapabilir.</li>
        </ol>
      </div>
    </div>
  )
}
