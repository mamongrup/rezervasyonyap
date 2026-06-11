'use client'

import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { DEFAULT_GUESTS_STAY } from '@/lib/guest-search-defaults'
import { formDataToStringRecord, runHeroSearchPlanEffects } from '@/lib/hero-search-plan'
import { staySearchResultsPathFromRestPath } from '@/lib/stay-search-target'
import { stripLocalePrefix } from '@/lib/i18n-config'
import clsx from 'clsx'
import Form from 'next/form'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo } from 'react'
import { ButtonSubmit, DateRangeField, GuestNumberField, LocationInputField, VerticalDividerLine } from './ui'
import FlexDateToggle from './FlexDateToggle'

export type StaySearchPrefill = {
  location?: string
  checkin?: string
  checkout?: string
  guests?: string
}

interface Props {
  className?: string
  formStyle: 'default' | 'small'
  /** Örn. `/tatil-evleri/all` — verilmezse pathname’den çıkarılır */
  searchTargetPath?: string
  searchPrefill?: StaySearchPrefill
}

export const StaySearchForm = ({
  className,
  formStyle = 'default',
  searchTargetPath: searchTargetPathProp,
  searchPrefill,
}: Props) => {
  const router = useRouter()
  const pathname = usePathname()
  const urlSearch = useSearchParams()
  const vitrinHref = useVitrinHref()

  const searchTargetPath = useMemo(() => {
    if (searchTargetPathProp?.trim()) return searchTargetPathProp.trim()
    const { restPath } = stripLocalePrefix(pathname ?? '/')
    return staySearchResultsPathFromRestPath(restPath)
  }, [pathname, searchTargetPathProp])

  const prefill = useMemo((): StaySearchPrefill => {
    const fromUrl: StaySearchPrefill = {
      location: urlSearch.get('location')?.trim() || undefined,
      checkin: urlSearch.get('checkin')?.trim() || undefined,
      checkout: urlSearch.get('checkout')?.trim() || undefined,
      guests: urlSearch.get('guests')?.trim() || undefined,
    }
    return {
      location: searchPrefill?.location?.trim() || fromUrl.location,
      checkin: searchPrefill?.checkin?.trim() || fromUrl.checkin,
      checkout: searchPrefill?.checkout?.trim() || fromUrl.checkout,
      guests: searchPrefill?.guests?.trim() || fromUrl.guests,
    }
  }, [searchPrefill, urlSearch])

  const guestDefaults = useMemo(() => {
    const raw = prefill.guests
    if (!raw) return DEFAULT_GUESTS_STAY
    const n = parseInt(raw, 10)
    if (!Number.isFinite(n) || n < 1) return DEFAULT_GUESTS_STAY
    return { ...DEFAULT_GUESTS_STAY, guestAdults: n }
  }, [prefill.guests])

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
    const guestAdults = formDataEntries['guestAdults'] as string
    const flexDays = formDataEntries['flex_days'] as string
    const searchParams = new URLSearchParams()
    if (location) searchParams.set('location', location)
    if (checkin) searchParams.set('checkin', checkin)
    if (checkout) searchParams.set('checkout', checkout)
    if (guestAdults) searchParams.set('guests', guestAdults)
    if (flexDays && flexDays !== '0') searchParams.set('flex_days', flexDays)
    const qs = searchParams.toString()
    router.push(vitrinHref(searchTargetPath) + (qs ? `?${qs}` : ''))
  }

  return (
    <Form
      className={clsx(
        'relative isolate z-[100] flex w-full items-stretch overflow-visible rounded-full bg-white [--form-bg:var(--color-white)] dark:bg-neutral-800 dark:[--form-bg:var(--color-neutral-800)]',
        className,
        formStyle === 'small' && 'custom-shadow-1',
        formStyle === 'default' &&
          'shadow-[0_8px_30px_rgba(15,23,42,0.08)] ring-1 ring-black/5 dark:shadow-2xl dark:ring-white/10 pr-[4.25rem] sm:pr-[4.5rem]'
      )}
      action={handleFormSubmit}
    >
      <LocationInputField
        className="hero-search-form__field-after flex-5/12"
        fieldStyle={formStyle}
        defaultName={prefill.location}
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
      />

      <ButtonSubmit fieldStyle={formStyle} className="z-10" />
      <FlexDateToggle className="absolute -bottom-10 left-1/2 hidden -translate-x-1/2 sm:flex" />
    </Form>
  )
}
