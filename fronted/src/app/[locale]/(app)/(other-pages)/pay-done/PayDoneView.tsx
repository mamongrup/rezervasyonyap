'use client'

import ButtonPrimary from '@/shared/ButtonPrimary'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from '@/shared/description-list'
import { Divider } from '@/shared/divider'
import { getReservationByPublicCode, type ReservationDetail } from '@/lib/travel-api'
import T from '@/utils/getT'
import { Calendar04Icon, Home01Icon, UserIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useSearchParams } from 'next/navigation'
import React from 'react'

function formatDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatCurrency(amountStr: string, currency: string): string {
  const num = parseFloat(amountStr)
  if (Number.isNaN(num)) return amountStr
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: currency || 'TRY',
    minimumFractionDigits: 2,
  }).format(num)
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    held: 'Beklemede',
    confirmed: 'Onaylandı',
    completed: 'Tamamlandı',
    cancelled: 'İptal',
    paid: 'Ödendi',
  }
  return map[status] ?? status
}

export default function PayDoneView() {
  const searchParams = useSearchParams()
  const publicCode = searchParams.get('code')

  const [reservation, setReservation] = React.useState<ReservationDetail | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    document.documentElement.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  React.useEffect(() => {
    if (!publicCode) {
      setLoading(false)
      return
    }
    const email = localStorage.getItem('travel_paydone_email') ?? ''
    if (!email) {
      setLoading(false)
      return
    }
    getReservationByPublicCode(publicCode, email)
      .then((data) => {
        setReservation(data)
        localStorage.removeItem('travel_paydone_email')
      })
      .catch(() => {
        /* Sessizce geç — statik fallback göster */
      })
      .finally(() => setLoading(false))
  }, [publicCode])

  const totalFromLines = React.useMemo(() => {
    if (!reservation?.lines.length) return null
    const sum = reservation.lines.reduce((acc, l) => acc + parseFloat(l.line_total || '0'), 0)
    return sum
  }, [reservation])

  if (loading) {
    return (
      <main className="container mt-10 mb-24">
        <p className="text-neutral-500 dark:text-neutral-400">Rezervasyon yükleniyor…</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="container mt-10 mb-24 max-w-lg">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </main>
    )
  }

  return (
    <main className="container mt-10 mb-24 sm:mt-16 lg:mb-32">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-y-12 px-0 sm:rounded-2xl sm:p-6 xl:p-8">
        <h1 className="text-4xl font-semibold sm:text-5xl">{T['common']['Congratulation']} 🎉</h1>
        <Divider />

        {reservation && (
          <div className="flex flex-col divide-y divide-neutral-200 rounded-3xl border border-neutral-200 text-neutral-500 sm:flex-row sm:divide-x sm:divide-y-0 dark:divide-neutral-700 dark:border-neutral-700 dark:text-neutral-400">
            <div className="flex flex-1 gap-x-4 p-5">
              <HugeiconsIcon icon={Calendar04Icon} size={32} strokeWidth={1.5} />
              <div className="flex flex-col">
                <span className="text-sm text-neutral-400">Tarih</span>
                <span className="mt-1.5 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  {formatDate(reservation.starts_on)} – {formatDate(reservation.ends_on)}
                </span>
              </div>
            </div>
            <div className="flex flex-1 gap-x-4 p-5">
              <HugeiconsIcon icon={UserIcon} size={32} strokeWidth={1.5} />
              <div className="flex flex-col">
                <span className="text-sm text-neutral-400">Misafir</span>
                <span className="mt-1.5 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  {reservation.guest_name || reservation.guest_email}
                </span>
              </div>
            </div>
          </div>
        )}

        <div>
          <h3 className="text-2xl font-semibold">{T['common']['Your booking']}</h3>
          <DescriptionList className="mt-5">
            <DescriptionTerm>Rezervasyon kodu</DescriptionTerm>
            <DescriptionDetails>
              <span className="font-mono text-neutral-900 dark:text-neutral-100">
                {reservation?.public_code ?? publicCode ?? '—'}
              </span>
            </DescriptionDetails>

            {reservation && (
              <>
                <DescriptionTerm>Durum</DescriptionTerm>
                <DescriptionDetails>{statusLabel(reservation.status)}</DescriptionDetails>

                <DescriptionTerm>Giriş tarihi</DescriptionTerm>
                <DescriptionDetails>{formatDate(reservation.starts_on)}</DescriptionDetails>

                <DescriptionTerm>Çıkış tarihi</DescriptionTerm>
                <DescriptionDetails>{formatDate(reservation.ends_on)}</DescriptionDetails>

                {totalFromLines !== null && (
                  <>
                    <DescriptionTerm>Toplam</DescriptionTerm>
                    <DescriptionDetails>
                      {formatCurrency(
                        totalFromLines.toString(),
                        reservation.lines[0]
                          ? (() => {
                              try {
                                const pb = JSON.parse(reservation.price_breakdown_json) as {
                                  currency?: string
                                }
                                return pb.currency ?? 'TRY'
                              } catch {
                                return 'TRY'
                              }
                            })()
                          : 'TRY',
                      )}
                    </DescriptionDetails>
                  </>
                )}

                <DescriptionTerm>Oluşturma tarihi</DescriptionTerm>
                <DescriptionDetails>{formatDate(reservation.created_at)}</DescriptionDetails>
              </>
            )}

            {!reservation && publicCode && (
              <>
                <DescriptionTerm>Rezervasyon kodu</DescriptionTerm>
                <DescriptionDetails>
                  <span className="font-mono">{publicCode}</span>
                </DescriptionDetails>
              </>
            )}
          </DescriptionList>
        </div>

        <div>
          <ButtonPrimary href="/">
            <HugeiconsIcon icon={Home01Icon} className="size-5" strokeWidth={1.75} />
            Ana sayfaya dön
          </ButtonPrimary>
        </div>
      </div>
    </main>
  )
}
