'use client'

import { useAddListingsMessages } from '@/hooks/useAddListingsMessages'
import { Divider } from '@/shared/divider'
import { ImageAdd02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import Form from 'next/form'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const Page = () => {
  const L = useAddListingsMessages()
  const router = useRouter()
  const vitrinPath = useVitrinHref()
  const nextHref = vitrinPath('/add-listing/8')

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
        <h2 className="text-2xl font-semibold">{L.page7.pageTitle}</h2>
        <span className="mt-2 block text-neutral-500 dark:text-neutral-400">
          {L.page7.pageDescription}
        </span>
      </div>

      <Divider className="w-14!" />
      {/* FORM */}
      <Form id="add-listing-form" action={handleSubmitForm} className="space-y-8">
        <div>
          <span className="text-lg font-semibold">{L.page7['Cover image']}</span>
          <div className="mt-5">
            <div className="mt-1 flex justify-center rounded-2xl border-2 border-dashed border-neutral-300 px-6 pt-5 pb-6 dark:border-neutral-600">
              <div className="space-y-1 text-center">
                <HugeiconsIcon className="mx-auto text-neutral-400" icon={ImageAdd02Icon} size={48} strokeWidth={1} />

                <div className="flex text-sm text-neutral-600 dark:text-neutral-300">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer rounded-md font-medium text-primary-600 focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2 focus-within:outline-hidden hover:text-primary-500"
                  >
                    <span>{L.page7['Upload a file']}</span>
                    <input id="file-upload" name="cover" type="file" className="sr-only" />
                  </label>
                  <p className="ps-1">{L.page7['or drag and drop']}</p>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {L.page7['PNG, JPG, GIF up to 10MB']}
                </p>
              </div>
            </div>
          </div>
        </div>
        {/* ----------------- */}
        <div>
          <span className="text-lg font-semibold">{L.page7['Pictures of the place']}</span>
          <div className="mt-5">
            <div className="mt-1 flex justify-center rounded-2xl border-2 border-dashed border-neutral-300 px-6 pt-5 pb-6 dark:border-neutral-600">
              <div className="space-y-1 text-center">
                <HugeiconsIcon className="mx-auto text-neutral-400" icon={ImageAdd02Icon} size={48} strokeWidth={1} />

                <div className="flex text-sm text-neutral-600 dark:text-neutral-300">
                  <label
                    htmlFor="file-upload-2"
                    className="relative cursor-pointer rounded-md font-medium text-primary-600 focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2 focus-within:outline-hidden hover:text-primary-500"
                  >
                    <span>{L.page7['Upload a file']}</span>
                    <input id="file-upload-2" name="gallery" type="file" className="sr-only" />
                  </label>
                  <p className="ps-1">{L.page7['or drag and drop']}</p>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {L.page7['PNG, JPG, GIF up to 10MB']}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Form>
    </>
  )
}

export default Page
