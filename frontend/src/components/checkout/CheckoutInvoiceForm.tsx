'use client'

import { checkoutT } from '@/lib/checkout-i18n'
import type { CheckoutInvoice } from '@/lib/checkout-guest-types'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'

type Props = {
  locale: string
  invoice: CheckoutInvoice
  onChange: (inv: CheckoutInvoice) => void
  autoFilled?: boolean
}

export default function CheckoutInvoiceForm({ locale, invoice, onChange, autoFilled }: Props) {
  const C = checkoutT(locale)
  const set = (patch: Partial<CheckoutInvoice>) => onChange({ ...invoice, ...patch })

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        {autoFilled ? C.invoiceAutoHint : C.invoiceHint}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field className="sm:col-span-2">
          <Label>{C.invoiceNameLabel}</Label>
          <Input
            className="mt-1.5"
            name="invoice_full_name"
            required
            value={invoice.full_name}
            onChange={(e) => set({ full_name: e.target.value })}
          />
        </Field>
        <Field>
          <Label>{C.invoiceTcLabel}</Label>
          <Input
            className="mt-1.5"
            name="invoice_national_id"
            inputMode="numeric"
            maxLength={11}
            value={invoice.national_id}
            onChange={(e) => set({ national_id: e.target.value.replace(/\D/g, '') })}
          />
        </Field>
        <Field>
          <Label>{C.invoiceCityLabel}</Label>
          <Input
            className="mt-1.5"
            name="invoice_city"
            value={invoice.city}
            onChange={(e) => set({ city: e.target.value })}
          />
        </Field>
        <Field className="sm:col-span-2">
          <Label>{C.invoiceAddressLabel}</Label>
          <Textarea
            className="mt-1.5"
            name="invoice_address"
            rows={2}
            value={invoice.address}
            onChange={(e) => set({ address: e.target.value })}
          />
        </Field>
        <Field>
          <Label>{C.emailLabel}</Label>
          <Input
            className="mt-1.5"
            name="invoice_email"
            type="email"
            value={invoice.email}
            onChange={(e) => set({ email: e.target.value })}
          />
        </Field>
        <Field>
          <Label>{C.contactPhoneLabel}</Label>
          <Input
            className="mt-1.5"
            name="invoice_phone"
            type="tel"
            value={invoice.phone}
            onChange={(e) => set({ phone: e.target.value })}
          />
        </Field>
      </div>
      <p className="text-sm text-neutral-500 dark:text-neutral-400">{C.invoiceEditHint}</p>
    </div>
  )
}
