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
  FileText,
  AlertTriangle,
  Phone,
  MapPin,
  User,
  BadgeCheck,
} from 'lucide-react'

// ─── Tipler ───────────────────────────────────────────────────────────────────
type DocStatus = 'admin_pending' | 'admin_approved' | 'admin_rejected'

interface AgencyVerifyRecord {
  id: string
  userEmail?: string
  userId?: string
  tursabNo: string
  agencyName: string
  vkn?: string
  taxOffice?: string
  authorizedPerson?: string
  phone?: string
  address?: string
  status: DocStatus
  submittedAt: string
  adminNote?: string
  reviewedAt?: string
  reviewedBy?: string
}

const STATUS_LABELS: Record<DocStatus, string> = {
  admin_pending: 'Onay Bekliyor',
  admin_approved: 'Onaylandı',
  admin_rejected: 'Reddedildi',
}

const STATUS_BADGE: Record<DocStatus, string> = {
  admin_pending: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  admin_approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  admin_rejected: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300',
}

// ─── Demo verisi ─────────────────────────────────────────────────────────────
function loadDemoRecords(): AgencyVerifyRecord[] {
  return [
    {
      id: 'ag-001',
      userEmail: 'info@abcseyahat.com',
      tursabNo: 'A1234',
      agencyName: 'ABC Seyahat Acentası A.Ş.',
      vkn: '1234567890',
      taxOffice: 'Beyoğlu Vergi Dairesi',
      authorizedPerson: 'Ahmet Yılmaz',
      phone: '+90 212 123 45 67',
      address: 'Beyoğlu, İstanbul',
      status: 'admin_pending',
      submittedAt: new Date(Date.now() - 3 * 3600_000).toISOString(),
    },
    {
      id: 'ag-002',
      userEmail: 'bodrum@tatilevi.tr',
      tursabNo: 'B5678',
      agencyName: 'Bodrum Tatil Evi Turizm',
      vkn: '9876543210',
      taxOffice: 'Bodrum Vergi Dairesi',
      authorizedPerson: 'Fatma Kaya',
      phone: '+90 252 316 55 44',
      address: 'Bodrum, Muğla',
      status: 'admin_pending',
      submittedAt: new Date(Date.now() - 18 * 3600_000).toISOString(),
    },
    {
      id: 'ag-003',
      userEmail: 'marmaris@blueline.com',
      tursabNo: 'A7890',
      agencyName: 'Blue Line Turizm A.Ş.',
      vkn: '5432167890',
      taxOffice: 'Marmaris Vergi Dairesi',
      authorizedPerson: 'Mehmet Demir',
      phone: '+90 252 412 10 10',
      address: 'Marmaris, Muğla',
      status: 'admin_approved',
      submittedAt: new Date(Date.now() - 7 * 24 * 3600_000).toISOString(),
      reviewedAt: new Date(Date.now() - 6 * 24 * 3600_000).toISOString(),
      reviewedBy: 'admin@site.com',
      adminNote: 'TÜRSAB kaydı doğrulandı, A grubu belgesi geçerli.',
    },
    {
      id: 'ag-004',
      userEmail: 'info@gecelikseyahat.com',
      tursabNo: 'B0099',
      agencyName: 'Gecelik Seyahat',
      status: 'admin_rejected',
      submittedAt: new Date(Date.now() - 14 * 24 * 3600_000).toISOString(),
      reviewedAt: new Date(Date.now() - 13 * 24 * 3600_000).toISOString(),
      reviewedBy: 'admin@site.com',
      adminNote: 'TÜRSAB.org üzerinde bu belge numarası bulunamadı. Lütfen belgeni yeniden kontrol edin.',
    },
  ]
}

// ─── Ana bileşen ─────────────────────────────────────────────────────────────
export default function AgencyVerifyAdminClient() {
  const [records, setRecords] = useState<AgencyVerifyRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | DocStatus>('all')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [actionMsg, setActionMsg] = useState<{ id: string; ok: boolean; text: string } | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setTimeout(() => {
      const data = loadDemoRecords()
      setRecords(data)
      setNoteInputs(Object.fromEntries(data.map((r) => [r.id, r.adminNote ?? ''])))
      setLoading(false)
    }, 350)
  }, [])

  useEffect(() => { void load() }, [load])

  function handleApprove(id: string) {
    const note = noteInputs[id]?.trim()
    setBusy(id)
    setTimeout(() => {
      setRecords((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, status: 'admin_approved', reviewedAt: new Date().toISOString(), reviewedBy: 'admin', adminNote: note || undefined }
            : r,
        ),
      )
      setBusy(null)
      setActionMsg({ id, ok: true, text: 'Acente onaylandı. Belge durumu güncellendi.' })
      setTimeout(() => setActionMsg(null), 4000)
    }, 500)
  }

  function handleReject(id: string) {
    const note = noteInputs[id]?.trim()
    if (!note) {
      setActionMsg({ id, ok: false, text: 'Lütfen red gerekçesini admin notu alanına yazın.' })
      setTimeout(() => setActionMsg(null), 4000)
      return
    }
    setBusy(id)
    setTimeout(() => {
      setRecords((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, status: 'admin_rejected', reviewedAt: new Date().toISOString(), reviewedBy: 'admin', adminNote: note }
            : r,
        ),
      )
      setBusy(null)
      setActionMsg({ id, ok: true, text: 'Başvuru reddedildi. Acente bilgilendirildi.' })
      setTimeout(() => setActionMsg(null), 4000)
    }, 500)
  }

  function handleRequestDoc(id: string) {
    setActionMsg({ id, ok: true, text: 'Evrak talebi e-postası gönderildi (simülasyon).' })
    setTimeout(() => setActionMsg(null), 4000)
  }

  const filtered = records.filter((r) => {
    if (filter !== 'all' && r.status !== filter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        r.agencyName.toLowerCase().includes(q) ||
        r.tursabNo.toLowerCase().includes(q) ||
        (r.vkn?.includes(q) ?? false) ||
        (r.userEmail?.toLowerCase().includes(q) ?? false) ||
        (r.authorizedPerson?.toLowerCase().includes(q) ?? false)
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
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-neutral-900 dark:text-white">
          <Briefcase className="h-6 w-6 text-primary-600" />
          Acente TÜRSAB Doğrulama
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Acente hesapları için TÜRSAB belge numarası başvurularını inceleyin ve onaylayın.
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
          {' '}— Belge numarasını, unvanı ve grubunu buradan kontrol edebilirsiniz.
        </span>
      </div>

      {/* Filtreler */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Acente adı, TÜRSAB no, VKN veya e-posta ara…"
            className="w-full rounded-xl border border-neutral-200 bg-white py-2 pl-9 pr-4 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {(['all', 'admin_pending', 'admin_approved', 'admin_rejected'] as const).map((f) => (
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
            const isExpanded = expanded === record.id
            const isBusy = busy === record.id
            const msg = actionMsg?.id === record.id ? actionMsg : null

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
                    <Briefcase className="h-5 w-5 text-neutral-500 dark:text-neutral-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-neutral-900 dark:text-white truncate">
                        {record.agencyName}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-mono font-semibold text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
                        TÜRSAB {record.tursabNo}
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[record.status]}`}>
                        {STATUS_LABELS[record.status]}
                      </span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
                      {record.vkn && <span className="font-mono">VKN: {record.vkn}</span>}
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
                      {/* Sol: Başvuru bilgileri */}
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                          Başvuru Bilgileri
                        </p>
                        <dl className="space-y-2 text-sm">
                          <div className="flex gap-2">
                            <dt className="w-32 shrink-0 text-neutral-500">Acente Adı:</dt>
                            <dd className="font-medium">{record.agencyName}</dd>
                          </div>
                          <div className="flex items-center gap-2">
                            <dt className="w-32 shrink-0 text-neutral-500">TÜRSAB No:</dt>
                            <dd>
                              <span className="rounded-lg bg-blue-50 px-2 py-0.5 font-mono font-bold text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
                                {record.tursabNo}
                              </span>
                              <span className="ml-2 text-xs text-neutral-400">
                                {record.tursabNo.startsWith('A') ? '(A Grubu — Yurt içi + dışı)' : record.tursabNo.startsWith('B') ? '(B Grubu — Yurt içi)' : ''}
                              </span>
                            </dd>
                          </div>
                          {record.vkn && (
                            <div className="flex gap-2">
                              <dt className="w-32 shrink-0 text-neutral-500">VKN:</dt>
                              <dd className="font-mono">{record.vkn}</dd>
                            </div>
                          )}
                          {record.taxOffice && (
                            <div className="flex gap-2">
                              <dt className="w-32 shrink-0 text-neutral-500">Vergi Dairesi:</dt>
                              <dd>{record.taxOffice}</dd>
                            </div>
                          )}
                          {record.authorizedPerson && (
                            <div className="flex items-center gap-2">
                              <dt className="w-32 shrink-0 text-neutral-500 flex items-center gap-1">
                                <User className="h-3 w-3" /> Yetkili:
                              </dt>
                              <dd>{record.authorizedPerson}</dd>
                            </div>
                          )}
                          {record.phone && (
                            <div className="flex items-center gap-2">
                              <dt className="w-32 shrink-0 text-neutral-500 flex items-center gap-1">
                                <Phone className="h-3 w-3" /> Telefon:
                              </dt>
                              <dd>
                                <a href={`tel:${record.phone}`} className="text-primary-600 hover:underline dark:text-primary-400">
                                  {record.phone}
                                </a>
                              </dd>
                            </div>
                          )}
                          {record.address && (
                            <div className="flex items-center gap-2">
                              <dt className="w-32 shrink-0 text-neutral-500 flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> Adres:
                              </dt>
                              <dd>{record.address}</dd>
                            </div>
                          )}
                          {record.userEmail && (
                            <div className="flex gap-2">
                              <dt className="w-32 shrink-0 text-neutral-500">E-posta:</dt>
                              <dd>
                                <a href={`mailto:${record.userEmail}`} className="text-primary-600 hover:underline dark:text-primary-400">
                                  {record.userEmail}
                                </a>
                              </dd>
                            </div>
                          )}
                        </dl>
                      </div>

                      {/* Sağ: TÜRSAB doğrulama rehberi */}
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                          Doğrulama Adımları
                        </p>
                        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/50">
                          <ol className="space-y-2 text-xs text-neutral-600 dark:text-neutral-400">
                            <li className="flex items-start gap-2">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-bold dark:bg-neutral-700">1</span>
                              <span>
                                <a
                                  href={`https://www.tursab.org.tr/acente-sorgulama?q=${record.tursabNo}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-medium text-primary-600 underline"
                                >
                                  TÜRSAB.org'da sorgula
                                </a>{' '}
                                → {record.tursabNo} numaralı belgeyi kontrol et
                              </span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-bold dark:bg-neutral-700">2</span>
                              <span>
                                Unvan "{record.agencyName}" ile eşleşiyor mu? kontrol et
                              </span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-bold dark:bg-neutral-700">3</span>
                              <span>Belge grubu (A/B) ve geçerlilik tarihi uygunsa onayla</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-bold dark:bg-neutral-700">4</span>
                              <span>Eşleşmiyorsa evrak talep et veya reddet</span>
                            </li>
                          </ol>
                        </div>
                        {record.reviewedAt && (
                          <p className="mt-3 text-xs text-neutral-400">
                            İnceleme: {new Date(record.reviewedAt).toLocaleString('tr-TR')}
                            {record.reviewedBy && ` — ${record.reviewedBy}`}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Admin notu */}
                    <div className="mt-4">
                      <label className="block text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-1.5">
                        Admin Notu{' '}
                        {record.status === 'admin_pending' && (
                          <span className="text-red-400 normal-case font-normal">(red için zorunlu)</span>
                        )}
                      </label>
                      <textarea
                        rows={2}
                        value={noteInputs[record.id] ?? ''}
                        onChange={(e) => setNoteInputs((prev) => ({ ...prev, [record.id]: e.target.value }))}
                        placeholder={
                          record.status === 'admin_pending'
                            ? 'Onay veya red notu… Red ise mutlaka gerekçe yazın.'
                            : record.adminNote || 'Not yok.'
                        }
                        disabled={record.status === 'admin_approved'}
                        className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:bg-neutral-50 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                      />
                    </div>

                    {/* Mesaj */}
                    {msg && (
                      <div className={`mt-3 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm ${
                        msg.ok
                          ? 'border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300'
                          : 'border border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300'
                      }`}>
                        {msg.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
                        {msg.text}
                      </div>
                    )}

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
                          className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 shadow-sm hover:bg-red-50 disabled:opacity-50 dark:border-red-900/50 dark:bg-neutral-900 dark:text-red-300"
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
                            <span className="ml-1 text-xs text-emerald-600">
                              {new Date(record.reviewedAt).toLocaleDateString('tr-TR')}
                            </span>
                          )}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRequestDoc(record.id)}
                        className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        TÜRSAB Belgesi Talep Et
                      </button>
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
          <li>Acente TÜRSAB belge numarası ve firma bilgilerini gönderir</li>
          <li>Admin <strong>tursab.org.tr/acente-sorgulama</strong> üzerinden belgeyi doğrular</li>
          <li>Unvan ve belge grubu (A/B) eşleşiyorsa onaylar; eşleşmiyorsa evrak talep eder</li>
          <li>Onay sonrası acente portaldaki tüm özelliklere (API, fatura, iskonto) erişir</li>
        </ol>
      </div>
    </div>
  )
}
