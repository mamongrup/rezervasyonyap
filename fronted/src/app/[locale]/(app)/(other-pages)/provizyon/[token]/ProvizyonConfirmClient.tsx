'use client'

import React from 'react'
import {
  getProvizyonByToken,
  supplierConfirmReservation,
  supplierCancelReservation,
  type ProvizyonReservation,
  type PaymentSchedule,
} from '@/lib/travel-api'
import PaymentScheduleCard from '@/components/checkout/PaymentScheduleCard'

interface Props {
  token: string
}

function CountdownTimer({ deadline }: { deadline: string }) {
  const [remaining, setRemaining] = React.useState('')

  React.useEffect(() => {
    const calc = () => {
      const diff = new Date(deadline).getTime() - Date.now()
      if (diff <= 0) {
        setRemaining('Süre doldu')
        return
      }
      const h = Math.floor(diff / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      const s = Math.floor((diff % 60_000) / 1000)
      setRemaining(`${h > 0 ? `${h} sa ` : ''}${m} dk ${s} sn`)
    }
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [deadline])

  const isUrgent = new Date(deadline).getTime() - Date.now() < 30 * 60_000

  return (
    <div
      className={[
        'flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold',
        isUrgent
          ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
          : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
      ].join(' ')}
    >
      <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>Onay için kalan süre: <strong>{remaining}</strong></span>
    </div>
  )
}

type State = 'loading' | 'ready' | 'confirmed' | 'cancelled' | 'error' | 'expired'

export default function ProvizyonConfirmClient({ token }: Props) {
  const [state, setState] = React.useState<State>('loading')
  const [reservation, setReservation] = React.useState<ProvizyonReservation | null>(null)
  const [schedule, setSchedule] = React.useState<PaymentSchedule | null>(null)
  const [cancelNote, setCancelNote] = React.useState('')
  const [showCancelForm, setShowCancelForm] = React.useState(false)
  const [actionPending, setActionPending] = React.useState(false)
  const [message, setMessage] = React.useState('')

  React.useEffect(() => {
    if (!token) { setState('error'); return }
    getProvizyonByToken(token)
      .then((data) => {
        const res = data.reservation
        setReservation(res)
        // Parse payment_schedule_json
        if (res.payment_schedule_json && res.payment_schedule_json !== '{}') {
          try {
            setSchedule(JSON.parse(res.payment_schedule_json) as PaymentSchedule)
          } catch {
            // ignore parse error
          }
        }
        // Deadline geçmişse
        if (res.supplier_confirm_deadline && new Date(res.supplier_confirm_deadline) < new Date()) {
          setState('expired')
        } else if (res.payment_status === 'supplier_notified') {
          setState('confirmed')
        } else if (res.payment_status === 'disputed' || res.payment_status === 'refunded') {
          setState('cancelled')
        } else {
          setState('ready')
        }
      })
      .catch(() => setState('error'))
  }, [token])

  const handleConfirm = async () => {
    if (!window.confirm('Rezervasyonu onaylamak istediğinizden emin misiniz?')) return
    setActionPending(true)
    try {
      const res = await supplierConfirmReservation(token)
      setMessage(res.message)
      setState('confirmed')
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Onaylama başarısız')
    } finally {
      setActionPending(false)
    }
  }

  const handleCancel = async () => {
    if (!window.confirm('Rezervasyonu reddetmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) return
    setActionPending(true)
    try {
      const res = await supplierCancelReservation(token, cancelNote)
      setMessage(res.message)
      setState('cancelled')
      setShowCancelForm(false)
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Reddetme başarısız')
    } finally {
      setActionPending(false)
    }
  }

  if (state === 'loading') {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <div className="mb-4 flex justify-center">
          <svg className="h-16 w-16 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-neutral-800 dark:text-white">Bağlantı bulunamadı</h1>
        <p className="mt-2 text-neutral-500">Bu onay bağlantısı geçersiz veya süresi dolmuş olabilir.</p>
      </div>
    )
  }

  if (state === 'expired') {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <div className="mb-4 flex justify-center">
          <svg className="h-16 w-16 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-neutral-800 dark:text-white">Onay süresi doldu</h1>
        <p className="mt-2 text-neutral-500">
          Bu rezervasyon için onay süresi geçti. Müşteri temsilcimiz devreye girmiştir.
        </p>
      </div>
    )
  }

  if (state === 'confirmed') {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <div className="mb-4 flex justify-center">
          <svg className="h-16 w-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-neutral-800 dark:text-white">Rezervasyon Onaylandı!</h1>
        <p className="mt-2 text-neutral-500">
          {message || 'Rezervasyonu başarıyla onayladınız. Müşteriye bildirim gönderildi.'}
        </p>
        {reservation && (
          <p className="mt-4 text-sm font-medium text-neutral-600 dark:text-neutral-400">
            Rezervasyon: <strong>{reservation.public_code}</strong>
          </p>
        )}
      </div>
    )
  }

  if (state === 'cancelled') {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <div className="mb-4 flex justify-center">
          <svg className="h-16 w-16 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-neutral-800 dark:text-white">Rezervasyon Reddedildi</h1>
        <p className="mt-2 text-neutral-500">
          {message || 'Rezervasyonu reddettiniz. Müşteri temsilcimiz müşteriyle iletişime geçecektir.'}
        </p>
      </div>
    )
  }

  // state === 'ready'
  if (!reservation) return null

  const isPartial = reservation.payment_type === 'partial'
  const amountPaid = parseFloat(reservation.amount_paid)
  const supplierPrepaid = parseFloat(reservation.supplier_prepaid_amount)
  const guestDue = parseFloat(reservation.guest_due_at_checkin)
  const commissionAmount = parseFloat(reservation.commission_amount)
  const currency = 'TRY'

  function fmtCur(n: number) {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      {/* Başlık */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-800 dark:text-white">
          Rezervasyon Onay Talebi
        </h1>
        <p className="mt-1 text-neutral-500 dark:text-neutral-400">
          Misafir rezervasyonunu onaylamanız veya reddetmeniz bekleniyor.
        </p>
      </div>

      {/* Countdown */}
      {reservation.supplier_confirm_deadline && (
        <CountdownTimer deadline={reservation.supplier_confirm_deadline} />
      )}

      {/* Rezervasyon özeti */}
      <div className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-700">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Rezervasyon Detayları
        </h2>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">İlan</span>
            <span className="font-medium text-neutral-800 dark:text-neutral-200">{reservation.listing_title}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">Kod</span>
            <span className="font-mono font-medium text-neutral-800 dark:text-neutral-200">{reservation.public_code}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">Misafir</span>
            <span className="font-medium text-neutral-800 dark:text-neutral-200">{reservation.guest_name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">Giriş</span>
            <span className="font-medium text-neutral-800 dark:text-neutral-200">{reservation.starts_on}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">Çıkış</span>
            <span className="font-medium text-neutral-800 dark:text-neutral-200">{reservation.ends_on}</span>
          </div>
        </div>
      </div>

      {/* Ödeme cetveli */}
      {schedule ? (
        <PaymentScheduleCard schedule={schedule} target="supplier" />
      ) : (
        <div className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-700">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Ödeme Durumu
          </h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">Ödeme Tipi</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${isPartial ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                {isPartial ? 'Kısmi Ön Ödeme' : 'Tam Ödeme'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">Müşteri Ödedi</span>
              <span className="font-medium text-green-700 dark:text-green-400">{fmtCur(amountPaid)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">Komisyonumuz</span>
              <span className="font-medium text-neutral-800 dark:text-neutral-200">-{fmtCur(commissionAmount)}</span>
            </div>
            <div className="border-t border-neutral-100 pt-2 dark:border-neutral-700">
              <div className="flex justify-between text-sm font-semibold">
                <span>Check-in'de Size Transfer</span>
                <span className="text-primary-600 dark:text-primary-400">{fmtCur(supplierPrepaid)}</span>
              </div>
              {guestDue > 0 && (
                <div className="mt-1 flex justify-between text-sm font-semibold">
                  <span>Girişte Misafirden Tahsil</span>
                  <span className="text-amber-600 dark:text-amber-400">{fmtCur(guestDue)}</span>
                </div>
              )}
            </div>
          </div>
          {guestDue > 0 && (
            <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
              Misafir girişte size <strong>{fmtCur(guestDue)}</strong> nakit veya kart ile ödeyecektir.
            </p>
          )}
        </div>
      )}

      {/* Aksiyon butonları */}
      {!showCancelForm && (
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            onClick={handleConfirm}
            disabled={actionPending}
            className="flex items-center justify-center gap-2 rounded-2xl bg-green-600 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {actionPending ? 'İşleniyor...' : 'Rezervasyonu Onayla'}
          </button>
          <button
            onClick={() => setShowCancelForm(true)}
            disabled={actionPending}
            className="flex items-center justify-center gap-2 rounded-2xl border-2 border-red-300 px-6 py-3.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Reddet
          </button>
        </div>
      )}

      {showCancelForm && (
        <div className="space-y-3 rounded-2xl border-2 border-red-200 p-4 dark:border-red-800">
          <p className="text-sm font-semibold text-red-600 dark:text-red-400">
            Rezervasyonu Reddetme Sebebiniz (isteğe bağlı)
          </p>
          <textarea
            value={cancelNote}
            onChange={(e) => setCancelNote(e.target.value)}
            placeholder="Ör: İlgili tarihler müsait değil..."
            rows={3}
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 placeholder-neutral-400 focus:border-neutral-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
          />
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              disabled={actionPending}
              className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {actionPending ? 'İşleniyor...' : 'Reddi Onayla'}
            </button>
            <button
              onClick={() => setShowCancelForm(false)}
              disabled={actionPending}
              className="flex-1 rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Vazgeç
            </button>
          </div>
        </div>
      )}

      <p className="text-center text-xs text-neutral-400">
        Bu sayfa yalnızca tedarikçilere özel gönderilen güvenli bağlantı ile erişilebilir.
      </p>
    </div>
  )
}
