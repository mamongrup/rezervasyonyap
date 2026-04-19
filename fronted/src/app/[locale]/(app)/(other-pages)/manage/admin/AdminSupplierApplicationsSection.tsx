'use client'

import { useCallback, useEffect, useState } from 'react'
import { getStoredAuthToken } from '@/lib/auth-storage'
import {
  adminListSupplierApplications,
  adminApproveSupplierApplication,
  adminRejectSupplierApplication,
  type AdminSupplierApplication,
} from '@/lib/travel-api'
import { CheckCircle2, XCircle, Clock, Eye, FileText, Loader2, ChevronDown, ChevronUp } from 'lucide-react'

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  draft:        { label: 'Taslak',             color: 'text-neutral-600', bg: 'bg-neutral-100 dark:bg-neutral-800' },
  submitted:    { label: 'Gönderildi',         color: 'text-blue-700',    bg: 'bg-blue-50 dark:bg-blue-900/20' },
  under_review: { label: 'İnceleniyor',        color: 'text-orange-700',  bg: 'bg-orange-50 dark:bg-orange-900/20' },
  approved:     { label: 'Onaylandı',          color: 'text-green-700',   bg: 'bg-green-50 dark:bg-green-900/20' },
  rejected:     { label: 'Reddedildi',         color: 'text-red-700',     bg: 'bg-red-50 dark:bg-red-900/20' },
}

const CAT_LABELS: Record<string, string> = {
  hotel: 'Otel', holiday_home: 'Tatil Evi / Villa', yacht_charter: 'Yat',
  tour: 'Tur', activity: 'Aktivite', cruise: 'Kruvaziyer',
  car_rental: 'Araç Kiralama', transfer: 'Transfer', ferry: 'Feribot',
  hajj: 'Hac & Umre', visa: 'Vize', flight: 'Uçak Bileti',
}

export default function AdminSupplierApplicationsSection() {
  const [apps, setApps] = useState<AdminSupplierApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({})
  const [working, setWorking] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) {
      setMsg('Oturum bulunamadı. Lütfen giriş yapın.')
      setApps([])
      setLoading(false)
      return
    }
    setLoading(true)
    setMsg('')
    try {
      const res = await adminListSupplierApplications(token, statusFilter)
      setApps(res.applications)
    } catch (e: unknown) {
      setMsg(e instanceof Error ? `Başvurular yüklenemedi: ${e.message}` : 'Başvurular yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { load() }, [load])

  const handleApprove = async (id: string) => {
    const token = getStoredAuthToken()
    if (!token) return
    setWorking(id)
    try {
      await adminApproveSupplierApplication(token, id)
      setMsg('Başvuru onaylandı. Tedarikçi bu kategoride ilan ekleyebilir.')
      load()
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Hata')
    } finally {
      setWorking(null)
    }
  }

  const handleReject = async (id: string) => {
    const token = getStoredAuthToken()
    if (!token) return
    setWorking(id)
    try {
      await adminRejectSupplierApplication(token, id, rejectNotes[id])
      setMsg('Başvuru reddedildi.')
      load()
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Hata')
    } finally {
      setWorking(null)
    }
  }

  const statusCounts = apps.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Tedarikçi Başvuruları</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Kategori başvurularını inceleyin ve onaylayın
          </p>
        </div>
        {/* Status counts */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(STATUS_LABELS).map(([s, { label, bg, color }]) =>
            statusCounts[s] ? (
              <button
                key={s}
                onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium ${bg} ${color} ${statusFilter === s ? 'ring-2 ring-offset-1 ring-current' : ''}`}
              >
                {label} ({statusCounts[s]})
              </button>
            ) : null,
          )}
          {statusFilter !== 'all' && (
            <button
              onClick={() => setStatusFilter('all')}
              className="rounded-lg px-2.5 py-1 text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
            >
              Tümü
            </button>
          )}
        </div>
      </div>

      {msg && (
        <div className="rounded-xl border border-primary-200 bg-primary-50 px-4 py-2.5 text-sm text-primary-700 dark:border-primary-900 dark:bg-primary-900/10 dark:text-primary-300">
          {msg}
          <button onClick={() => setMsg('')} className="ml-3 underline text-xs">Kapat</button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-primary-500" /></div>
      ) : apps.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-700 py-16 text-center text-neutral-400">
          <FileText className="mx-auto h-10 w-10 mb-3 opacity-40" />
          <p>Başvuru bulunamadı</p>
        </div>
      ) : (
        <div className="space-y-3">
          {apps.map((app) => {
            const sc = STATUS_LABELS[app.status] ?? STATUS_LABELS.draft
            const isExpanded = expanded === app.id
            return (
              <div
                key={app.id}
                className="rounded-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden"
              >
                {/* Header row */}
                <div className="flex items-center gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-neutral-900 dark:text-white text-sm">
                        {app.display_name || app.email}
                      </span>
                      <span className="text-xs text-neutral-400">{app.email}</span>
                      <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${sc.bg} ${sc.color}`}>
                        {sc.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                      <span>📋 {CAT_LABELS[app.category_code] ?? app.category_code}</span>
                      {app.business_name && <span>🏢 {app.business_name}</span>}
                      {app.submitted_at && (
                        <span>📅 {new Date(app.submitted_at).toLocaleDateString('tr-TR')}</span>
                      )}
                      <span>📎 {app.documents.length} belge</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setExpanded(isExpanded ? null : app.id)}
                    className="rounded-xl p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-neutral-100 dark:border-neutral-800 p-4 space-y-4">
                    {/* Business info */}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      {[
                        ['İşletme Türü', app.business_type === 'company' ? 'Şirket' : app.business_type === 'individual' ? 'Bireysel' : '—'],
                        ['Vergi No', app.tax_number || '—'],
                        ['Telefon', app.phone || '—'],
                        ['Adres', app.address || '—'],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <span className="text-neutral-400 text-xs">{k}</span>
                          <p className="font-medium text-neutral-800 dark:text-neutral-200">{v}</p>
                        </div>
                      ))}
                      {app.notes && (
                        <div className="col-span-2">
                          <span className="text-neutral-400 text-xs">Notlar</span>
                          <p className="text-neutral-700 dark:text-neutral-300">{app.notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Documents */}
                    {app.documents.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-2">Yüklenen Belgeler</p>
                        <div className="space-y-2">
                          {app.documents.map((doc) => (
                            <div
                              key={doc.id}
                              className="flex items-center gap-3 rounded-xl border border-neutral-100 dark:border-neutral-800 p-3"
                            >
                              <FileText className="h-4 w-4 text-neutral-400 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{doc.doc_label}</p>
                                <p className="text-xs text-neutral-400">{doc.doc_type}</p>
                              </div>
                              {doc.file_path && (
                                <a
                                  href={doc.file_path}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                                >
                                  <Eye className="h-3.5 w-3.5" /> Görüntüle
                                </a>
                              )}
                              <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                                doc.status === 'uploaded' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' :
                                doc.status === 'approved' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                                doc.status === 'rejected' ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                                'bg-neutral-100 text-neutral-500'
                              }`}>
                                {doc.status === 'uploaded' ? 'Yüklendi' : doc.status === 'approved' ? 'Onaylı' : doc.status === 'rejected' ? 'Reddedildi' : 'Bekleniyor'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    {(app.status === 'submitted' || app.status === 'under_review') && (
                      <div className="space-y-3 pt-2">
                        <div>
                          <label className="block text-xs font-medium text-neutral-500 mb-1.5">
                            Red notu (isteğe bağlı)
                          </label>
                          <input
                            type="text"
                            placeholder="Eksik belge veya red sebebini yazın..."
                            value={rejectNotes[app.id] ?? ''}
                            onChange={(e) => setRejectNotes((p) => ({ ...p, [app.id]: e.target.value }))}
                            className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
                          />
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleApprove(app.id)}
                            disabled={working === app.id}
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                          >
                            {working === app.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                            Onayla
                          </button>
                          <button
                            onClick={() => handleReject(app.id)}
                            disabled={working === app.id}
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-900/10 dark:text-red-400 disabled:opacity-60"
                          >
                            <XCircle className="h-4 w-4" />
                            Reddet
                          </button>
                        </div>
                      </div>
                    )}

                    {app.admin_notes && (
                      <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800 px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">
                        <span className="font-medium">Admin Notu:</span> {app.admin_notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
