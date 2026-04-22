'use client'

import { useAddListingsMessages } from '@/hooks/useAddListingsMessages'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import Textarea from '@/shared/Textarea'
import Form from 'next/form'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const PageAddListing6 = () => {
  const L = useAddListingsMessages()
  const router = useRouter()
  const vitrinPath = useVitrinHref()
  const nextHref = vitrinPath('/add-listing/7')

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
        <h2 className="text-2xl font-semibold">{L.page6.pageTitle}</h2>
        <span className="mt-2 block text-neutral-500 dark:text-neutral-400">
          {L.page6.pageDescription}
        </span>
      </div>

      <Form id="add-listing-form" action={handleSubmitForm}>
        <Textarea name="place-description" placeholder={L.page6.descriptionPlaceholder} rows={14} />
      </Form>
    </>
  )
}

export default PageAddListing6
