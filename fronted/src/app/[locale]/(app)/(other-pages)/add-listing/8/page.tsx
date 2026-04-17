'use client'

import { useAddListingsMessages } from '@/hooks/useAddListingsMessages'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { Divider } from '@/shared/divider'
import Input from '@/shared/Input'
import Select from '@/shared/Select'
import Form from 'next/form'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import FormItem from '../FormItem'

const Page = () => {
  const L = useAddListingsMessages()
  const [currency, setCurrency] = useState(() => L.page8.currencyOptions[0]?.value ?? 'USD')
  const priceDisplay = useMemo(() => {
    const m = L.page8.currencyDisplay
    const row = m[currency as keyof typeof m]
    return row ?? m.USD
  }, [L.page8.currencyDisplay, currency])
  const router = useRouter()
  const vitrinPath = useVitrinHref()
  const nextHref = vitrinPath('/add-listing/9')

  useEffect(() => {
    router.prefetch(nextHref)
  }, [router, nextHref])

  const handleSubmitForm = async (formData: FormData) => {
    const formObject = Object.fromEntries(formData.entries())
    console.log('Form submitted:', formObject)

    router.push(nextHref)
  }

  return (
    <>
      <div>
        <h2 className="text-2xl font-semibold">{L.page8.pageTitle}</h2>
        <span className="mt-2 block text-neutral-500 dark:text-neutral-400">
          {L.page8.pageDescription}
        </span>
      </div>

      <Divider className="w-14!" />
      {/* FORM */}
      <Form id="add-listing-form" action={handleSubmitForm} className="space-y-8">
        {/* ITEM */}
        <FormItem label={L.page8.Currency}>
          <Select
            name="currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            {L.page8.currencyOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </FormItem>
        <FormItem label={L.page8['Base price (Monday -Thuday)']}>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 start-0 flex min-w-9 items-center justify-center ps-2">
              <span className="text-gray-500 tabular-nums">{priceDisplay.symbol}</span>
            </div>
            <Input name="base-price1" className="ps-10! pe-12!" placeholder="0.00" inputMode="decimal" />
            <div className="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-3">
              <span className="text-xs text-gray-500 tabular-nums">{priceDisplay.suffix}</span>
            </div>
          </div>
        </FormItem>
        {/* ----- */}
        <FormItem label={L.page8['Base price (Friday-Sunday)']}>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 start-0 flex min-w-9 items-center justify-center ps-2">
              <span className="text-gray-500 tabular-nums">{priceDisplay.symbol}</span>
            </div>
            <Input name="base-price2" className="ps-10! pe-12!" placeholder="0.00" inputMode="decimal" />
            <div className="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-3">
              <span className="text-xs text-gray-500 tabular-nums">{priceDisplay.suffix}</span>
            </div>
          </div>
        </FormItem>
        {/* ----- */}
        <FormItem label={L.page8['Long term price (Monthly discount)']}>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3">
              <span className="text-gray-500">%</span>
            </div>
            <Input name="long-price3" className="ps-8! pe-10!" placeholder="0.00" />
            <div className="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-3">
              <span className="text-gray-500">{L.page8.longTermPriceSuffix}</span>
            </div>
          </div>
        </FormItem>
      </Form>
    </>
  )
}

export default Page
