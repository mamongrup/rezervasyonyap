'use client'

import React from 'react'
import type { PaymentSchedule } from '@/lib/travel-api'

interface PaymentScheduleCardProps {
  schedule: PaymentSchedule
  target: 'guest' | 'supplier'
}

function fmt(n: number, currency = 'TRY') {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(n)
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={[
        'flex items-center justify-between gap-4 py-2.5',
        highlight ? 'rounded-lg bg-neutral-50 px-3 dark:bg-neutral-800/60' : '',
      ].join(' ')}
    >
      <span className="text-sm text-neutral-600 dark:text-neutral-400">{label}</span>
      <span
        className={[
          'text-sm font-semibold',
          highlight
            ? 'text-neutral-900 dark:text-white'
            : 'text-neutral-800 dark:text-neutral-200',
        ].join(' ')}
      >
        {value}
      </span>
    </div>
  )
}

export default function PaymentScheduleCard({ schedule, target }: PaymentScheduleCardProps) {
  const currency = schedule.currency
  const isPartial = schedule.payment_type === 'partial'
  const gs = schedule.guest_schedule
  const ss = schedule.supplier_schedule

  if (target === 'guest') {
    return (
      <div className="space-y-1 rounded-2xl border border-neutral-200 p-5 dark:border-neutral-700">
        <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Ödeme Özeti
        </h4>
        <Row label="Rezervasyon Kodu" value={schedule.reservation_code} />
        <Row label="İlan" value={schedule.listing_title} />
        <Row label="Giriş Tarihi" value={schedule.check_in} />
        <Row label="Çıkış Tarihi" value={schedule.check_out} />
        <div className="my-3 border-t border-neutral-100 dark:border-neutral-800" />
        <Row
          label="Toplam Tutar"
          value={fmt(schedule.total_sale_price, currency)}
        />
        <Row
          label={isPartial ? 'Şimdi Ödediğiniz' : 'Ödenen Tutar'}
          value={fmt(gs.paid_now, currency)}
          highlight
        />
        {isPartial && gs.due_at_checkin > 0 && (
          <>
            <Row
              label="Girişte Ödenecek"
              value={fmt(gs.due_at_checkin, currency)}
              highlight
            />
            <p className="mt-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
              <strong>Girişte ödeme nereye yapılır?</strong>{' '}
              {gs.due_to}
            </p>
          </>
        )}
        {!isPartial && (
          <p className="mt-2 rounded-lg bg-green-50 p-3 text-xs text-green-700 dark:bg-green-900/20 dark:text-green-400">
            Tüm ödeme tamamlandı. Girişte ayrıca ödeme yapmanıza gerek yok.
          </p>
        )}
      </div>
    )
  }

  // Tedarikçi görünümü
  return (
    <div className="space-y-1 rounded-2xl border border-neutral-200 p-5 dark:border-neutral-700">
      <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        Tedarikçi Ödeme Cetveli
      </h4>
      <Row label="Rezervasyon Kodu" value={schedule.reservation_code} />
      <Row label="Misafir Adı" value={schedule.guest_name} />
      <Row label="Giriş / Çıkış" value={`${schedule.check_in} → ${schedule.check_out}`} />
      <div className="my-3 border-t border-neutral-100 dark:border-neutral-800" />
      <Row
        label="Satış Tutarı"
        value={fmt(schedule.total_sale_price, currency)}
      />
      <Row
        label={`Komisyon Kesintisi (${((ss.commission_deducted / schedule.total_sale_price) * 100).toFixed(1)}%)`}
        value={`-${fmt(ss.commission_deducted, currency)}`}
      />
      <Row
        label="Size Ödenecek Toplam"
        value={fmt(ss.total_due, currency)}
        highlight
      />
      <div className="my-3 border-t border-neutral-100 dark:border-neutral-800" />
      {isPartial ? (
        <>
          <Row
            label="Check-in'de Tarafımızdan Transfer"
            value={fmt(ss.transfer_at_checkin, currency)}
            highlight
          />
          {ss.collect_from_guest > 0 && (
            <Row
              label="Girişte Misafirden Tahsil Edeceksiniz"
              value={fmt(ss.collect_from_guest, currency)}
              highlight
            />
          )}
          <p className="mt-2 rounded-lg bg-blue-50 p-3 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
            Misafirin girişte size ödeyeceği <strong>{fmt(ss.collect_from_guest, currency)}</strong>{' '}
            nakit veya kart ile tahsil edilecektir.
          </p>
        </>
      ) : (
        <Row
          label="Check-in'de Tarafımızdan Transfer"
          value={fmt(ss.transfer_at_checkin, currency)}
          highlight
        />
      )}
      {ss.payment_note && (
        <p className="mt-2 rounded-lg bg-neutral-50 p-3 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
          {ss.payment_note}
        </p>
      )}
    </div>
  )
}
