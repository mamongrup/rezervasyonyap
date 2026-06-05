'use client'

import { checkoutT, fmtCheckout } from '@/lib/checkout-i18n'
import {
  emptyGuestRow,
  guestRowsForStay,
  type CheckoutGuestRow,
} from '@/lib/checkout-guest-types'
import type { GuestsObject } from '@/type'
import { Description, Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import React from 'react'

type Props = {
  locale: string
  guests: GuestsObject
  contactEmail: string
  contactPhone: string
  onContactEmailChange: (v: string) => void
  onContactPhoneChange: (v: string) => void
  rows: CheckoutGuestRow[]
  onRowsChange: (rows: CheckoutGuestRow[]) => void
}

export default function CheckoutGuestForms({
  locale,
  guests,
  contactEmail,
  contactPhone,
  onContactEmailChange,
  onContactPhoneChange,
  rows,
  onRowsChange,
}: Props) {
  const C = checkoutT(locale)
  const count = guestRowsForStay(guests)

  React.useEffect(() => {
    const next = [...rows]
    while (next.length < count) next.push(emptyGuestRow())
    if (next.length > count) next.length = count
    if (next.length !== rows.length || next.some((r, i) => r !== rows[i])) {
      onRowsChange(next)
    }
  }, [count, rows, onRowsChange])

  const updateRow = (index: number, patch: Partial<CheckoutGuestRow>) => {
    const next = rows.map((r, i) => (i === index ? { ...r, ...patch } : r))
    onRowsChange(next)
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-neutral-600 dark:text-neutral-400">{C.guestFormsHint}</p>

      {rows.map((row, index) => {
        const isPrimary = index === 0
        const label = isPrimary
          ? C.guestPersonPrimaryLabel
          : fmtCheckout(C.guestPersonLabel, { n: index + 1 })
        return (
          <div
            key={index}
            className="rounded-2xl border border-neutral-200 bg-neutral-50/60 p-5 dark:border-neutral-700 dark:bg-neutral-900/30"
          >
            <h4 className="mb-4 text-sm font-semibold text-neutral-800 dark:text-neutral-100">{label}</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <Label>{C.guestFirstNameLabel}</Label>
                <Input
                  className="mt-1.5"
                  name={`guest_${index}_first_name`}
                  required={isPrimary}
                  value={row.first_name}
                  onChange={(e) => updateRow(index, { first_name: e.target.value })}
                />
              </Field>
              <Field>
                <Label>{C.guestLastNameLabel}</Label>
                <Input
                  className="mt-1.5"
                  name={`guest_${index}_last_name`}
                  required={isPrimary}
                  value={row.last_name}
                  onChange={(e) => updateRow(index, { last_name: e.target.value })}
                />
              </Field>

              {isPrimary ? (
                <>
                  <Field>
                    <Label>{C.guestTcLabel}</Label>
                    <Input
                      className="mt-1.5"
                      name={`guest_${index}_national_id`}
                      inputMode="numeric"
                      required
                      maxLength={11}
                      value={row.national_id}
                      onChange={(e) =>
                        updateRow(index, { national_id: e.target.value.replace(/\D/g, '') })
                      }
                    />
                  </Field>
                  <Field>
                    <Label>{C.contactPhoneLabel}</Label>
                    <Input
                      className="mt-1.5"
                      name="guest_phone"
                      type="tel"
                      autoComplete="tel"
                      value={contactPhone}
                      onChange={(e) => onContactPhoneChange(e.target.value)}
                    />
                  </Field>
                  <Field className="sm:col-span-2">
                    <Label>{C.emailLabel}</Label>
                    <Input
                      className="mt-1.5"
                      name="guest_email"
                      type="email"
                      required
                      autoComplete="email"
                      value={contactEmail}
                      onChange={(e) => onContactEmailChange(e.target.value)}
                    />
                    <Description>{C.emailHint}</Description>
                  </Field>
                  <Field className="sm:col-span-2">
                    <Label>{C.guestAddressLabel}</Label>
                    <Textarea
                      className="mt-1.5"
                      name={`guest_${index}_address`}
                      rows={2}
                      value={row.address ?? ''}
                      onChange={(e) => updateRow(index, { address: e.target.value })}
                    />
                  </Field>
                </>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}
