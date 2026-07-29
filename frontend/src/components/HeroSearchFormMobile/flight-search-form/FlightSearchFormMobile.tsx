'use client'

import { DEFAULT_GUESTS_STAY, totalGuestCount } from '@/lib/guest-search-defaults'
import { formDataToStringRecord, runHeroSearchPlanEffects } from '@/lib/hero-search-plan'
import { heroSearchResultsPathFromRestPath } from '@/lib/hero-search-target'
import { stripLocalePrefix } from '@/lib/i18n-config'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { GuestsObject } from '@/type'
import converSelectedDateToString from '@/utils/converSelectedDateToString'
import { formatLocalYmd } from '@/utils/format-local-ymd'
import { getMessages } from '@/utils/getT'
import { Field, Radio, RadioGroup } from '@headlessui/react'
import Form from 'next/form'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import DatesRangeInput from '../DatesRangeInput'
import FieldPanelContainer from '../FieldPanelContainer'
import GuestsInput from '../GuestsInput'
import LocationInput from '../LocationInput'

const tripTypes = ['Round-trip', 'One-way'] as const
const flightClasses = ['Economy', 'Business', 'Multiple'] as const

type TripKey = (typeof tripTypes)[number]
type ClassKey = (typeof flightClasses)[number]

type Props = { searchTargetPath?: string }

const FlightSearchFormMobile = ({ searchTargetPath: searchTargetPathProp }: Props) => {
  const [fieldNameShow, setFieldNameShow] = useState<
    'locationPickup' | 'locationDropoff' | 'dates' | 'guests' | 'general'
  >('locationPickup')
  const [locationInputPickUp, setLocationInputPickUp] = useState('')
  const [locationInputDropOff, setLocationInputDropOff] = useState('')
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [tripType, setTripType] = useState<TripKey>(tripTypes[0])
  const [flightClassState, setFlightClassState] = useState<ClassKey>(flightClasses[0])
  const [guestInput, setGuestInput] = useState<GuestsObject>({ ...DEFAULT_GUESTS_STAY })
  const router = useRouter()
  const pathname = usePathname()
  const vitrinHref = useVitrinHref()
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const m = getMessages(locale)

  const searchTargetPath = useMemo(() => {
    if (searchTargetPathProp?.trim()) return searchTargetPathProp.trim()
    const { restPath } = stripLocalePrefix(pathname ?? '/')
    return heroSearchResultsPathFromRestPath(restPath)
  }, [pathname, searchTargetPathProp])

  const handleFormSubmit = (formData: FormData) => {
    const formDataEntries = Object.fromEntries(formData.entries())
    const totalG = totalGuestCount(guestInput)
    const tripApi = tripType === 'One-way' ? 'oneWay' : 'roundTrip'
    const planParams = {
      ...formDataToStringRecord(formData),
      'flying-from-location': locationInputPickUp,
      'flying-to-location': locationInputDropOff,
      trip_type: tripApi,
      flight_class: flightClassState,
      date_range_label:
        startDate && endDate ? converSelectedDateToString([startDate, endDate]) : '',
      guestAdults: String(guestInput.guestAdults),
      guestChildren: String(guestInput.guestChildren),
      guestInfants: String(guestInput.guestInfants),
      guests_total: String(totalG),
      checkin: startDate ? formatLocalYmd(startDate) : '',
      checkout: endDate ? formatLocalYmd(endDate) : '',
    }
    runHeroSearchPlanEffects('flight', planParams, searchTargetPath)
    const qs = new URLSearchParams()
    if (locationInputPickUp) qs.set('from', locationInputPickUp)
    if (locationInputDropOff) qs.set('to', locationInputDropOff)
    if (startDate) qs.set('date', formatLocalYmd(startDate))
    if (tripApi === 'roundTrip' && endDate) qs.set('checkout', formatLocalYmd(endDate))
    if (totalG > 0) qs.set('guests', String(totalG))
    qs.set('trip', tripApi)
    qs.set('class', flightClassState)
    const qstr = qs.toString()
    router.push(vitrinHref(searchTargetPath) + (qstr ? `?${qstr}` : ''))
  }

  const onChangeDate = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates
    setStartDate(start)
    setEndDate(end)
  }

  return (
    <Form id="form-hero-search-form-mobile" action={handleFormSubmit} className="flex w-full flex-col gap-y-3">
      <FieldPanelContainer
        isActive={fieldNameShow === 'locationPickup'}
        headingOnClick={() => setFieldNameShow('locationPickup')}
        headingTitle={m.HeroSearchForm['Flying from']}
        headingValue={locationInputPickUp || m.HeroSearchForm['Location']}
      >
        <LocationInput
          headingText={m.HeroSearchForm['Flying from']}
          imputName="flying-from-location"
          defaultValue={locationInputPickUp}
          onChange={(value) => {
            setLocationInputPickUp(value)
            setFieldNameShow('locationDropoff')
          }}
        />
      </FieldPanelContainer>

      <FieldPanelContainer
        isActive={fieldNameShow === 'locationDropoff'}
        headingOnClick={() => setFieldNameShow('locationDropoff')}
        headingTitle={m.HeroSearchForm['Flying to']}
        headingValue={locationInputDropOff || m.HeroSearchForm['Location']}
      >
        <LocationInput
          headingText={m.HeroSearchForm['Flying to']}
          imputName="flying-to-location"
          defaultValue={locationInputDropOff}
          onChange={(value) => {
            setLocationInputDropOff(value)
            setFieldNameShow('dates')
          }}
        />
      </FieldPanelContainer>

      <FieldPanelContainer
        isActive={fieldNameShow === 'general'}
        headingOnClick={() => setFieldNameShow('general')}
        headingTitle={m.HeroSearchForm['Flight type?']}
        headingValue={`${m.HeroSearchForm[tripType]}, ${m.HeroSearchForm[flightClassState]}`}
      >
        <p className="block text-xl font-semibold sm:text-2xl">{m.HeroSearchForm['Flight type?']}</p>
        <div className="relative mt-5">
          <RadioGroup
            value={tripType}
            onChange={setTripType}
            aria-label={m.HeroSearchForm['Flight trip type']}
            name="trip-type"
            className="flex flex-wrap items-center gap-2.5"
          >
            {tripTypes.map((tab) => (
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
                    {m.HeroSearchForm[tab]}
                  </Radio>
                </Field>
              ))}
            </RadioGroup>
          </div>
        </div>
      </FieldPanelContainer>

      <FieldPanelContainer
        isActive={fieldNameShow === 'dates'}
        headingOnClick={() => setFieldNameShow('dates')}
        headingTitle={m.HeroSearchForm['When']}
        headingValue={startDate ? converSelectedDateToString([startDate, endDate]) : m.HeroSearchForm['Add dates']}
      >
        <DatesRangeInput onChange={onChangeDate} defaultStartDate={startDate} defaultEndDate={endDate} />
      </FieldPanelContainer>

      <FieldPanelContainer
        isActive={fieldNameShow === 'guests'}
        headingOnClick={() => setFieldNameShow('guests')}
        headingTitle={m.HeroSearchForm['Who']}
        headingValue={
          totalGuestCount(guestInput)
            ? `${totalGuestCount(guestInput)} ${m.HeroSearchForm['Guests']}`
            : m.HeroSearchForm['Add guests']
        }
      >
        <GuestsInput defaultValue={guestInput} onChange={setGuestInput} />
      </FieldPanelContainer>
    </Form>
  )
}

export default FlightSearchFormMobile
