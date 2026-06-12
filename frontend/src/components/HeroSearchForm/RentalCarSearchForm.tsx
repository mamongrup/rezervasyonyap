'use client'

import { ensureCarRentalCheckout } from '@/lib/yolcu360-cars'
import { normalizeYolcu360PickupQuery } from '@/lib/yolcu360-location-query'
import { formDataToStringRecord, runHeroSearchPlanEffects } from '@/lib/hero-search-plan'
import { useAppLocale } from '@/hooks/useAppLocale'
import { Radio, RadioGroup } from '@headlessui/react'
import clsx from 'clsx'
import Form from 'next/form'
import { useRouter, useSearchParams } from 'next/navigation'
import { FC, Suspense, useEffect, useMemo, useState } from 'react'
import { HeroSearchFormSkeleton } from './HeroSearchFormSkeleton'
import { ButtonSubmit, DateRangeField, LocationInputField, VerticalDividerLine } from './ui'

interface Props {
  className?: string
  formStyle: 'default' | 'small'
}

const RentalCarSearchFormInner: FC<Props> = ({ className, formStyle = 'default' }) => {
  const { messages } = useAppLocale()
  const hf = messages.HeroSearchForm
  const searchParams = useSearchParams()
  const urlPickup = searchParams.get('location') ?? ''
  const urlDropoff = searchParams.get('drop_off_location') ?? ''
  const urlCheckin = searchParams.get('checkin') ?? ''
  const urlCheckoutRaw = searchParams.get('checkout') ?? ''
  const urlDropOff = searchParams.get('drop_off')

  const defaultCheckout = useMemo(
    () => ensureCarRentalCheckout(urlCheckin, urlCheckoutRaw) || undefined,
    [urlCheckin, urlCheckoutRaw],
  )

  const [dropOffLocationType, setDropOffLocationType] = useState<'same' | 'different'>(() =>
    urlDropOff === 'different' ? 'different' : 'same',
  )

  const router = useRouter()

  useEffect(() => {
    router.prefetch('/arac-kiralama/all')
  }, [router])

  useEffect(() => {
    setDropOffLocationType(urlDropOff === 'different' ? 'different' : 'same')
  }, [urlDropOff])

  const handleFormSubmit = (formData: FormData) => {
    const formDataEntries = Object.fromEntries(formData.entries())
    const params = { ...formDataToStringRecord(formData), drop_off_mode: dropOffLocationType }
    runHeroSearchPlanEffects('car', params, '/arac-kiralama/all')
    const location = normalizeYolcu360PickupQuery(
      formDataEntries['pickup-location'] as string | undefined,
    )
    const dropoffLocation = normalizeYolcu360PickupQuery(
      formDataEntries['dropoff-location'] as string | undefined,
    )
    const checkin = formDataEntries['checkin'] as string
    const checkout = ensureCarRentalCheckout(
      checkin,
      formDataEntries['checkout'] as string,
    )
    const nextParams = new URLSearchParams()
    if (location) nextParams.set('location', location)
    if (dropOffLocationType === 'different' && dropoffLocation) {
      nextParams.set('drop_off_location', dropoffLocation)
    }
    if (checkin) nextParams.set('checkin', checkin)
    if (checkout) nextParams.set('checkout', checkout)
    nextParams.set('drop_off', dropOffLocationType)
    const qs = nextParams.toString()
    router.push('/arac-kiralama/all' + (qs ? `?${qs}` : ''))
  }

  const isDdropOffdifferent = dropOffLocationType === 'different'
  return (
    <Form
      className={clsx(
        'relative isolate z-[100] w-full overflow-visible bg-white [--form-bg:var(--color-white)] dark:bg-neutral-800 dark:[--form-bg:var(--color-neutral-800)]',
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
          {hf['Different drop off']}
        </Radio>
        <Radio
          value="same"
          className={`flex cursor-pointer items-center rounded-full border border-neutral-300 px-4 py-1.5 text-xs font-medium dark:border-neutral-700 data-checked:bg-black data-checked:text-white data-checked:shadow-lg data-checked:shadow-black/10 dark:data-checked:bg-neutral-200 dark:data-checked:text-neutral-900`}
        >
          {hf['Same drop off']}
        </Radio>
      </RadioGroup>

      {/*  */}
      <div className="relative isolate z-[100] flex overflow-visible">
        <LocationInputField
          placeholder={hf['City or Airport']}
          description={hf['Pick up location']}
          className="hero-search-form__field-after flex-1"
          inputName="pickup-location"
          fieldStyle={formStyle}
          locationSearchType="car"
          defaultName={urlPickup}
        />
        {isDdropOffdifferent && (
          <>
            <VerticalDividerLine />
            <LocationInputField
              placeholder={hf['City or Airport']}
              description={hf['Drop off location']}
              className="hero-search-form__field-before hero-search-form__field-after flex-1"
              inputName="dropoff-location"
              fieldStyle={formStyle}
              locationSearchType="car"
              defaultName={urlDropoff}
            />
          </>
        )}
        <VerticalDividerLine />
        <DateRangeField
          className="hero-search-form__field-before flex-1"
          description={hf['Pick up - Drop off']}
          clearDataButtonClassName={clsx(formStyle === 'small' && 'sm:end-18', formStyle === 'default' && 'sm:end-22')}
          fieldStyle={formStyle}
          defaultStartDate={urlCheckin || undefined}
          defaultEndDate={defaultCheckout}
        />

        <ButtonSubmit fieldStyle={formStyle} />
      </div>
    </Form>
  )
}

export const RentalCarSearchForm: FC<Props> = (props) => (
  <Suspense fallback={<HeroSearchFormSkeleton />}>
    <RentalCarSearchFormInner {...props} />
  </Suspense>
)
