'use client'

import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { DEFAULT_GUESTS_STAY, totalGuestCount } from '@/lib/guest-search-defaults'
import { formDataToStringRecord, runHeroSearchPlanEffects } from '@/lib/hero-search-plan'
import { GuestsObject } from '@/type'
import converSelectedDateToString from '@/utils/converSelectedDateToString'
import { getMessages } from '@/utils/getT'
import Form from 'next/form'
import dynamic from 'next/dynamic'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import FieldPanelContainer from '../FieldPanelContainer'
import GuestsInput from '../GuestsInput'
import LocationInput from '../LocationInput'

const STAY_SEARCH_INTERNAL_PATH = '/oteller/all'
const DatesRangeInput = dynamic(() => import('../DatesRangeInput'), {
  ssr: false,
  loading: () => <div className="h-72 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-700/60" />,
})

const StaySearchFormMobile = () => {
  const vitrinHref = useVitrinHref()
  const staySearchHref = vitrinHref(STAY_SEARCH_INTERNAL_PATH)
  //
  const [fieldNameShow, setFieldNameShow] = useState<'location' | 'dates' | 'guests'>('location')
  const locationPanelRef = useRef<HTMLDivElement>(null)
  const datesPanelRef = useRef<HTMLDivElement>(null)
  const guestsPanelRef = useRef<HTMLDivElement>(null)
  //
  const [locationInputTo, setLocationInputTo] = useState('')
  const [guestInput, setGuestInput] = useState<GuestsObject>({ ...DEFAULT_GUESTS_STAY })
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const router = useRouter()
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const m = getMessages(locale)

  useEffect(() => {
    const activePanel =
      fieldNameShow === 'location'
        ? locationPanelRef.current
        : fieldNameShow === 'dates'
          ? datesPanelRef.current
          : guestsPanelRef.current
    requestAnimationFrame(() => {
      activePanel?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    })
  }, [fieldNameShow])

  const onChangeDate = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates
    setStartDate(start)
    setEndDate(end)
  }
  const handleFormSubmit = (formData: FormData) => {
    const formDataEntries = Object.fromEntries(formData.entries())
    const params: Record<string, string> = {
      ...formDataToStringRecord(formData),
      date_range_label:
        startDate && endDate ? converSelectedDateToString([startDate, endDate]) : '',
      guestAdults: String(guestInput.guestAdults),
      guestChildren: String(guestInput.guestChildren),
      guestInfants: String(guestInput.guestInfants),
    }
    runHeroSearchPlanEffects('stay', params, STAY_SEARCH_INTERNAL_PATH)
    const location = formDataEntries['location'] as string
    const qs = new URLSearchParams()
    if (location) qs.set('location', location)
    if (params.checkin) qs.set('checkin', params.checkin)
    if (params.checkout) qs.set('checkout', params.checkout)
    if (params.guestAdults) qs.set('guests', params.guestAdults)
    const qstr = qs.toString()
    router.push(staySearchHref + (qstr ? `?${qstr}` : ''))
  }

  //
  const totalGuests = totalGuestCount(guestInput)
  const guestStringConverted = totalGuests
    ? `${totalGuests} ${m.HeroSearchForm['Guests']}`
    : m.HeroSearchForm['Add guests']

  return (
    <Form
      id="form-hero-search-form-mobile"
      action={handleFormSubmit}
      className="flex w-full min-w-0 max-w-full flex-col gap-y-3"
    >
      {/*  LOCATION */}
      <div ref={locationPanelRef}>
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
      </div>

      {/* DATE RANGE  */}
      <div ref={datesPanelRef}>
        <FieldPanelContainer
          isActive={fieldNameShow === 'dates'}
          headingOnClick={() => setFieldNameShow('dates')}
          headingTitle={m.HeroSearchForm['When']}
          headingValue={startDate ? converSelectedDateToString([startDate, endDate]) : m.HeroSearchForm['Add dates']}
        >
          <DatesRangeInput defaultStartDate={startDate} defaultEndDate={endDate} onChange={onChangeDate} />
        </FieldPanelContainer>
      </div>

      {/* GUEST NUMBER */}
      <div ref={guestsPanelRef}>
        <FieldPanelContainer
          isActive={fieldNameShow === 'guests'}
          headingOnClick={() => setFieldNameShow('guests')}
          headingTitle={m.HeroSearchForm['Who']}
          headingValue={guestStringConverted}
        >
          <GuestsInput defaultValue={guestInput} onChange={setGuestInput} />
        </FieldPanelContainer>
      </div>
    </Form>
  )
}

export default StaySearchFormMobile
