'use client'

import { formDataToStringRecord, runHeroSearchPlanEffects } from '@/lib/hero-search-plan'
import converSelectedDateToString from '@/utils/converSelectedDateToString'
import { getMessages } from '@/utils/getT'
import { Radio, RadioGroup } from '@headlessui/react'
import Form from 'next/form'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import DatesRangeInput from '../DatesRangeInput'
import FieldPanelContainer from '../FieldPanelContainer'
import LocationInput from '../LocationInput'

const CarSearchFormMobile = () => {
  //
  const [fieldNameShow, setFieldNameShow] = useState<'locationPickup' | 'locationDropoff' | 'dates'>('locationPickup')
  //
  const [locationInputPickUp, setLocationInputPickUp] = useState('')
  const [locationInputDropOff, setLocationInputDropOff] = useState('')
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [dropOffLocationType, setDropOffLocationType] = useState<'same' | 'different'>('different')
  const router = useRouter()
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const m = getMessages(locale)
  const mobileCar = m.mobile.car

  const onChangeDate = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates
    setStartDate(start)
    setEndDate(end)
  }

  const handleFormSubmit = (formData: FormData) => {
    const formDataEntries = Object.fromEntries(formData.entries())
    const params: Record<string, string> = {
      ...formDataToStringRecord(formData),
      drop_off_mode: dropOffLocationType,
      date_range_label:
        startDate && endDate ? converSelectedDateToString([startDate, endDate]) : '',
    }
    runHeroSearchPlanEffects('car', params, '/arac-kiralama/all')
    const location = formDataEntries['pickup-location'] as string
    const qs = new URLSearchParams()
    if (location) qs.set('location', location)
    if (params.checkin) qs.set('checkin', params.checkin)
    if (params.checkout) qs.set('checkout', params.checkout)
    qs.set('drop_off', dropOffLocationType)
    const qstr = qs.toString()
    router.push('/arac-kiralama/all' + (qstr ? `?${qstr}` : ''))
  }

  return (
    <Form id="form-hero-search-form-mobile" action={handleFormSubmit} className="flex w-full flex-col gap-y-3">
      {/* RADIO */}
      <RadioGroup
        value={dropOffLocationType}
        onChange={setDropOffLocationType}
        aria-label={mobileCar.dropOffLocationAria}
        name="drop_off_location_type"
        className={'flex flex-wrap items-center justify-center gap-2.5 py-1'}
      >
        <Radio
          value="different"
          className={`flex cursor-pointer items-center rounded-full border border-neutral-300 px-4 py-1.5 text-xs font-medium data-checked:bg-black data-checked:text-white data-checked:shadow-lg data-checked:shadow-black/10 dark:border-neutral-700 dark:data-checked:bg-neutral-200 dark:data-checked:text-neutral-900`}
        >
          {m.HeroSearchForm['Different drop off']}
        </Radio>
        <Radio
          value="same"
          className={`flex cursor-pointer items-center rounded-full border border-neutral-300 px-4 py-1.5 text-xs font-medium data-checked:bg-black data-checked:text-white data-checked:shadow-lg data-checked:shadow-black/10 dark:border-neutral-700 dark:data-checked:bg-neutral-200 dark:data-checked:text-neutral-900`}
        >
          {m.HeroSearchForm['Same drop off']}
        </Radio>
      </RadioGroup>

      {/*  */}
      <FieldPanelContainer
        isActive={fieldNameShow === 'locationPickup'}
        headingOnClick={() => setFieldNameShow('locationPickup')}
        headingTitle={m.HeroSearchForm['Pick up']}
        headingValue={locationInputPickUp || m.HeroSearchForm['Location']}
      >
        <LocationInput
          headingText={m.HeroSearchForm['Pick up'] + '?'}
          imputName="pickup-location"
          defaultValue={locationInputPickUp}
          onChange={(value) => {
            setLocationInputPickUp(value)
            if (dropOffLocationType === 'different') {
              setFieldNameShow('locationDropoff')
            } else {
              setFieldNameShow('dates')
            }
          }}
        />
      </FieldPanelContainer>

      {/*  */}
      {dropOffLocationType === 'different' && (
        <FieldPanelContainer
          isActive={fieldNameShow === 'locationDropoff'}
          headingOnClick={() => setFieldNameShow('locationDropoff')}
          headingTitle={m.HeroSearchForm['Drop off']}
          headingValue={locationInputDropOff || m.HeroSearchForm['Location']}
        >
          <LocationInput
            headingText={m.HeroSearchForm['Drop off'] + '?'}
            imputName="dropoff-location"
            defaultValue={locationInputDropOff}
            onChange={(value) => {
              setLocationInputDropOff(value)
              setFieldNameShow('dates')
            }}
          />
        </FieldPanelContainer>
      )}

      {/* DATE RANGE  */}
      <FieldPanelContainer
        isActive={fieldNameShow === 'dates'}
        headingOnClick={() => setFieldNameShow('dates')}
        headingTitle={m.HeroSearchForm['When']}
        headingValue={startDate ? converSelectedDateToString([startDate, endDate]) : m.HeroSearchForm['Add dates']}
      >
        <DatesRangeInput onChange={onChangeDate} />
      </FieldPanelContainer>
      {/*  */}
    </Form>
  )
}

export default CarSearchFormMobile
