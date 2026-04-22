'use client'

import { useAddListingsMessages } from '@/hooks/useAddListingsMessages'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import Input from '@/shared/Input'
import Select from '@/shared/Select'
import Form from 'next/form'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import FormItem from '../FormItem'

const Page = () => {
  const L = useAddListingsMessages()
  const router = useRouter()
  const vitrinPath = useVitrinHref()
  const nextHref = vitrinPath('/add-listing/2')

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
      <h1 className="text-2xl font-semibold">{L.page1.pageTitle}</h1>
      <div className="w-14 border-b border-neutral-200 dark:border-neutral-700"></div>
      {/* FORM */}
      <Form id="add-listing-form" action={handleSubmitForm} className="flex flex-col gap-y-8">
        {/* ITEM */}
        <FormItem
          label={L.page1['Choose a property type']}
          desccription={L.page1.propertyTypeDescription}
        >
          <Select name="propertyType">
            {L.page1.propertyTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </FormItem>
        <FormItem
          label={L.page1['Place name']}
          desccription={L.page1.placeNameDescription}
        >
          <Input placeholder={L.page1['Place name']} name="place-name" />
        </FormItem>
        <FormItem
          label={L.page1['Rental form']}
          desccription={L.page1.rentalFormDescription}
        >
          <Select name="rentalForm">
            {L.page1.rentalFormOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </FormItem>
      </Form>
    </>
  )
}

export default Page
