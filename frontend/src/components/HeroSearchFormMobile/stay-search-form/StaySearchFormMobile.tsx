'use client'

import { useVitrinHref } from '@/hooks/use-vitrin-href'
import {
  appendStayGuestSearchParams,
  formatStayGuestSummary,
  guestsObjectFromSearchRecord,
  totalGuestCount,
} from '@/lib/guest-search-defaults'
import { formDataToStringRecord, runHeroSearchPlanEffects } from '@/lib/hero-search-plan'
import { withSearchResultsAnchor } from '@/lib/search-results-anchor'
import { stripLocalePrefix } from '@/lib/i18n-config'
import { shouldAskChildAgesForStaySearch, staySearchResultsPathFromRestPath } from '@/lib/stay-search-target'
import { GuestsObject } from '@/type'
import converSelectedDateToString from '@/utils/converSelectedDateToString'
import { formatLocalYmd, parseLocalYmd } from '@/utils/format-local-ymd'
import { getMessages } from '@/utils/getT'
import Form from 'next/form'
import dynamic from 'next/dynamic'
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import FieldPanelContainer from '../FieldPanelContainer'
import GuestsInput from '../GuestsInput'
import LocationInput from '../LocationInput'
import FlexDateToggle from '../../HeroSearchForm/FlexDateToggle'
const DatesRangeInput = dynamic(() => import('../DatesRangeInput'), {
  ssr: false,
  loading: () => <div className="h-72 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-700/60" />,
})

const StaySearchFormMobile = () => {
  const vitrinHref = useVitrinHref()
  const pathname = usePathname()
  const urlSearch = useSearchParams()
  const searchTargetPath = useMemo(() => {
    const { restPath } = stripLocalePrefix(pathname ?? '/')
    return staySearchResultsPathFromRestPath(restPath)
  }, [pathname])
  const staySearchHref = vitrinHref(searchTargetPath)
  const askChildAges = shouldAskChildAgesForStaySearch(searchTargetPath)
  //
  const [fieldNameShow, setFieldNameShow] = useState<'location' | 'dates' | 'guests'>('location')
  const locationPanelRef = useRef<HTMLDivElement>(null)
  const datesPanelRef = useRef<HTMLDivElement>(null)
  const guestsPanelRef = useRef<HTMLDivElement>(null)
  //
  const prefillGuests = useMemo(
    () =>
      guestsObjectFromSearchRecord({
        guests: urlSearch.get('guests'),
        guestAdults: urlSearch.get('guestAdults'),
        guestChildren: urlSearch.get('guestChildren'),
        guestInfants: urlSearch.get('guestInfants'),
        childAges: urlSearch.get('childAges'),
      }),
    [urlSearch],
  )

  const [locationInputTo, setLocationInputTo] = useState(() => urlSearch.get('location')?.trim() ?? '')
  const [guestInput, setGuestInput] = useState<GuestsObject>(prefillGuests)
  const [startDate, setStartDate] = useState<Date | null>(() =>
    parseLocalYmd(urlSearch.get('checkin')?.trim()),
  )
  const [endDate, setEndDate] = useState<Date | null>(() =>
    parseLocalYmd(urlSearch.get('checkout')?.trim()),
  )

  useEffect(() => {
    setLocationInputTo(urlSearch.get('location')?.trim() ?? '')
    const ci = parseLocalYmd(urlSearch.get('checkin')?.trim())
    const co = parseLocalYmd(urlSearch.get('checkout')?.trim())
    setStartDate(ci)
    setEndDate(co)
    setGuestInput(
      guestsObjectFromSearchRecord({
        guests: urlSearch.get('guests'),
        guestAdults: urlSearch.get('guestAdults'),
        guestChildren: urlSearch.get('guestChildren'),
        guestInfants: urlSearch.get('guestInfants'),
        childAges: urlSearch.get('childAges'),
      }),
    )
  }, [urlSearch])
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
    const params: Record<string, string> = {
      ...formDataToStringRecord(formData),
      location: locationInputTo.trim(),
      checkin: startDate ? formatLocalYmd(startDate) : '',
      checkout: endDate ? formatLocalYmd(endDate) : '',
      date_range_label:
        startDate && endDate ? converSelectedDateToString([startDate, endDate]) : '',
      guestAdults: String(guestInput.guestAdults ?? 0),
      guestChildren: String(guestInput.guestChildren ?? 0),
      guestInfants: String(guestInput.guestInfants ?? 0),
      ...(askChildAges && guestInput.childAges && guestInput.childAges.length > 0
        ? { childAges: guestInput.childAges.join(',') }
        : {}),
    }
    runHeroSearchPlanEffects('stay', params, searchTargetPath)
    const qs = new URLSearchParams()
    if (params.location) qs.set('location', params.location)
    if (params.checkin) qs.set('checkin', params.checkin)
    if (params.checkout) qs.set('checkout', params.checkout)
    if (params.flex_days && params.flex_days !== '0') qs.set('flex_days', params.flex_days)
    appendStayGuestSearchParams(qs, {
      guestAdults: params.guestAdults,
      guestChildren: params.guestChildren,
      guestInfants: params.guestInfants,
      childAges: params.childAges,
    })
    const qstr = qs.toString()
    router.push(withSearchResultsAnchor(staySearchHref + (qstr ? `?${qstr}` : '')))
  }

  //
  const totalGuests = totalGuestCount(guestInput)
  const guestStringConverted = totalGuests
    ? formatStayGuestSummary(locale, guestInput)
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
          <DatesRangeInput
            defaultStartDate={startDate}
            defaultEndDate={endDate}
            onChange={onChangeDate}
            onApply={() => setFieldNameShow('guests')}
          />
          <FlexDateToggle
            key={urlSearch.get('flex_days') ?? '0'}
            defaultValue={urlSearch.get('flex_days') === '7' ? 7 : urlSearch.get('flex_days') === '3' ? 3 : 0}
            className="mt-3 w-full justify-center rounded-xl py-2.5"
          />
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
          <GuestsInput defaultValue={guestInput} onChange={setGuestInput} askChildAges={askChildAges} />
        </FieldPanelContainer>
      </div>
    </Form>
  )
}

export default StaySearchFormMobile
