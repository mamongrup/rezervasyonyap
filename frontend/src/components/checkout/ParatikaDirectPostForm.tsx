'use client'

import ButtonPrimary from '@/shared/ButtonPrimary'
import Input from '@/shared/Input'
import { useMemo, useState } from 'react'

export type ParatikaDirectPostLabels = {
  title: string
  note: string
  cardOwner: string
  cardNumber: string
  expiryMonth: string
  expiryYear: string
  cvv: string
  pay: string
  secureNote: string
}

type Props = {
  actionUrl: string
  defaultCardOwner?: string
  labels: ParatikaDirectPostLabels
  onBeforeSubmit?: () => void
}

const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))

export default function ParatikaDirectPostForm({
  actionUrl,
  defaultCardOwner = '',
  labels,
  onBeforeSubmit,
}: Props) {
  const years = useMemo(() => {
    const y = new Date().getFullYear()
    return Array.from({ length: 16 }, (_, i) => String(y + i))
  }, [])

  const [expiryMonth, setExpiryMonth] = useState('')
  const [expiryYear, setExpiryYear] = useState('')

  return (
    <form
      action={actionUrl}
      method="POST"
      className="space-y-5"
      onSubmit={() => onBeforeSubmit?.()}
    >
      <input type="hidden" name="installmentCount" value="1" />
      <input type="hidden" name="points" value="" />

      <div>
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {labels.cardOwner}
        </label>
        <Input
          className="mt-1.5"
          name="cardOwner"
          required
          maxLength={32}
          autoComplete="cc-name"
          defaultValue={defaultCardOwner}
        />
      </div>

      <div>
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {labels.cardNumber}
        </label>
        <Input
          className="mt-1.5 font-mono"
          name="pan"
          required
          maxLength={19}
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="0000 0000 0000 0000"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {labels.expiryMonth}
          </label>
          <select
            name="expiryMonth"
            required
            value={expiryMonth}
            onChange={(e) => setExpiryMonth(e.target.value)}
            className="mt-1.5 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="">—</option>
            {MONTHS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {labels.expiryYear}
          </label>
          <select
            name="expiryYear"
            required
            value={expiryYear}
            onChange={(e) => setExpiryYear(e.target.value)}
            className="mt-1.5 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="">—</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-1">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {labels.cvv}
          </label>
          <Input
            className="mt-1.5 font-mono"
            name="cvv"
            type="password"
            required
            maxLength={4}
            inputMode="numeric"
            autoComplete="cc-csc"
          />
        </div>
      </div>

      <p className="text-xs text-neutral-500 dark:text-neutral-400">{labels.secureNote}</p>

      <ButtonPrimary type="submit">{labels.pay}</ButtonPrimary>
    </form>
  )
}
