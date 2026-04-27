'use client'

import { formDataToStringRecord, runHeroSearchPlanEffects } from '@/lib/hero-search-plan'
import T from '@/utils/getT'
import { Radio, RadioGroup } from '@headlessui/react'
import clsx from 'clsx'
import Form from 'next/form'
import { useRouter } from 'next/navigation'
import { FC, useEffect, useState } from 'react'
import { ButtonSubmit, DateRangeField, LocationInputField, VerticalDividerLine } from './ui'

interface Props {
  className?: string
  formStyle: 'default' | 'small'
}

export const RentalCarSearchForm: FC<Props> = ({ className, formStyle = 'default' }) => {
  const [dropOffLocationType, setDropOffLocationType] = useState<'same' | 'different'>('different')

  const router = useRouter()

  useEffect(() => {
    router.prefetch('/arac-kiralama/all')
  }, [router])

  const handleFormSubmit = (formData: FormData) => {
    const formDataEntries = Object.fromEntries(formData.entries())
    const params = { ...formDataToStringRecord(formData), drop_off_mode: dropOffLocationType }
    runHeroSearchPlanEffects('car', params, '/arac-kiralama/all')
    const location = formDataEntries['pickup-location'] as string
    const checkin = formDataEntries['checkin'] as string
    const checkout = formDataEntries['checkout'] as string
    const searchParams = new URLSearchParams()
    if (location) searchParams.set('location', location)
    if (checkin) searchParams.set('checkin', checkin)
    if (checkout) searchParams.set('checkout', checkout)
    searchParams.set('drop_off', dropOffLocationType)
    const qs = searchParams.toString()
    router.push('/arac-kiralama/all' + (qs ? `?${qs}` : ''))
  }

  const isDdropOffdifferent = dropOffLocationType === 'different'
  return (
    <Form
      className={clsx(
        'relative z-10 w-full bg-white [--form-bg:var(--color-white)] dark:bg-neutral-800 dark:[--form-bg:var(--color-neutral-800)]',
        className,
        formStyle === 'small' && 'rounded-t-2xl rounded-b-4xl custom-shadow-1',
        formStyle === 'default' &&
          'rounded-t-2xl rounded-b-[40px] shadow-xl xl:rounded-t-3xl xl:rounded-b-[48px] dark:shadow-2xl'
      )}
      action={handleFormSubmit}
    >
      {/* RADIO */}
      <RadioGroup
        value={dropOffLocationType}
        onChange={setDropOffLocationType}
        aria-label="Drop Off Location Type"
        name="drop_off_location_type"
        className={clsx(
          'flex flex-wrap items-center gap-2.5 border-b border-neutral-100 dark:border-neutral-700',
          formStyle === 'small' && 'px-7 py-4 xl:px-8',
          formStyle === 'default' && 'px-7 py-4 xl:px-8 xl:py-6'
        )}
      >
        <Radio
          value="different"
          className={`flex cursor-pointer items-center rounded-full border border-neutral-300 px-4 py-1.5 text-xs font-medium dark:border-neutral-700 data-checked:bg-black data-checked:text-white data-checked:shadow-lg data-checked:shadow-black/10 dark:data-checked:bg-neutral-200 dark:data-checked:text-neutral-900`}
        >
          {T['HeroSearchForm']['Different drop off']}
        </Radio>
        <Radio
          value="same"
          className={`flex cursor-pointer items-center rounded-full border border-neutral-300 px-4 py-1.5 text-xs font-medium dark:border-neutral-700 data-checked:bg-black data-checked:text-white data-checked:shadow-lg data-checked:shadow-black/10 dark:data-checked:bg-neutral-200 dark:data-checked:text-neutral-900`}
        >
          {T['HeroSearchForm']['Same drop off']}
        </Radio>
      </RadioGroup>

      {/*  */}
      <div className="relative flex">
        <LocationInputField
          placeholder={T['HeroSearchForm']['City or Airport']}
          description={T['HeroSearchForm']['Pick up location']}
          className="hero-search-form__field-after flex-1"
          inputName="pickup-location"
          fieldStyle={formStyle}
        />
        {isDdropOffdifferent && (
          <>
            <VerticalDividerLine />
            <LocationInputField
              placeholder={T['HeroSearchForm']['City or Airport']}
              description={T['HeroSearchForm']['Drop off location']}
              className="hero-search-form__field-before hero-search-form__field-after flex-1"
              inputName="dropoff-location"
              fieldStyle={formStyle}
            />
          </>
        )}
        <VerticalDividerLine />
        <DateRangeField
          className="hero-search-form__field-before flex-1"
          description={T['HeroSearchForm']['Pick up - Drop off']}
          clearDataButtonClassName={clsx(formStyle === 'small' && 'sm:end-18', formStyle === 'default' && 'sm:end-22')}
          fieldStyle={formStyle}
        />

        <ButtonSubmit fieldStyle={formStyle} />
      </div>
    </Form>
  )
}
