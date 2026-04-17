'use client'

import { AlertCircle, BadgeCheck, CheckCircle2, Info, Loader2, ShieldAlert } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const TC_VERIFIED_KEY = 'tc_kimlik_verified'

export type TcVerificationStatus =
  | 'idle'
  | 'pending'
  | 'verified'
  | 'failed'
  | 'service_unavailable'
  | 'error'

interface Props {
  /** Dışarıdan başlangıç durumu belirtmek için */
  initialStatus?: TcVerificationStatus
  /** Doğrulama tamamlandığında çağrılır */
  onVerified?: (tcNo: string) => void
  /** Yerleşik (kart olmadan) görünüm */
  compact?: boolean
}

// TC No maskesi: sadece rakam, 11 karakter
function maskTc(value: string) {
  return value.replace(/\D/g, '').slice(0, 11)
}

export function TcKimlikWidget({ initialStatus, onVerified, compact = false }: Props) {
  const [status, setStatus] = useState<TcVerificationStatus>(initialStatus ?? 'idle')
  const [tcNo, setTcNo] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [verifiedTc, setVerifiedTc] = useState<string | null>(null)
  const alreadyChecked = useRef(false)

  // localStorage'dan önceki doğrulamayı yükle
  useEffect(() => {
    if (alreadyChecked.current) return
    alreadyChecked.current = true
    try {
      const saved = localStorage.getItem(TC_VERIFIED_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as { tcNo: string; verifiedAt: string }
        setVerifiedTc(parsed.tcNo)
        setStatus('verified')
      }
    } catch {/* ignore */}
  }, [])

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)

    if (tcNo.length !== 11) {
      setMessage('TC Kimlik No 11 haneli olmalıdır.')
      return
    }
    if (!firstName.trim() || !lastName.trim()) {
      setMessage('Ad ve soyad zorunludur.')
      return
    }
    const year = Number(birthYear)
    if (!year || year < 1900 || year > new Date().getFullYear() - 1) {
      setMessage('Geçerli bir doğum yılı girin.')
      return
    }

    setStatus('pending')
    try {
      const res = await fetch('/api/verify-tc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tc_no: tcNo,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          birth_year: year,
        }),
      })
      const data = await res.json() as {
        verified: boolean
        error?: string
        service_unavailable?: boolean
      }

      if (data.verified) {
        setStatus('verified')
        setVerifiedTc(tcNo)
        localStorage.setItem(
          TC_VERIFIED_KEY,
          JSON.stringify({ tcNo, verifiedAt: new Date().toISOString() }),
        )
        onVerified?.(tcNo)
      } else if (data.service_unavailable) {
        setStatus('service_unavailable')
        setMessage(data.error ?? 'Nüfus Müdürlüğü servisine ulaşılamadı.')
      } else {
        setStatus('failed')
        setMessage(
          data.error ?? 'Kimlik doğrulanamadı. Bilgilerin nüfus cüzdanınızla tam eşleştiğinden emin olun.',
        )
      }
    } catch {
      setStatus('error')
      setMessage('Bağlantı hatası. İnternet bağlantınızı kontrol edin.')
    }
  }

  function handleReset() {
    setStatus('idle')
    setTcNo('')
    setFirstName('')
    setLastName('')
    setBirthYear('')
    setMessage(null)
    setVerifiedTc(null)
    localStorage.removeItem(TC_VERIFIED_KEY)
  }

  // ── Doğrulanmış durumu ────────────────────────────────────────────────────
  if (status === 'verified') {
    return (
      <div className={compact ? '' : 'rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/40 dark:bg-emerald-950/20'}>
        <div className="flex items-start gap-3">
          <BadgeCheck className="h-6 w-6 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div className="flex-1">
            <p className="font-semibold text-emerald-800 dark:text-emerald-300">
              TC Kimlik Doğrulandı
            </p>
            <p className="mt-0.5 text-sm text-emerald-700 dark:text-emerald-400">
              Nüfus Müdürlüğü kaydınız başarıyla doğrulandı.
              {verifiedTc ? (
                <span className="ml-2 font-mono text-xs opacity-70">
                  {verifiedTc.slice(0, 4)}***{verifiedTc.slice(-2)}
                </span>
              ) : null}
            </p>
          </div>
          <button
            onClick={handleReset}
            className="text-xs text-emerald-600 underline hover:text-emerald-800 dark:text-emerald-400"
          >
            Değiştir
          </button>
        </div>
      </div>
    )
  }

  // ── Servis erişilemez ─────────────────────────────────────────────────────
  if (status === 'service_unavailable') {
    return (
      <div className={compact ? '' : 'rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/40 dark:bg-amber-950/20'}>
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="font-semibold text-amber-800 dark:text-amber-300">Servis Geçici Olarak Kullanılamıyor</p>
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">{message}</p>
            <button
              onClick={() => setStatus('idle')}
              className="mt-2 text-sm font-medium text-amber-700 underline dark:text-amber-400"
            >
              Tekrar dene
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <div className={compact ? '' : 'rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900'}>
      <div className="mb-4 flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-primary-600 dark:text-primary-400" />
        <div>
          <p className="font-semibold text-neutral-900 dark:text-neutral-100">
            TC Kimlik Doğrulama
          </p>
          <p className="mt-0.5 text-sm text-neutral-500">
            TC vatandaşıysanız nüfus kaydınızı doğrulayarak güvenilir üye rozeti alın.
            Bilgileriniz T.C. Nüfus ve Vatandaşlık İşleri Genel Müdürlüğü sistemiyle anlık karşılaştırılır,
            depolanmaz.
          </p>
        </div>
      </div>

      {/* Mavi bilgi notu */}
      <div className="mb-4 flex items-start gap-2 rounded-xl bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-950/20 dark:text-blue-300">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          <strong>Neden gerekli?</strong> Doğrulama yapan üyeler daha güvenilir görünür ve bazı özelliklere
          öncelikli erişim sağlar. TC No'nuz hiçbir şekilde sistemimizde kaydedilmez.
        </span>
      </div>

      {status === 'failed' && message && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {message}
        </div>
      )}

      <form onSubmit={handleVerify} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* TC Kimlik No */}
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
            className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 font-mono text-sm tracking-wider focus:border-primary-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
          {tcNo.length > 0 && tcNo.length < 11 && (
            <p className="mt-0.5 text-[11px] text-neutral-400">{tcNo.length}/11 hane</p>
          )}
        </div>

        {/* Ad */}
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
            className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm uppercase tracking-wide focus:border-primary-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </div>

        {/* Soyad */}
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
            className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm uppercase tracking-wide focus:border-primary-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </div>

        {/* Doğum Yılı */}
        <div className="sm:col-span-2 sm:max-w-[160px]">
          <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
            Doğum Yılı
          </label>
          <input
            type="number"
            value={birthYear}
            onChange={(e) => setBirthYear(e.target.value)}
            placeholder="1985"
            min={1900}
            max={new Date().getFullYear() - 1}
            required
            className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </div>

        {/* Submit */}
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={status === 'pending'}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60 sm:w-auto"
          >
            {status === 'pending' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Nüfus Müdürlüğü ile doğrulanıyor…
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Kimliğimi Doğrula
              </>
            )}
          </button>
        </div>
      </form>

      <p className="mt-3 text-[11px] text-neutral-400">
        🔒 Verileriniz şifreli iletilir. TC Kimlik No'nuz yalnızca doğrulama amacıyla T.C.
        Nüfus ve Vatandaşlık İşleri Genel Müdürlüğü'ne iletilir ve tarafımızca saklanmaz.
      </p>
    </div>
  )
}

// ─── Compact rozet bileşeni ───────────────────────────────────────────────────
export function TcVerifiedBadge({ tcNo }: { tcNo?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
      <BadgeCheck className="h-3 w-3" />
      TC Doğrulandı
      {tcNo ? <span className="font-mono opacity-70">{tcNo.slice(0, 3)}***{tcNo.slice(-2)}</span> : null}
    </span>
  )
}
