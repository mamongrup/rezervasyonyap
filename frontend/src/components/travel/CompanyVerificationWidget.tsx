'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { Building2, CheckCircle2, XCircle, AlertTriangle, Loader2, ShieldCheck, Clock, UploadCloud } from 'lucide-react'

// ─── localStorage anahtarı ────────────────────────────────────────────────────
const COMPANY_VERIFY_KEY = 'company_verify_state'

// ─── Tipler ───────────────────────────────────────────────────────────────────
type VerifyStatus =
  | 'idle'
  | 'pending'
  | 'vkn_valid'          // Sadece format/algoritma geçti, GİB sonucu beklenmiyor
  | 'gib_found'          // GİB'de kayıtlı mükellefiyet bulundu
  | 'gib_not_found'      // GİB'de bulunamadı ama VKN format geçerli
  | 'admin_pending'      // Admin incelemesi bekliyor
  | 'admin_approved'     // Admin onayladı
  | 'admin_rejected'     // Admin reddetti
  | 'invalid'
  | 'error'

interface StoredVerifyState {
  vkn: string
  companyName: string
  taxOffice: string
  status: VerifyStatus
  gibTitle?: string
  gibTaxOffice?: string
  submittedAt: string
  adminNote?: string
}

interface VerifyApiResponse {
  valid: boolean
  vkn?: string
  gib_queried?: boolean
  gib_found?: boolean
  gib_title?: string | null
  gib_tax_office?: string | null
  gib_error?: string | null
  name_matches?: boolean | null
  error?: string
}

interface Props {
  onVerified?: (state: StoredVerifyState) => void
  compact?: boolean
  initialStatus?: VerifyStatus
}

// ─── Yardımcı bileşenler ─────────────────────────────────────────────────────
export function CompanyVerifiedBadge({ companyName }: { companyName?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
      <ShieldCheck className="h-3.5 w-3.5" />
      {companyName ? `${companyName} — Doğrulandı` : 'Firma Doğrulandı'}
    </span>
  )
}

export function CompanyPendingBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
      <Clock className="h-3.5 w-3.5" />
      İnceleme Bekliyor
    </span>
  )
}

// ─── Ana bileşen ─────────────────────────────────────────────────────────────
export function CompanyVerificationWidget({ onVerified, compact = false, initialStatus }: Props) {
  const [vkn, setVkn] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [taxOffice, setTaxOffice] = useState('')
  const [status, setStatus] = useState<VerifyStatus>(initialStatus ?? 'idle')
  const [message, setMessage] = useState('')
  const [stored, setStored] = useState<StoredVerifyState | null>(null)
  const [skipGib, setSkipGib] = useState(false)

  // Önceki doğrulama durumunu yükle
  useEffect(() => {
    try {
      const raw = localStorage.getItem(COMPANY_VERIFY_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as StoredVerifyState
      setStored(parsed)
      setStatus(parsed.status)
      setVkn(parsed.vkn)
      setCompanyName(parsed.companyName)
      setTaxOffice(parsed.taxOffice)
    } catch {
      // ignore
    }
  }, [])

  async function handleVerify(e: FormEvent) {
    e.preventDefault()

    const cleanVkn = vkn.trim().replace(/\s/g, '')
    if (!cleanVkn) {
      setMessage('VKN boş olamaz.')
      setStatus('invalid')
      return
    }
    if (!/^\d{10}$/.test(cleanVkn)) {
      setMessage('VKN 10 haneli rakamdan oluşmalıdır.')
      setStatus('invalid')
      return
    }
    if (!companyName.trim()) {
      setMessage('Firma adı zorunludur.')
      setStatus('invalid')
      return
    }

    setStatus('pending')
    setMessage('')

    try {
      const res = await fetch('/api/verify-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vkn: cleanVkn,
          company_name: companyName.trim(),
          tax_office: taxOffice.trim(),
          skip_gib: skipGib,
        }),
      })

      const data = (await res.json()) as VerifyApiResponse

      if (!data.valid) {
        setStatus('invalid')
        setMessage(data.error ?? 'VKN doğrulanamadı.')
        return
      }

      // VKN geçerli — GİB sonucuna göre durumu belirle
      let newStatus: VerifyStatus = 'vkn_valid'
      let msg = ''

      if (data.gib_queried) {
        if (data.gib_found) {
          newStatus = 'gib_found'
          msg = `VKN geçerli ve GİB kayıtlarında bulundu.${data.gib_title ? ` Unvan: ${data.gib_title}` : ''}${data.gib_tax_office ? ` — Vergi dairesi: ${data.gib_tax_office}` : ''}`
        } else {
          newStatus = 'gib_not_found'
          msg = data.gib_error
            ? `VKN formatı geçerli ancak GİB servisine ulaşılamadı: ${data.gib_error}`
            : 'VKN formatı geçerli. GİB kayıtlarında kaydınız bulunamadı — bilgileriniz admin onayına gönderildi.'
        }
      } else {
        newStatus = 'vkn_valid'
        msg = 'VKN algoritması geçerli. Bilgileriniz admin onayına gönderildi.'
      }

      // Admin incelemesine yönlendir
      const finalStatus: VerifyStatus =
        newStatus === 'gib_found' ? 'gib_found' : 'admin_pending'

      const state: StoredVerifyState = {
        vkn: cleanVkn,
        companyName: companyName.trim(),
        taxOffice: taxOffice.trim(),
        status: finalStatus,
        gibTitle: data.gib_title ?? undefined,
        gibTaxOffice: data.gib_tax_office ?? undefined,
        submittedAt: new Date().toISOString(),
      }

      localStorage.setItem(COMPANY_VERIFY_KEY, JSON.stringify(state))
      setStored(state)
      setStatus(finalStatus)
      setMessage(msg)
      onVerified?.(state)
    } catch {
      setStatus('error')
      setMessage('Bağlantı hatası. Lütfen tekrar deneyin.')
    }
  }

  function handleReset() {
    localStorage.removeItem(COMPANY_VERIFY_KEY)
    setStored(null)
    setStatus('idle')
    setMessage('')
    setVkn('')
    setCompanyName('')
    setTaxOffice('')
  }

  // ── Admin onaylandı ──
  if (status === 'admin_approved') {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div>
            <p className="font-semibold text-emerald-900 dark:text-emerald-100">Firma Doğrulandı</p>
            {stored?.companyName && (
              <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">{stored.companyName}</p>
            )}
            {stored?.adminNote && (
              <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">Not: {stored.adminNote}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── GİB'de bulundu ──
  if (status === 'gib_found') {
    return (
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900/40 dark:bg-blue-950/20">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
          <div className="flex-1">
            <p className="font-semibold text-blue-900 dark:text-blue-100">GİB Doğrulaması Tamamlandı</p>
            {stored?.gibTitle && (
              <p className="mt-1 text-sm text-blue-800 dark:text-blue-200">
                <span className="text-blue-500">Unvan:</span> {stored.gibTitle}
              </p>
            )}
            {stored?.gibTaxOffice && (
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <span className="text-blue-500">Vergi dairesi:</span> {stored.gibTaxOffice}
              </p>
            )}
            <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">
              VKN: <span className="font-mono">{stored?.vkn}</span> — Bilgileriniz admin onayına iletildi.
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="mt-3 text-xs font-medium text-blue-600 underline dark:text-blue-400"
            >
              Farklı firma ile tekrar dene
            </button>
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
            <p className="font-semibold text-amber-900 dark:text-amber-100">İnceleme Bekliyor</p>
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
              Firma bilgileriniz iletildi. Admin ekibimiz en kısa sürede inceler ve size bildiri gönderir.
            </p>
            {stored?.companyName && (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 font-mono">
                {stored.companyName} — VKN: {stored.vkn}
              </p>
            )}
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
            <p className="font-semibold text-red-900 dark:text-red-100">Doğrulama Reddedildi</p>
            {stored?.adminNote && (
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">Neden: {stored.adminNote}</p>
            )}
            <p className="mt-2 text-xs text-red-500 dark:text-red-400">
              Bilgilerinizi güncelleyerek tekrar başvurabilirsiniz.
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="mt-3 text-xs font-medium text-red-700 underline dark:text-red-300"
            >
              Tekrar başvur
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
        <Building2 className="h-5 w-5 text-primary-600 dark:text-primary-400" />
        <h3 className="font-semibold text-neutral-900 dark:text-white">Firma Doğrulama</h3>
      </div>

      {/* Bilgi kutusu */}
      {!compact && (
        <div className="mb-4 rounded-xl border border-neutral-100 bg-neutral-50 p-4 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-400">
          <p className="font-medium text-neutral-700 dark:text-neutral-300 mb-1">Neden gerekli?</p>
          <ul className="list-disc list-inside space-y-0.5 text-xs">
            <li>Tedarikçi hesapları için yasal zorunluluk</li>
            <li>VKN, GİB (Gelir İdaresi Başkanlığı) kayıtlarıyla kontrol edilir</li>
            <li>Komisyon faturalaması için gereklidir</li>
            <li>Doğrulama 1–2 iş günü sürebilir</li>
          </ul>
        </div>
      )}

      <form onSubmit={(e) => void handleVerify(e)} className="space-y-4">
        {/* VKN */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Vergi Kimlik Numarası (VKN) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            inputMode="numeric"
            pattern="\d{10}"
            maxLength={10}
            value={vkn}
            onChange={(e) => setVkn(e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="0000000000"
            required
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 font-mono text-sm tracking-widest text-neutral-900 shadow-sm placeholder:tracking-normal placeholder:text-neutral-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
          <p className="mt-1 text-xs text-neutral-400">10 haneli vergi numaranız</p>
        </div>

        {/* Firma adı */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Firma / Şirket Adı <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="ABC Turizm A.Ş."
            required
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </div>

        {/* Vergi dairesi */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Vergi Dairesi
          </label>
          <input
            type="text"
            value={taxOffice}
            onChange={(e) => setTaxOffice(e.target.value)}
            placeholder="Ör: Fethiye Vergi Dairesi"
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </div>

        {/* Evrak yükleme notu */}
        <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/60 p-3 dark:border-neutral-700 dark:bg-neutral-800/30">
          <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
            <UploadCloud className="h-4 w-4" />
            <span>
              <span className="font-medium text-neutral-600 dark:text-neutral-300">Destekleyici belgeler:</span>{' '}
              Vergi levhası, imza sirküleri veya ticaret sicil belgesi; onay aşamasında admin sizden talep edebilir.
            </span>
          </div>
        </div>

        {/* GİB sorgusu atla seçeneği */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            className="h-4 w-4 rounded accent-primary-600"
            checked={skipGib}
            onChange={(e) => setSkipGib(e.target.checked)}
          />
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            GİB sorgusu yapma, sadece VKN formatını doğrula (yavaş bağlantı için)
          </span>
        </label>

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
              Doğrulanıyor…
            </span>
          ) : (
            'Firmayı Doğrula ve Başvur →'
          )}
        </button>
      </form>

      <p className="mt-3 text-center text-xs text-neutral-400">
        Bilgileriniz yalnızca doğrulama amacıyla kullanılır ve korunur.
      </p>
    </div>
  )
}
