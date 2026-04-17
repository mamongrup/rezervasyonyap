'use client'

import { formDataToStringRecord, runHeroSearchPlanEffects } from '@/lib/hero-search-plan'
import { GuestsObject } from '@/type'
import converSelectedDateToString from '@/utils/converSelectedDateToString'
import { getMessages } from '@/utils/getT'
import Form from 'next/form'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import DatesRangeInput from '../DatesRangeInput'
import FieldPanelContainer from '../FieldPanelContainer'
import GuestsInput from '../GuestsInput'
import LocationInput from '../LocationInput'

const ExperienceSearchFormMobile = () => {
  //
  const [fieldNameShow, setFieldNameShow] = useState<'location' | 'dates' | 'guests'>('location')
  //
  const [locationInputTo, setLocationInputTo] = useState('')
  const [guestInput, setGuestInput] = useState<GuestsObject>({
    guestAdults: 2,
    guestChildren: 0,
    guestInfants: 0,
  })
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const router = useRouter()
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const m = getMessages(locale)

  const onChangeDate = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates
    setStartDate(start)
    setEndDate(end)
  }
  const handleFormSubmit = (formData: FormData) => {
    const formDataEntries = Object.fromEntries(formData.entries())
    const params = {
      ...formDataToStringRecord(formData),
      date_range_label:
        startDate && endDate ? converSelectedDateToString([startDate, endDate]) : '',
      guestAdults: String(guestInput.guestAdults),
      guestChildren: String(guestInput.guestChildren),
      guestInfants: String(guestInput.guestInfants),
    }
    runHeroSearchPlanEffects('experience', params, '/turlar/all')
    const location = formDataEntries['location'] as string
    const qs = new URLSearchParams()
    if (location) qs.set('location', location)
    if (params.guestAdults) qs.set('guests', params.guestAdults)
    const qstr = qs.toString()
    router.push('/turlar/all' + (qstr ? `?${qstr}` : ''))
  }

  //
  const totalGuests = (guestInput.guestAdults || 0) + (guestInput.guestChildren || 0) + (guestInput.guestInfants || 0)
  const guestStringConverted = totalGuests
    ? `${totalGuests} ${m.HeroSearchForm['Guests']}`
    : m.HeroSearchForm['Add guests']
  return (
    <Form id="form-hero-search-form-mobile" action={handleFormSubmit} className="flex w-full flex-col gap-y-3">
      {/*  LOCATION */}
      <FieldPanelContainer
        isActive={fieldNameShow === 'location'}
        headingOnClick={() => setFieldNameShow('location')}
        headingTitle={m.HeroSearchForm['Where']}
        headingValue={locationInputTo || m.HeroSearchForm['Location']}
      >
        <LocationInput
          defaultValue={locationInputTo}
          onChange={(value) => {
            setLocationInputTo(value)
            setFieldNameShow('dates')
          }}
        />
      </FieldPanelContainer>

      {/* DATE RANGE  */}
      <FieldPanelContainer
        isActive={fieldNameShow === 'dates'}
        headingOnClick={() => setFieldNameShow('dates')}
        headingTitle={m.HeroSearchForm['When']}
        headingValue={startDate ? converSelectedDateToString([startDate, endDate]) : m.HeroSearchForm['Add dates']}
      >
        <DatesRangeInput defaultStartDate={startDate} defaultEndDate={endDate} onChange={onChangeDate} />
      </FieldPanelContainer>

      {/* GUEST NUMBER */}
      <FieldPanelContainer
        isActive={fieldNameShow === 'guests'}
        headingOnClick={() => setFieldNameShow('guests')}
        headingTitle={m.HeroSearchForm['Who']}
        headingValue={guestStringConverted}
      >
        <GuestsInput defaultValue={guestInput} onChange={setGuestInput} />
      </FieldPanelContainer>
    </Form>
  )
}

export default ExperienceSearchFormMobile
