'use client'

import { formDataToStringRecord, runHeroSearchPlanEffects } from '@/lib/hero-search-plan'
import clsx from 'clsx'
import Form from 'next/form'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { ButtonSubmit, DateRangeField, GuestNumberField, LocationInputField, VerticalDividerLine } from './ui'

interface Props {
  className?: string
  formStyle: 'default' | 'small'
}

export const StaySearchForm = ({ className, formStyle = 'default' }: Props) => {
  const router = useRouter()

  useEffect(() => {
    router.prefetch('/oteller/all')
  }, [router])

  const handleFormSubmit = (formData: FormData) => {
    const formDataEntries = Object.fromEntries(formData.entries())
    const params = formDataToStringRecord(formData)
    runHeroSearchPlanEffects('stay', params, '/oteller/all')
    const location = formDataEntries['location'] as string
    const checkin = formDataEntries['checkin'] as string
    const checkout = formDataEntries['checkout'] as string
    const guestAdults = formDataEntries['guestAdults'] as string
    const searchParams = new URLSearchParams()
    if (location) searchParams.set('location', location)
    if (checkin) searchParams.set('checkin', checkin)
    if (checkout) searchParams.set('checkout', checkout)
    if (guestAdults) searchParams.set('guests', guestAdults)
    const qs = searchParams.toString()
    router.push('/oteller/all' + (qs ? `?${qs}` : ''))
  }

  return (
    <Form
      className={clsx(
        'relative z-10 flex w-full items-stretch rounded-full bg-white [--form-bg:var(--color-white)] dark:bg-neutral-800 dark:[--form-bg:var(--color-neutral-800)]',
        className,
        formStyle === 'small' && 'custom-shadow-1',
        formStyle === 'default' &&
          'shadow-[0_8px_30px_rgba(15,23,42,0.08)] ring-1 ring-black/5 dark:shadow-2xl dark:ring-white/10 pr-[4.25rem] sm:pr-[4.5rem]'
      )}
      action={handleFormSubmit}
    >
      <LocationInputField className="hero-search-form__field-after flex-5/12" fieldStyle={formStyle} />
      <VerticalDividerLine />
      <DateRangeField
        className="hero-search-form__field-before hero-search-form__field-after flex-4/12"
        fieldStyle={formStyle}
      />
      <VerticalDividerLine />
      <GuestNumberField
        className="hero-search-form__field-before flex-4/12"
        clearDataButtonClassName={clsx(formStyle === 'small' && 'sm:end-18', formStyle === 'default' && 'sm:end-22')}
        fieldStyle={formStyle}
      />

      <ButtonSubmit fieldStyle={formStyle} className="z-10" />
    </Form>
  )
}
