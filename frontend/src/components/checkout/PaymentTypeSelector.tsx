'use client'

import React from 'react'

interface PaymentTypeSelectorProps {
  totalPrice: number
  commissionPercent: number
  prepaymentPercent: number
  currencyCode?: string
  value: 'full' | 'partial'
  onChange: (type: 'full' | 'partial') => void
}

function fmt(n: number, currency = 'TRY') {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(n)
}

export default function PaymentTypeSelector({
  totalPrice,
  commissionPercent,
  prepaymentPercent,
  currencyCode = 'TRY',
  value,
  onChange,
}: PaymentTypeSelectorProps) {
  const commission = Math.round(totalPrice * commissionPercent) / 100
  const rawPrepay = Math.round(totalPrice * prepaymentPercent) / 100
  // Ön ödeme, komisyon kadar veya daha fazla olmalı
  const partialAmount = Math.max(rawPrepay, commission)
  const remainder = totalPrice - partialAmount

  const options: Array<{
    id: 'full' | 'partial'
    label: string
    sublabel: string
    amount: number
    badge?: string
    note?: string
  }> = [
    {
      id: 'full',
      label: 'Tüm ödemeyi yap',
      sublabel: 'Rezervasyonu şimdi tam öde, girişte ek ödeme yok',
      amount: totalPrice,
    },
    {
      id: 'partial',
      label: `Sadece ön ödeme yap (${prepaymentPercent}%)`,
      sublabel: `Kalan ${fmt(remainder, currencyCode)} tutarı girişte tesise öde`,
      amount: partialAmount,
      badge: 'Esnek',
      note:
        remainder > 0
          ? `Girişte tesise: ${fmt(remainder, currencyCode)} (nakit veya kart)`
          : undefined,
    },
  ]

  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">
        Ödeme Seçeneği
      </h3>

      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={[
              'relative flex flex-col items-start gap-y-1.5 rounded-2xl border-2 p-4 text-left transition-all',
              value === opt.id
                ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20'
                : 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-600',
            ].join(' ')}
          >
            {/* Seçim indikatörü */}
            <span
              className={[
                'absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full border-2',
                value === opt.id
                  ? 'border-primary-500 bg-primary-500 dark:border-primary-400 dark:bg-primary-400'
                  : 'border-neutral-300 dark:border-neutral-600',
              ].join(' ')}
            >
              {value === opt.id && (
                <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 12 12">
                  <path d="M3.5 6.5L5 8l3.5-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>

            {opt.badge && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                {opt.badge}
              </span>
            )}

            <span className="pr-6 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
              {opt.label}
            </span>

            <span className="text-2xl font-bold text-neutral-900 dark:text-white">
              {fmt(opt.amount, currencyCode)}
            </span>

            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {opt.sublabel}
            </span>

            {opt.note && (
              <span className="mt-1 inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 16 16">
                  <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 11a.75.75 0 110-1.5A.75.75 0 018 12zm.75-3.5v-3a.75.75 0 00-1.5 0v3a.75.75 0 001.5 0z" fill="currentColor" />
                </svg>
                {opt.note}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
