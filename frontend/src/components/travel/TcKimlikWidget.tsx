'use client'

import { AlertCircle, BadgeCheck, CheckCircle2, Clock, Info, Loader2, ShieldAlert } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { submitTcVerificationRequest, type AuthUser } from '@/lib/travel-api'

const LEGACY_TC_KEY = 'tc_kimlik_verified'

export type TcVerificationStatus =
  | 'idle'
  | 'submitting'
  | 'verified'
  | 'pending_review'
  | 'reapply'
  | 'error'

type MeIdentity = Pick<
  AuthUser,
  | 'identity_verified_at'
  | 'tc_verification_pending'
  | 'tc_verification_pending_since'
  | 'tc_verification_rejection_note'
>

interface Props {
  /** Oturum JWT — başvuru POST için */
  token: string | null
  /** `/api/auth/me` yanıtı (kimlik / başvuru özeti) */
  me: MeIdentity | null
  /** Başvuru sonrası profili yenile */
  onRefreshMe: () => Promise<void>
  /** Yerleşik (kart olmadan) görünüm */
  compact?: boolean
  /** Doğrulama tamamlandığında (identity_verified_at set) */
  onVerified?: () => void
}

function maskTc(value: string) {
  return value.replace(/\D/g, '').slice(0, 11)
}

function validateTcFormat(tc: string): string | null {
  if (!/^\d{11}$/.test(tc)) return 'TC Kimlik No 11 haneli rakamdan oluşmalıdır.'
  if (tc[0] === '0') return 'TC Kimlik No 0 ile başlayamaz.'
  const d = tc.split('').map(Number)
  const oddSum = d[0] + d[2] + d[4] + d[6] + d[8]
  const evenSum = d[1] + d[3] + d[5] + d[7]
  const d9 = (7 * oddSum - evenSum) % 10
  if (d9 !== d[9]) return 'TC Kimlik No geçersiz (matematiksel doğrulama başarısız).'
  const sum10 = d.slice(0, 10).reduce((a, b) => a + b, 0)
  if (sum10 % 10 !== d[10]) return 'TC Kimlik No geçersiz (son hane kontrolü başarısız).'
  return null
}

export function TcKimlikWidget({
  token,
  me,
  onRefreshMe,
  compact = false,
  onVerified,
}: Props) {
  const [tcNo, setTcNo] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [localSubmitting, setLocalSubmitting] = useState(false)

  const serverVerified = Boolean(me?.identity_verified_at)
  const serverPending = Boolean(me?.tc_verification_pending)
  const rejectionNote = me?.tc_verification_rejection_note?.trim() || null

  useEffect(() => {
    try {
      if (localStorage.getItem(LEGACY_TC_KEY)) {
        localStorage.removeItem(LEGACY_TC_KEY)
      }
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    if (serverVerified) onVerified?.()
  }, [serverVerified, onVerified])

  const status: TcVerificationStatus = useMemo(() => {
    if (localSubmitting) return 'submitting'
    if (serverVerified) return 'verified'
    if (serverPending) return 'pending_review'
    if (rejectionNote) return 'reapply'
    return 'idle'
  }, [localSubmitting, serverVerified, serverPending, rejectionNote])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)

    if (!token) {
      setMessage('Oturum gerekli. Lütfen yeniden giriş yapın.')
      return
    }

    const fmt = validateTcFormat(tcNo)
    if (fmt) {
      setMessage(fmt)
      return
    }
    if (!firstName.trim() || !lastName.trim()) {
      setMessage('Ad ve soyad zorunludur.')
      return
    }
    const year = Number(birthYear)
    const yMax = new Date().getFullYear() - 1
    if (!year || year < 1900 || year > yMax) {
      setMessage('Geçerli bir doğum yılı girin.')
      return
    }

    setLocalSubmitting(true)
    try {
      await submitTcVerificationRequest(token, {
        tc_kimlik_no: tcNo,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        birth_year: year,
      })
      await onRefreshMe()
      setTcNo('')
      setFirstName('')
      setLastName('')
      setBirthYear('')
    } catch (err) {
      const code = err instanceof Error ? err.message : 'unknown'
      if (code === 'already_verified') {
        await onRefreshMe()
        setMessage(null)
      } else if (code === 'invalid_tc') {
        setMessage('TC Kimlik No geçersiz (kurallara uygun 11 hane kontrol edin).')
      } else {
        setMessage(
          code === 'invalid_name'
            ? 'Ad ve soyad boş olamaz.'
            : 'Başvuru gönderilemedi. Bir süre sonra tekrar deneyin.',
        )
      }
    } finally {
      setLocalSubmitting(false)
    }
  }

  function handleClearForm() {
    setTcNo('')
    setFirstName('')
    setLastName('')
    setBirthYear('')
    setMessage(null)
  }

  if (status === 'verified') {
    return (
      <div
        className={
          compact
            ? ''
            : 'rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/40 dark:bg-emerald-950/20'
        }
      >
        <div className="flex items-start gap-3">
          <BadgeCheck className="h-6 w-6 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div className="flex-1">
            <p className="font-semibold text-emerald-800 dark:text-emerald-300">
              Kimlik doğrulandı
            </p>
            <p className="mt-0.5 text-sm text-emerald-700 dark:text-emerald-400">
              TC kimlik bilgileriniz yönetici onayıyla kayda alındı. Profilinizde güvenilir üye
              durumunuz görünür.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'pending_review') {
    const since = me?.tc_verification_pending_since
    return (
      <div
        className={
          compact
            ? ''
            : 'rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/40 dark:bg-amber-950/20'
        }
      >
        <div className="flex items-start gap-3">
          <Clock className="h-6 w-6 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="flex-1">
            <p className="font-semibold text-amber-900 dark:text-amber-200">Başvurunuz sırada</p>
            <p className="mt-0.5 text-sm text-amber-800 dark:text-amber-300">
              Bilgileriniz yönetici incelemesine gönderildi. Onay veya ret sonucu hesabınıza
              yansıyacaktır.
              {since ? (
                <span className="mt-1 block text-xs opacity-80">
                  Gönderim: {new Date(since).toLocaleString('tr-TR')}
                </span>
              ) : null}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={
        compact
          ? ''
          : 'rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900'
      }
    >
      <div className="mb-4 flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-primary-600 dark:text-primary-400" />
        <div>
          <p className="font-semibold text-neutral-900 dark:text-neutral-100">
            TC kimlik doğrulama (yönetici onayı)
          </p>
          <p className="mt-0.5 text-sm text-neutral-500">
            Nüfus ve Vatandaşlık İşleri Genel Müdürlüğü’nün herkese açık doğrulama servisi artık bu
            tür bağlantılara izin vermediği için kimlik kontrolü yönetici onayıyla yapılır. Başvurunuzda
            yer alan ad, soyad, doğum yılı ve TC kimlik numarası nüfus kaydınızla uyumlu olmalıdır.
          </p>
        </div>
      </div>

      <div className="mb-4 flex items-start gap-2 rounded-xl bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:bg-blue-950/25 dark:text-blue-200">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          <strong>Veri kullanımı.</strong> Başvuru sırasında ilettiğiniz bilgiler veritabanında
          saklanır; onaylandığında hesabınıza işlenir. Nevi / KPS üzerinden otomatik sorgu
          yapılmaz.
        </span>
      </div>

      {rejectionNote ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/25 dark:text-red-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Son başvurunuz reddedildi</p>
            <p className="mt-1 whitespace-pre-wrap">{rejectionNote}</p>
            <p className="mt-2 text-xs opacity-90">
              Bilgilerinizi düzelterek aşağıdan yeni başvuru gönderebilirsiniz.
            </p>
          </div>
        </div>
      ) : null}

      {message ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {message}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
            TC Kimlik No
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={tcNo}
            onChange={(e) => setTcNo(maskTc(e.target.value))}
            placeholder="00000000000"
            maxLength={11}
            required
            disabled={serverPending}
            className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 font-mono text-sm tracking-wider focus:border-primary-500 focus:outline-none disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
          {tcNo.length > 0 && tcNo.length < 11 ? (
            <p className="mt-0.5 text-[11px] text-neutral-400">{tcNo.length}/11 hane</p>
          ) : null}
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
            Ad (nüfus kaydındaki gibi)
          </label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="MEHMET"
            required
            disabled={serverPending}
            className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm uppercase tracking-wide focus:border-primary-500 focus:outline-none disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
            Soyad
          </label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="YILMAZ"
            required
            disabled={serverPending}
            className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm uppercase tracking-wide focus:border-primary-500 focus:outline-none disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </div>

        <div className="sm:col-span-2 sm:max-w-[160px]">
          <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
            Doğum yılı
          </label>
          <input
            type="number"
            value={birthYear}
            onChange={(e) => setBirthYear(e.target.value)}
            placeholder="1985"
            min={1900}
            max={new Date().getFullYear() - 1}
            required
            disabled={serverPending}
            className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
          <button
            type="submit"
            disabled={localSubmitting || serverPending || !token}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60"
          >
            {localSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Gönderiliyor…
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Başvuruyu gönder
              </>
            )}
          </button>
          {(rejectionNote || tcNo || firstName || lastName || birthYear) && !serverPending ? (
            <button
              type="button"
              onClick={handleClearForm}
              className="text-sm font-medium text-neutral-500 underline hover:text-neutral-700 dark:text-neutral-400"
            >
              Formu temizle
            </button>
          ) : null}
        </div>
      </form>

      <p className="mt-3 text-[11px] text-neutral-400">
        Başvurunuz KVKK kapsamında yalnızca kimlik teyidi amacıyla işlenir; ret / onay sürecinde
        yöneticiler kayıtları görüntüleyebilir.
      </p>
    </div>
  )
}

export function TcVerifiedBadge({ tcNo }: { tcNo?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
      <BadgeCheck className="h-3 w-3" />
      TC doğrulandı
      {tcNo ? (
        <span className="font-mono opacity-70">
          {tcNo.slice(0, 3)}***{tcNo.slice(-2)}
        </span>
      ) : null}
    </span>
  )
}
