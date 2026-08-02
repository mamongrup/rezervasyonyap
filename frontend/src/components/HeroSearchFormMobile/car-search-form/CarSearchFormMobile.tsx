'use client'

import { ensureCarRentalCheckout } from '@/lib/yolcu360-cars'
import { normalizeYolcu360PickupQuery } from '@/lib/yolcu360-location-query'
import { formDataToStringRecord, runHeroSearchPlanEffects } from '@/lib/hero-search-plan'
import { withSearchResultsAnchor } from '@/lib/search-results-anchor'
import { heroSearchResultsPathFromRestPath } from '@/lib/hero-search-target'
import { stripLocalePrefix } from '@/lib/i18n-config'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import converSelectedDateToString from '@/utils/converSelectedDateToString'
import { parseLocalYmd } from '@/utils/format-local-ymd'
import { getMessages } from '@/utils/getT'
import { Radio, RadioGroup } from '@headlessui/react'
import Form from 'next/form'
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useState } from 'react'
import DatesRangeInput from '../DatesRangeInput'
import FieldPanelContainer from '../FieldPanelContainer'
import LocationInput from '../LocationInput'

type Props = { searchTargetPath?: string }

function CarSearchFormMobileInner({ searchTargetPath: searchTargetPathProp }: Props) {
  const [fieldNameShow, setFieldNameShow] = useState<'locationPickup' | 'locationDropoff' | 'dates'>('locationPickup')

  const searchParams = useSearchParams()
  const pathname = usePathname()
  const vitrinHref = useVitrinHref()
  const urlPickup = searchParams.get('location') ?? ''
  const urlDropoff = searchParams.get('drop_off_location') ?? ''
  const urlCheckin = searchParams.get('checkin') ?? ''
  const urlCheckoutRaw = searchParams.get('checkout') ?? ''
  const urlDropOff = searchParams.get('drop_off')

  const searchTargetPath = useMemo(() => {
    if (searchTargetPathProp?.trim()) return searchTargetPathProp.trim()
    const { restPath } = stripLocalePrefix(pathname ?? '/')
    return heroSearchResultsPathFromRestPath(restPath)
  }, [pathname, searchTargetPathProp])

  const defaultCheckout = useMemo(
    () => ensureCarRentalCheckout(urlCheckin, urlCheckoutRaw) || undefined,
    [urlCheckin, urlCheckoutRaw],
  )
  const defaultStartDate = useMemo(() => parseLocalYmd(urlCheckin), [urlCheckin])
  const defaultEndDate = useMemo(() => parseLocalYmd(defaultCheckout), [defaultCheckout])

  const [locationInputPickUp, setLocationInputPickUp] = useState(urlPickup)
  const [locationInputDropOff, setLocationInputDropOff] = useState(urlDropoff)
  const [startDate, setStartDate] = useState<Date | null>(defaultStartDate)
  const [endDate, setEndDate] = useState<Date | null>(defaultEndDate)
  const [dropOffLocationType, setDropOffLocationType] = useState<'same' | 'different'>(() =>
    urlDropOff === 'different' ? 'different' : 'same',
  )
  const router = useRouter()
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const m = getMessages(locale)
  const mobileCar = m.mobile.car

  useEffect(() => {
    setLocationInputPickUp(urlPickup)
  }, [urlPickup])

  useEffect(() => {
    setLocationInputDropOff(urlDropoff)
  }, [urlDropoff])

  useEffect(() => {
    setStartDate(defaultStartDate)
    setEndDate(defaultEndDate)
  }, [defaultStartDate, defaultEndDate])

  useEffect(() => {
    setDropOffLocationType(urlDropOff === 'different' ? 'different' : 'same')
  }, [urlDropOff])

  const onChangeDate = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates
    setStartDate(start)
    setEndDate(end)
  }

  const handleFormSubmit = (formData: FormData) => {
    const formDataEntries = Object.fromEntries(formData.entries())
    const checkin = formDataEntries['checkin'] as string
    const checkout = ensureCarRentalCheckout(checkin, formDataEntries['checkout'] as string)
    const params: Record<string, string> = {
      ...formDataToStringRecord(formData),
      drop_off_mode: dropOffLocationType,
      date_range_label:
        startDate && endDate ? converSelectedDateToString([startDate, endDate]) : '',
      ...(checkout ? { checkout } : {}),
    }
    runHeroSearchPlanEffects('car', params, searchTargetPath)
    const location = normalizeYolcu360PickupQuery(
      formDataEntries['pickup-location'] as string | undefined,
    )
    const dropoffLocation = normalizeYolcu360PickupQuery(
      formDataEntries['dropoff-location'] as string | undefined,
    )
    const qs = new URLSearchParams()
    if (location) qs.set('location', location)
    if (dropOffLocationType === 'different' && dropoffLocation) {
      qs.set('drop_off_location', dropoffLocation)
    }
    if (checkin) qs.set('checkin', checkin)
    if (checkout) qs.set('checkout', checkout)
    qs.set('drop_off', dropOffLocationType)
    const qstr = qs.toString()
    router.push(withSearchResultsAnchor(vitrinHref(searchTargetPath) + (qstr ? `?${qstr}` : '')))
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
          locationSearchType="car"
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
            locationSearchType="car"
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
        <DatesRangeInput
          onChange={onChangeDate}
          defaultStartDate={defaultStartDate}
          defaultEndDate={defaultEndDate}
        />
      </FieldPanelContainer>
      {/*  */}
    </Form>
  )
}

const CarSearchFormMobile = (props: Props) => (
  <Suspense fallback={null}>
    <CarSearchFormMobileInner searchTargetPath={props.searchTargetPath} />
  </Suspense>
)

export default CarSearchFormMobile
