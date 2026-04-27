'use client'

import { formDataToStringRecord, runHeroSearchPlanEffects } from '@/lib/hero-search-plan'
import { GuestsObject } from '@/type'
import converSelectedDateToString from '@/utils/converSelectedDateToString'
import { getMessages } from '@/utils/getT'
import { Field, Radio, RadioGroup } from '@headlessui/react'
import Form from 'next/form'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import DatesRangeInput from '../DatesRangeInput'
import FieldPanelContainer from '../FieldPanelContainer'
import GuestsInput from '../GuestsInput'
import LocationInput from '../LocationInput'

const dropOffLocationTypes = ['Round-trip', 'One-way'] as const
const flightClasses = ['Economy', 'Business', 'Multiple'] as const

type TripKey = (typeof dropOffLocationTypes)[number]
type ClassKey = (typeof flightClasses)[number]

const FlightSearchFormMobile = () => {
  //
  const [fieldNameShow, setFieldNameShow] = useState<
    'locationPickup' | 'locationDropoff' | 'dates' | 'guests' | 'general'
  >('locationPickup')
  //
  const [locationInputPickUp, setLocationInputPickUp] = useState('')
  const [locationInputDropOff, setLocationInputDropOff] = useState('')
  const [startDate, setStartDate] = useState<Date | null>(new Date('2023/02/06'))
  const [endDate, setEndDate] = useState<Date | null>(new Date('2023/02/23'))

  const [dropOffLocationType, setDropOffLocationType] = useState(dropOffLocationTypes[0])
  const [flightClassState, setFlightClassState] = useState(flightClasses[0])

  const [guestInput, setGuestInput] = useState<GuestsObject>({
    guestAdults: 2,
    guestChildren: 0,
    guestInfants: 0,
  })
  const router = useRouter()
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const m = getMessages(locale)

  const handleFormSubmit = (formData: FormData) => {
    const formDataEntries = Object.fromEntries(formData.entries())
    const totalG =
      (guestInput.guestAdults || 0) + (guestInput.guestChildren || 0) + (guestInput.guestInfants || 0)
    const params = {
      ...formDataToStringRecord(formData),
      trip_type: dropOffLocationType,
      flight_class: flightClassState,
      date_range_label:
        startDate && endDate ? converSelectedDateToString([startDate, endDate]) : '',
      guestAdults: String(guestInput.guestAdults),
      guestChildren: String(guestInput.guestChildren),
      guestInfants: String(guestInput.guestInfants),
      guests_total: String(totalG),
    }
    runHeroSearchPlanEffects('flight', params, '/ucak-bileti/all')
    const from = formDataEntries['locationPickup'] as string
    const qs = new URLSearchParams()
    if (from) qs.set('from', from)
    if (params.guestAdults) qs.set('guests', params.guestAdults)
    const qstr = qs.toString()
    router.push('/ucak-bileti/all' + (qstr ? `?${qstr}` : ''))
  }

  const onChangeDate = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates
    setStartDate(start)
    setEndDate(end)
  }

  const renderInputLocationPickup = () => {
    return (
      <FieldPanelContainer
        isActive={fieldNameShow === 'locationPickup'}
        headingOnClick={() => setFieldNameShow('locationPickup')}
        headingTitle={m.HeroSearchForm['Pick up']}
        headingValue={locationInputPickUp || m.HeroSearchForm['Location']}
      >
        <LocationInput
          headingText={m.HeroSearchForm['Pick up'] + '?'}
          imputName="locationPickup"
          defaultValue={locationInputPickUp}
          onChange={(value) => {
            setLocationInputPickUp(value)
            setFieldNameShow('dates')
          }}
        />
      </FieldPanelContainer>
    )
  }

  const renderInputLocationDropOff = () => {
    return (
      <FieldPanelContainer
        isActive={fieldNameShow === 'locationDropoff'}
        headingOnClick={() => setFieldNameShow('locationDropoff')}
        headingTitle={m.HeroSearchForm['Drop off']}
        headingValue={locationInputDropOff || m.HeroSearchForm['Location']}
      >
        <LocationInput
          headingText={m.HeroSearchForm['Drop off'] + '?'}
          imputName="locationDropOff"
          defaultValue={locationInputDropOff}
          onChange={(value) => {
            setLocationInputDropOff(value)
            setFieldNameShow('dates')
          }}
        />
      </FieldPanelContainer>
    )
  }

  const renderInputDates = () => {
    return (
      <FieldPanelContainer
        isActive={fieldNameShow === 'dates'}
        headingOnClick={() => setFieldNameShow('dates')}
        headingTitle={m.HeroSearchForm['When']}
        headingValue={startDate ? converSelectedDateToString([startDate, endDate]) : m.HeroSearchForm['Add dates']}
      >
        <DatesRangeInput onChange={onChangeDate} />
      </FieldPanelContainer>
    )
  }

  const renderGenerals = () => {
    return (
      <FieldPanelContainer
        isActive={fieldNameShow === 'general'}
        headingOnClick={() => setFieldNameShow('general')}
        headingTitle={m.HeroSearchForm['Flight type?']}
        headingValue={`${m.HeroSearchForm[dropOffLocationType as TripKey]}, ${m.HeroSearchForm[flightClassState as ClassKey]}`}
      >
        <p className="block text-xl font-semibold sm:text-2xl">{m.HeroSearchForm['Flight type?']}</p>
        <div className="relative mt-5">
          <RadioGroup
            value={dropOffLocationType}
            onChange={setDropOffLocationType}
            aria-label={m.HeroSearchForm['Flight trip type']}
            name="dropOffLocationType"
            className="flex flex-wrap items-center gap-2.5"
          >
            {dropOffLocationTypes.map((tab) => (
              <Field key={tab}>
                <Radio
                  value={tab}
                  className={`flex cursor-pointer items-center rounded-full border border-neutral-300 px-4 py-1.5 text-xs font-medium data-checked:bg-black data-checked:text-white data-checked:shadow-lg data-checked:shadow-black/10 dark:border-neutral-700 dark:data-checked:bg-neutral-200 dark:data-checked:text-neutral-900`}
                >
                  {m.HeroSearchForm[tab]}
                </Radio>
              </Field>
            ))}
          </RadioGroup>

          <div className="mt-6">
            <p className="text-base font-semibold">{m.HeroSearchForm['Ticket Class']}</p>
            <RadioGroup
              value={flightClassState}
              onChange={setFlightClassState}
              aria-label={m.HeroSearchForm['Ticket Class']}
              name="flightClasses"
              className="mt-4 flex flex-wrap items-center gap-2.5"
            >
              {flightClasses.map((tab) => (
                <Field key={tab}>
                  <Radio
                    value={tab}
                    className={`flex cursor-pointer items-center rounded-full border border-neutral-300 px-4 py-1.5 text-xs font-medium data-checked:bg-black data-checked:text-white data-checked:shadow-lg data-checked:shadow-black/10 dark:border-neutral-700 dark:data-checked:bg-neutral-200 dark:data-checked:text-neutral-900`}
                  >
                    {m.HeroSearchForm[tab as ClassKey]}
                  </Radio>
                </Field>
              ))}
            </RadioGroup>
          </div>
        </div>
      </FieldPanelContainer>
    )
  }

  const renderInputGuests = () => {
    const isActive = fieldNameShow === 'guests'
    const totalGuests = (guestInput.guestAdults || 0) + (guestInput.guestChildren || 0) + (guestInput.guestInfants || 0)
    const guestStringConverted = totalGuests
      ? `${totalGuests} ${m.HeroSearchForm['Guests']}`
      : m.HeroSearchForm['Add guests']

    return (
      <FieldPanelContainer
        isActive={isActive}
        headingOnClick={() => setFieldNameShow('guests')}
        headingTitle={m.HeroSearchForm['Who']}
        headingValue={guestStringConverted}
      >
        <GuestsInput defaultValue={guestInput} onChange={setGuestInput} />
      </FieldPanelContainer>
    )
  }

  return (
    <Form id="form-hero-search-form-mobile" action={handleFormSubmit} className="flex w-full flex-col gap-y-3">
      {renderInputLocationPickup()}
      {/*  */}
      {renderInputLocationDropOff()}
      {/*  */}
      {renderGenerals()}
      {/*  */}
      {renderInputDates()}
      {/*  */}
      {renderInputGuests()}
    </Form>
  )
}

export default FlightSearchFormMobile
