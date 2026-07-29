'use client'

import { DEFAULT_GUESTS_EXPERIENCE, totalGuestCount } from '@/lib/guest-search-defaults'
import { formDataToStringRecord, runHeroSearchPlanEffects } from '@/lib/hero-search-plan'
import { heroSearchResultsPathFromRestPath } from '@/lib/hero-search-target'
import { stripLocalePrefix } from '@/lib/i18n-config'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { GuestsObject } from '@/type'
import converSelectedDateToString from '@/utils/converSelectedDateToString'
import { formatLocalYmd } from '@/utils/format-local-ymd'
import { getMessages } from '@/utils/getT'
import Form from 'next/form'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import DatesRangeInput from '../DatesRangeInput'
import FieldPanelContainer from '../FieldPanelContainer'
import GuestsInput from '../GuestsInput'
import LocationInput from '../LocationInput'

type Props = { searchTargetPath?: string }

const ExperienceSearchFormMobile = ({ searchTargetPath: searchTargetPathProp }: Props) => {
  const [fieldNameShow, setFieldNameShow] = useState<'location' | 'dates' | 'guests'>('location')
  const [locationInputTo, setLocationInputTo] = useState('')
  const [guestInput, setGuestInput] = useState<GuestsObject>({ ...DEFAULT_GUESTS_EXPERIENCE })
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
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
    runHeroSearchPlanEffects('experience', params, searchTargetPath)
    const location = formDataEntries['location'] as string
    const qs = new URLSearchParams()
    if (location) qs.set('location', location)
    const dateYmd = startDate ? formatLocalYmd(startDate) : formDataEntries['checkin']
    if (dateYmd) qs.set('date', String(dateYmd))
    const guests = totalGuestCount(guestInput)
    if (guests > 0) qs.set('guests', String(guests))
    const qstr = qs.toString()
    router.push(vitrinHref(searchTargetPath) + (qstr ? `?${qstr}` : ''))
  }

  const totalGuests = totalGuestCount(guestInput)
  const guestStringConverted = totalGuests
    ? `${totalGuests} ${m.HeroSearchForm['Guests']}`
    : m.HeroSearchForm['Add guests']
  return (
    <Form id="form-hero-search-form-mobile" action={handleFormSubmit} className="flex w-full flex-col gap-y-3">
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

      <FieldPanelContainer
        isActive={fieldNameShow === 'dates'}
        headingOnClick={() => setFieldNameShow('dates')}
        headingTitle={m.HeroSearchForm['When']}
        headingValue={startDate ? converSelectedDateToString([startDate, endDate]) : m.HeroSearchForm['Add dates']}
      >
        <DatesRangeInput defaultStartDate={startDate} defaultEndDate={endDate} onChange={onChangeDate} />
      </FieldPanelContainer>

      <FieldPanelContainer
        isActive={fieldNameShow === 'guests'}
        headingOnClick={() => setFieldNameShow('guests')}
        headingTitle={m.HeroSearchForm['Who']}
        headingValue={guestStringConverted}
      >
        <GuestsInput
          defaultValue={guestInput}
          onChange={setGuestInput}
          guestDefaults={DEFAULT_GUESTS_EXPERIENCE}
        />
      </FieldPanelContainer>
    </Form>
  )
}

export default ExperienceSearchFormMobile
