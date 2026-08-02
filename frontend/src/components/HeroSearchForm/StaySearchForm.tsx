'use client'

import { useVitrinHref } from '@/hooks/use-vitrin-href'
import {
  appendStayGuestSearchParams,
  DEFAULT_GUESTS_STAY,
  guestsObjectFromSearchRecord,
} from '@/lib/guest-search-defaults'
import { formDataToStringRecord, runHeroSearchPlanEffects } from '@/lib/hero-search-plan'
import { withSearchResultsAnchor } from '@/lib/search-results-anchor'
import { listingCategoryCodeForHeroPath } from '@/lib/search-listings-display'
import { shouldAskChildAgesForStaySearch, staySearchResultsPathFromRestPath } from '@/lib/stay-search-target'
import { stripLocalePrefix } from '@/lib/i18n-config'
import clsx from 'clsx'
import Form from 'next/form'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo } from 'react'
import { ButtonSubmit, DateRangeField, GuestNumberField, LocationInputField, VerticalDividerLine } from './ui'

export type StaySearchPrefill = {
  location?: string
  checkin?: string
  checkout?: string
  guests?: string
  guestAdults?: string
  guestChildren?: string
  guestInfants?: string
  childAges?: string
}

interface Props {
  className?: string
  formStyle: 'default' | 'small'
  /** Örn. `/tatil-evleri/all` — verilmezse pathname’den çıkarılır */
  searchTargetPath?: string
  searchPrefill?: StaySearchPrefill
}

function mergePrefill(
  searchPrefill: StaySearchPrefill | undefined,
  fromUrl: StaySearchPrefill,
): StaySearchPrefill {
  return {
    location: searchPrefill?.location?.trim() || fromUrl.location,
    checkin: searchPrefill?.checkin?.trim() || fromUrl.checkin,
    checkout: searchPrefill?.checkout?.trim() || fromUrl.checkout,
    guests: searchPrefill?.guests?.trim() || fromUrl.guests,
    guestAdults: searchPrefill?.guestAdults?.trim() || fromUrl.guestAdults,
    guestChildren: searchPrefill?.guestChildren?.trim() || fromUrl.guestChildren,
    guestInfants: searchPrefill?.guestInfants?.trim() || fromUrl.guestInfants,
    childAges: searchPrefill?.childAges?.trim() || fromUrl.childAges,
  }
}

function guestDefaultsFromPrefill(prefill: StaySearchPrefill) {
  return guestsObjectFromSearchRecord(prefill, DEFAULT_GUESTS_STAY)
}

function StaySearchFormFields({
  className,
  formStyle = 'default',
  searchTargetPath: searchTargetPathProp,
  searchPrefill,
  urlSearch,
}: Props & { urlSearch: StaySearchPrefill }) {
  const router = useRouter()
  const pathname = usePathname()
  const vitrinHref = useVitrinHref()

  const searchTargetPath = useMemo(() => {
    if (searchTargetPathProp?.trim()) return searchTargetPathProp.trim()
    const { restPath } = stripLocalePrefix(pathname ?? '/')
    return staySearchResultsPathFromRestPath(restPath)
  }, [pathname, searchTargetPathProp])

  const prefill = useMemo(
    () => mergePrefill(searchPrefill, urlSearch),
    [searchPrefill, urlSearch],
  )

  const guestDefaults = useMemo(() => guestDefaultsFromPrefill(prefill), [prefill])
  const askChildAges = shouldAskChildAgesForStaySearch(searchTargetPath)
  const listingCategoryCode = useMemo(
    () => listingCategoryCodeForHeroPath(searchTargetPath),
    [searchTargetPath],
  )

  useEffect(() => {
    router.prefetch(vitrinHref(searchTargetPath))
  }, [router, searchTargetPath, vitrinHref])

  const handleFormSubmit = (formData: FormData) => {
    const formDataEntries = Object.fromEntries(formData.entries())
    const params = formDataToStringRecord(formData)
    runHeroSearchPlanEffects('stay', params, searchTargetPath)
    const location = formDataEntries['location'] as string
    const checkin = formDataEntries['checkin'] as string
    const checkout = formDataEntries['checkout'] as string
    const searchParams = new URLSearchParams()
    if (location) searchParams.set('location', location)
    if (checkin) searchParams.set('checkin', checkin)
    if (checkout) searchParams.set('checkout', checkout)
    appendStayGuestSearchParams(searchParams, formDataEntries)
    const qs = searchParams.toString()
    router.push(withSearchResultsAnchor(vitrinHref(searchTargetPath) + (qs ? `?${qs}` : '')))
  }

  return (
    <Form
      className={clsx(
        'relative isolate z-[100] flex w-full items-stretch overflow-visible rounded-full bg-white [--form-bg:var(--color-white)] dark:bg-neutral-800 dark:[--form-bg:var(--color-neutral-800)]',
        className,
        formStyle === 'small' && 'custom-shadow-1',
        formStyle === 'default' &&
          'shadow-[0_8px_30px_rgba(15,23,42,0.08)] ring-1 ring-black/5 dark:shadow-2xl dark:ring-white/10 pr-[4.25rem] sm:pr-[4.5rem]',
      )}
      action={handleFormSubmit}
    >
      <LocationInputField
        className="hero-search-form__field-after flex-5/12"
        fieldStyle={formStyle}
        defaultName={prefill.location}
        listingCategoryCode={listingCategoryCode}
      />
      <VerticalDividerLine />
      <DateRangeField
        className="hero-search-form__field-before hero-search-form__field-after flex-4/12"
        fieldStyle={formStyle}
        defaultStartDate={prefill.checkin}
        defaultEndDate={prefill.checkout}
      />
      <VerticalDividerLine />
      <GuestNumberField
        className="hero-search-form__field-before flex-4/12"
        clearDataButtonClassName={clsx(formStyle === 'small' && 'sm:end-18', formStyle === 'default' && 'sm:end-22')}
        fieldStyle={formStyle}
        guestDefaults={guestDefaults}
        askChildAges={askChildAges}
      />

      <ButtonSubmit fieldStyle={formStyle} className="z-10" />
    </Form>
  )
}

/** `useSearchParams` — Suspense içinde; fallback gerçek form (gri pulse yok). */
function StaySearchFormWithUrl(props: Props) {
  const urlSearchParams = useSearchParams()
  const fromUrl: StaySearchPrefill = {
    location: urlSearchParams.get('location')?.trim() || undefined,
    checkin: urlSearchParams.get('checkin')?.trim() || undefined,
    checkout: urlSearchParams.get('checkout')?.trim() || undefined,
    guests: urlSearchParams.get('guests')?.trim() || undefined,
    guestAdults: urlSearchParams.get('guestAdults')?.trim() || undefined,
    guestChildren: urlSearchParams.get('guestChildren')?.trim() || undefined,
    guestInfants: urlSearchParams.get('guestInfants')?.trim() || undefined,
    childAges: urlSearchParams.get('childAges')?.trim() || undefined,
  }
  return <StaySearchFormFields {...props} urlSearch={fromUrl} />
}

export const StaySearchForm = (props: Props) => {
  return (
    <Suspense
      fallback={
        <StaySearchFormFields
          {...props}
          urlSearch={{
            location: props.searchPrefill?.location,
            checkin: props.searchPrefill?.checkin,
            checkout: props.searchPrefill?.checkout,
            guests: props.searchPrefill?.guests,
            guestAdults: props.searchPrefill?.guestAdults,
            guestChildren: props.searchPrefill?.guestChildren,
            guestInfants: props.searchPrefill?.guestInfants,
            childAges: props.searchPrefill?.childAges,
          }}
        />
      }
    >
      <StaySearchFormWithUrl {...props} />
    </Suspense>
  )
}
