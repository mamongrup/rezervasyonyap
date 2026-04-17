'use client'

import { useState, useEffect, type FormEvent } from 'react'
import {
  Briefcase,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  ShieldX,
  Clock,
  FileText,
  Info,
} from 'lucide-react'

// ─── localStorage anahtarı ────────────────────────────────────────────────────
const AGENCY_VERIFY_KEY = 'agency_verify_state'

// ─── Tipler ───────────────────────────────────────────────────────────────────
type VerifyStatus =
  | 'idle'
  | 'pending'
  | 'admin_pending'
  | 'admin_approved'
  | 'admin_rejected'
  | 'invalid'
  | 'error'

export interface AgencyVerifyState {
  tursabNo: string
  vkn: string
  agencyName: string
  taxOffice: string
  authorizedPerson: string
  phone: string
  address: string
  status: VerifyStatus
  submittedAt: string
  adminNote?: string
  reviewedAt?: string
}

interface Props {
  onVerified?: (state: AgencyVerifyState) => void
  onPending?: (state: AgencyVerifyState) => void
  compact?: boolean
}

// ─── TÜRSAB belge no format doğrulama ────────────────────────────────────────
// Format: Genellikle A veya B harfi + 4-5 rakam (ör: A-1234, B12345)
// veya sadece rakam (bazı eski belgeler)
function validateTursabNo(no: string): string | null {
  const clean = no.trim().toUpperCase().replace(/[-\s]/g, '')
  if (!clean) return 'TÜRSAB belge numarası boş olamaz.'
  // Kabul edilen formatlar: A1234, B12345, 12345, A-1234 vb.
  if (!/^[AB]?\d{4,6}$/.test(clean)) {
    return 'Geçersiz TÜRSAB belge formatı. Örnek: A-1234 veya 12345'
  }
  return null
}

// ─── VKN algoritması ─────────────────────────────────────────────────────────
function validateVkn(vkn: string): string | null {
  if (!/^\d{10}$/.test(vkn)) return 'VKN 10 haneli rakamdan oluşmalıdır.'
  const d = vkn.split('').map(Number)
  const v = d.slice(0, 9).map((digit, i) => (digit + 9 - i) % 10)
  const kalan = v.map((vi, i) => {
    const tmp = vi * Math.pow(2, 9 - i)
    const mod = tmp % 9
    return mod === 0 && vi !== 0 ? 9 : mod
  })
  const checksum = kalan.reduce((a, b) => a + b, 0) % 10
  if (checksum !== d[9]) return 'VKN geçersiz (doğrulama hanesi eşleşmiyor).'
  return null
}

// ─── Yardımcı bileşen: Onaylandı rozeti ─────────────────────────────────────
export function AgencyVerifiedBadge({ agencyName }: { agencyName?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
      <ShieldCheck className="h-3.5 w-3.5" />
      {agencyName ? `${agencyName} — Acente Onaylandı` : 'Acente Doğrulandı'}
    </span>
  )
}

// ─── Yardımcı bileşen: Bekliyor rozeti ───────────────────────────────────────
export function AgencyPendingBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
      <Clock className="h-3.5 w-3.5" />
      TÜRSAB Onayı Bekliyor
    </span>
  )
}

// ─── Ana bileşen ─────────────────────────────────────────────────────────────
export function AgencyVerificationWidget({ onVerified, onPending, compact = false }: Props) {
  const [tursabNo, setTursabNo] = useState('')
  const [vkn, setVkn] = useState('')
  const [agencyName, setAgencyName] = useState('')
  const [taxOffice, setTaxOffice] = useState('')
  const [authorizedPerson, setAuthorizedPerson] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [status, setStatus] = useState<VerifyStatus>('idle')
  const [message, setMessage] = useState('')
  const [stored, setStored] = useState<AgencyVerifyState | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(AGENCY_VERIFY_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as AgencyVerifyState
      setStored(parsed)
      setStatus(parsed.status)
      setTursabNo(parsed.tursabNo)
      setVkn(parsed.vkn)
      setAgencyName(parsed.agencyName)
      setTaxOffice(parsed.taxOffice)
      setAuthorizedPerson(parsed.authorizedPerson)
      setPhone(parsed.phone)
      setAddress(parsed.address)
    } catch {
      // ignore
    }
  }, [])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setMessage('')

    // ── TÜRSAB format kontrolü ──
    const tursabErr = validateTursabNo(tursabNo)
    if (tursabErr) { setStatus('invalid'); setMessage(tursabErr); return }

    // ── VKN format kontrolü (zorunlu değil ama girilmişse kontrol et) ──
    if (vkn.trim()) {
      const vknErr = validateVkn(vkn.trim())
      if (vknErr) { setStatus('invalid'); setMessage(vknErr); return }
    }

    if (!agencyName.trim()) {
      setStatus('invalid')
      setMessage('Acente adı zorunludur.')
      return
    }

    setStatus('pending')

    // TÜRSAB için kamuya açık API yoktur; başvuru admin onayına gönderilir
    setTimeout(() => {
      const state: AgencyVerifyState = {
        tursabNo: tursabNo.trim().toUpperCase().replace(/[-\s]/g, ''),
        vkn: vkn.trim(),
        agencyName: agencyName.trim(),
        taxOffice: taxOffice.trim(),
        authorizedPerson: authorizedPerson.trim(),
        phone: phone.trim(),
        address: address.trim(),
        status: 'admin_pending',
        submittedAt: new Date().toISOString(),
      }
      localStorage.setItem(AGENCY_VERIFY_KEY, JSON.stringify(state))
      setStored(state)
      setStatus('admin_pending')
      onPending?.(state)
    }, 600)
  }

  function handleReset() {
    localStorage.removeItem(AGENCY_VERIFY_KEY)
    setStored(null)
    setStatus('idle')
    setMessage('')
    setTursabNo('')
    setVkn('')
    setAgencyName('')
    setTaxOffice('')
    setAuthorizedPerson('')
    setPhone('')
    setAddress('')
  }

  // ── Admin onaylandı ──
  if (status === 'admin_approved') {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div>
            <p className="font-semibold text-emerald-900 dark:text-emerald-100">Acente Doğrulandı</p>
            <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
              TÜRSAB belge no:{' '}
              <span className="font-mono font-bold">{stored?.tursabNo}</span>
            </p>
            {stored?.agencyName && (
              <p className="text-sm text-emerald-600 dark:text-emerald-400">{stored.agencyName}</p>
            )}
            {stored?.adminNote && (
              <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 border-t border-emerald-200 pt-2">
                Admin notu: {stored.adminNote}
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Admin incelemesi bekliyor ──
  if (status === 'admin_pending') {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/40 dark:bg-amber-950/20">
        <div className="flex items-start gap-3">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="flex-1">
            <p className="font-semibold text-amber-900 dark:text-amber-100">TÜRSAB Onayı Bekliyor</p>
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
              Başvurunuz alındı. Admin ekibimiz TÜRSAB kayıtlarını doğrulayarak en kısa sürede size bilgi verecektir.
            </p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-amber-700 dark:text-amber-400">
              <span>TÜRSAB: {stored?.tursabNo}</span>
              {stored?.vkn && <span>VKN: {stored.vkn}</span>}
              {stored?.agencyName && <span>{stored.agencyName}</span>}
            </div>
            <p className="mt-2 text-xs text-amber-500">
              Başvuru tarihi: {stored?.submittedAt ? new Date(stored.submittedAt).toLocaleString('tr-TR') : '—'}
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="mt-3 text-xs font-medium text-amber-700 underline dark:text-amber-300"
            >
              Bilgileri düzenle ve yeniden gönder
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Admin reddetti ──
  if (status === 'admin_rejected') {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900/40 dark:bg-red-950/20">
        <div className="flex items-start gap-3">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
          <div className="flex-1">
            <p className="font-semibold text-red-900 dark:text-red-100">Başvuru Reddedildi</p>
            {stored?.adminNote && (
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">Gerekçe: {stored.adminNote}</p>
            )}
            <p className="mt-2 text-xs text-red-500">
              Bilgilerinizi güncelleyerek yeniden başvurabilirsiniz.
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="mt-3 text-xs font-medium text-red-700 underline dark:text-red-300"
            >
              Yeniden Başvur
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Form ──
  return (
    <div className={compact ? '' : 'rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900/40'}>
      <div className="mb-4 flex items-center gap-2">
        <Briefcase className="h-5 w-5 text-primary-600 dark:text-primary-400" />
        <h3 className="font-semibold text-neutral-900 dark:text-white">Acente TÜRSAB Doğrulaması</h3>
      </div>

      {!compact && (
        <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/30 dark:bg-blue-950/20">
          <div className="flex gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
            <div className="text-xs text-blue-700 dark:text-blue-300">
              <p className="font-semibold mb-1">TÜRSAB Belgesi Nedir?</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Türkiye Seyahat Acentaları Birliği tarafından verilen zorunlu yetki belgesi</li>
                <li>A Grubu: Yurt içi + yurt dışı tur düzenleyebilir</li>
                <li>B Grubu: Yalnızca yurt içi tur düzenleyebilir</li>
                <li>Belge numaranız TÜRSAB üyelik kartınızda veya belgenizde yazmaktadır</li>
                <li>Onay 1–3 iş günü sürebilir; fiziksel belge talep edilebilir</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {/* TÜRSAB Belge No */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            TÜRSAB Belge Numarası <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={tursabNo}
              onChange={(e) => setTursabNo(e.target.value.toUpperCase())}
              placeholder="A-1234 veya B12345"
              maxLength={10}
              required
              className="flex-1 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 font-mono text-sm uppercase tracking-widest text-neutral-900 shadow-sm placeholder:normal-case placeholder:tracking-normal placeholder:text-neutral-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            />
          </div>
          <p className="mt-1 text-xs text-neutral-400">
            Örnek: A-1234, B-5678 veya 12345 — TÜRSAB A veya B grubu belge numarası
          </p>
        </div>

        {/* VKN */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Vergi Kimlik Numarası (VKN)
          </label>
          <input
            type="text"
            inputMode="numeric"
            pattern="\d{10}"
            maxLength={10}
            value={vkn}
            onChange={(e) => setVkn(e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="0000000000"
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 font-mono text-sm tracking-widest text-neutral-900 shadow-sm placeholder:tracking-normal placeholder:text-neutral-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
          <p className="mt-1 text-xs text-neutral-400">
            10 haneli vergi kimlik numaranız (opsiyonel, ancak faturalama için gereklidir)
          </p>
        </div>

        {/* Acente adı */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Acente / Şirket Adı <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={agencyName}
            onChange={(e) => setAgencyName(e.target.value)}
            placeholder="ABC Seyahat Acentası"
            required
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </div>

        {/* İki kolonlu alanlar */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Vergi Dairesi
            </label>
            <input
              type="text"
              value={taxOffice}
              onChange={(e) => setTaxOffice(e.target.value)}
              placeholder="Ör: Beyoğlu Vergi Dairesi"
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Yetkili Kişi
            </label>
            <input
              type="text"
              value={authorizedPerson}
              onChange={(e) => setAuthorizedPerson(e.target.value)}
              placeholder="Ad Soyad"
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Telefon
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+90 212 000 00 00"
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Adres
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="İl, İlçe"
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            />
          </div>
        </div>

        {/* Belge yükleme notu */}
        <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/60 p-3 dark:border-neutral-700 dark:bg-neutral-800/30">
          <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
            <FileText className="h-4 w-4" />
            <span>
              <span className="font-medium text-neutral-600 dark:text-neutral-300">Destekleyici belgeler:</span>{' '}
              TÜRSAB belgesinin fotoğrafı veya taraması; admin onay sürecinde talep edilebilir.
            </span>
          </div>
        </div>

        {/* Hata mesajı */}
        {(status === 'invalid' || status === 'error') && message && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={status === 'pending'}
          className="w-full rounded-2xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === 'pending' ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Gönderiliyor…
            </span>
          ) : (
            'TÜRSAB Başvurusu Gönder →'
          )}
        </button>
      </form>

      <p className="mt-3 text-center text-xs text-neutral-400">
        Başvurunuz admin ekibimiz tarafından incelenir. Onay sonrası acente portal özellikleri aktif olur.
      </p>
    </div>
  )
}
