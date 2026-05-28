'use client'

import { checkoutT } from '@/lib/checkout-i18n'
import { Description, Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react'
import { MasterCardIcon, PaypalIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import React from 'react'

type Props = {
  locale: string
}

const PayWith = ({ locale }: Props) => {
  const C = checkoutT(locale)
  const [paymentMethod, setPaymentMethod] = React.useState('paypal')

  return (
    <div className="pt-5">
      <h3 className="text-2xl font-semibold">{C.payWithTitle}</h3>
      <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{C.payWithNote}</p>
      <div className="my-5 w-14 border-b border-neutral-200 dark:border-neutral-700" />

      <TabGroup
        className="mt-6"
        onChange={(index) => {
          setPaymentMethod(index === 0 ? 'paypal' : 'creditCard')
        }}
      >
        <TabList className="my-5 flex gap-1 text-sm">
          <Tab className="flex items-center gap-x-2 rounded-full px-4 py-2.5 leading-none font-medium data-hover:bg-black/5 data-[selected]:bg-neutral-900 data-[selected]:text-white sm:px-6 dark:data-[selected]:bg-neutral-100 dark:data-[selected]:text-neutral-900">
            {C.payWithPaypalTab}
            <HugeiconsIcon icon={PaypalIcon} size={20} strokeWidth={1.5} />
          </Tab>
          <Tab className="flex items-center gap-x-2 rounded-full px-4 py-2.5 leading-none font-medium data-hover:bg-black/5 data-[selected]:bg-neutral-900 data-[selected]:text-white sm:px-6 dark:data-[selected]:bg-neutral-100 dark:data-[selected]:text-neutral-900">
            <div className="flex items-center gap-x-2">
              {C.payWithCardTab}
              <HugeiconsIcon icon={MasterCardIcon} size={20} strokeWidth={1.5} />
            </div>
          </Tab>
        </TabList>

        <TabPanels>
          <TabPanel className="flex flex-col gap-y-5">
            <Field>
              <Label>{C.cardNumber}</Label>
              <Input name="card-number" className="mt-1.5" autoComplete="cc-number" />
            </Field>
            <Field>
              <Label>{C.cardHolder}</Label>
              <Input name="card-holder" autoComplete="cc-name" />
            </Field>
            <div className="flex gap-x-5">
              <Field>
                <Label>{C.expirationDate}</Label>
                <Input name="expiration-date" className="mt-1.5" type="date" autoComplete="cc-exp" />
              </Field>
              <Field>
                <Label>{C.cvc}</Label>
                <Input name="CVC" className="mt-1.5" autoComplete="cc-csc" />
              </Field>
            </div>
            <Field>
              <Label>{C.messageForHost}</Label>
              <Textarea name="message" className="mt-1.5" placeholder="..." />
              <Description>{C.writeAboutYourself}</Description>
            </Field>
          </TabPanel>
          <TabPanel className="flex flex-col gap-y-5">
            <Field>
              <Label>{C.emailLabel}</Label>
              <Input name="email" className="mt-1.5" type="email" autoComplete="email" />
            </Field>
            <Field>
              <Label>{C.payWithPassword}</Label>
              <Input name="password" className="mt-1.5" type="password" autoComplete="off" />
            </Field>
            <Field>
              <Label>{C.messageForHost}</Label>
              <Textarea name="message" className="mt-1.5" placeholder="..." />
              <Description className="block text-sm text-neutral-500">{C.writeAboutYourself}</Description>
            </Field>
          </TabPanel>
        </TabPanels>
      </TabGroup>

      <input type="hidden" name="paymentMethod" value={paymentMethod} />
    </div>
  )
}

export default PayWith
