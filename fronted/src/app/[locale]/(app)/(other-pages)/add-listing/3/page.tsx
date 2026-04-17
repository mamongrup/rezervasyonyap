'use client'

import NcInputNumber from '@/components/NcInputNumber'
import { useAddListingsMessages } from '@/hooks/useAddListingsMessages'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { Divider } from '@/shared/divider'
import Select from '@/shared/Select'
import Form from 'next/form'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import FormItem from '../FormItem'

const Page = () => {
  const L = useAddListingsMessages()
  const router = useRouter()
  const vitrinPath = useVitrinHref()
  const nextHref = vitrinPath('/add-listing/4')

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
      <h1 className="text-2xl font-semibold">{L.page3.pageTitle}</h1>
      <Divider className="w-14!" />

      {/* FORM */}
      <Form id="add-listing-form" action={handleSubmitForm} className="space-y-5">
        {/* ITEM */}
        <FormItem label={L.page3['Acreage (m2)']}>
          <Select name="acreage">
            {L.page3.acreageOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </FormItem>
        <Divider />
        <NcInputNumber inputName="Guests" label={L.page3.Guests} defaultValue={4} />
        <Divider />
        <NcInputNumber inputName="Bedroom" label={L.page3.Bedroom} defaultValue={4} />
        <Divider />
        <NcInputNumber inputName="Beds" label={L.page3.Beds} defaultValue={4} />
        <Divider />
        <NcInputNumber inputName="Bathroom" label={L.page3.Bathroom} defaultValue={2} />
        <Divider />
        <NcInputNumber inputName="Kitchen" label={L.page3.Kitchen} defaultValue={2} />
      </Form>
    </>
  )
}

export default Page
