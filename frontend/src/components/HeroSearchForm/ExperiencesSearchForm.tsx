'use client'

import { DEFAULT_GUESTS_EXPERIENCE, guestSearchTotalFromRecord } from '@/lib/guest-search-defaults'
import { formDataToStringRecord, runHeroSearchPlanEffects } from '@/lib/hero-search-plan'
import { heroSearchResultsPathFromRestPath } from '@/lib/hero-search-target'
import { stripLocalePrefix } from '@/lib/i18n-config'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { useAppLocale } from '@/hooks/useAppLocale'
import { TourLocationInputField } from './ui/TourLocationInputField'
import clsx from 'clsx'
import Form from 'next/form'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo } from 'react'
import { ButtonSubmit, DateRangeField, GuestNumberField, VerticalDividerLine } from './ui'

export type ExperienceSearchPrefill = {
  location?: string
  date?: string
  guests?: string
}

interface Props {
  className?: string
  formStyle: 'default' | 'small'
  /** Örn. `/aktiviteler/all` — verilmezse pathname’den çıkarılır */
  searchTargetPath?: string
  searchPrefill?: ExperienceSearchPrefill
}

function mergePrefill(
  searchPrefill: ExperienceSearchPrefill | undefined,
  fromUrl: ExperienceSearchPrefill,
): ExperienceSearchPrefill {
  return {
    location: searchPrefill?.location?.trim() || fromUrl.location,
    date: searchPrefill?.date?.trim() || fromUrl.date,
    guests: searchPrefill?.guests?.trim() || fromUrl.guests,
  }
}

function guestDefaultsFromPrefill(prefill: ExperienceSearchPrefill) {
  const raw = prefill.guests
  if (!raw) return DEFAULT_GUESTS_EXPERIENCE
  const n = parseInt(raw, 10)
  if (!Number.isFinite(n) || n < 1) return DEFAULT_GUESTS_EXPERIENCE
  return { ...DEFAULT_GUESTS_EXPERIENCE, guestAdults: n }
}

function ExperiencesSearchFormFields({
  className,
  formStyle = 'default',
  searchTargetPath: searchTargetPathProp,
  searchPrefill,
  urlSearch,
}: Props & { urlSearch: ExperienceSearchPrefill }) {
  const { messages } = useAppLocale()
  const hf = messages.HeroSearchForm
  const router = useRouter()
  const pathname = usePathname()
  const vitrinHref = useVitrinHref()

  const searchTargetPath = useMemo(() => {
    if (searchTargetPathProp?.trim()) return searchTargetPathProp.trim()
    const { restPath } = stripLocalePrefix(pathname ?? '/')
    return heroSearchResultsPathFromRestPath(restPath)
  }, [pathname, searchTargetPathProp])

  const prefill = useMemo(
    () => mergePrefill(searchPrefill, urlSearch),
    [searchPrefill, urlSearch],
  )
  const guestDefaults = useMemo(() => guestDefaultsFromPrefill(prefill), [prefill])

  useEffect(() => {
    router.prefetch(vitrinHref(searchTargetPath))
  }, [router, searchTargetPath, vitrinHref])

  /** Hub seçilince → direkt navigasyon (tarih/kişi gerekmez) */
  const handleHubSelect = (path: string) => {
    router.push(vitrinHref(path))
  }

  const handleFormSubmit = (formData: FormData) => {
    const formDataEntries = Object.fromEntries(formData.entries())
    const params = formDataToStringRecord(formData)
    runHeroSearchPlanEffects('experience', params, searchTargetPath)
    const location = formDataEntries['location'] as string
    const checkin = formDataEntries['checkin'] as string
    const guests = guestSearchTotalFromRecord(formDataEntries)
    const searchParams = new URLSearchParams()
    if (location) searchParams.set('location', location)
    if (checkin) searchParams.set('date', checkin)
    if (guests > 0) searchParams.set('guests', String(guests))
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
          'shadow-[0_8px_30px_rgba(15,23,42,0.08)] ring-1 ring-black/5 dark:shadow-2xl dark:ring-white/10 pr-[4.25rem] sm:pr-[4.5rem]',
      )}
      action={handleFormSubmit}
    >
      <TourLocationInputField
        className="hero-search-form__field-after flex-5/12"
        fieldStyle={formStyle}
        defaultName={prefill.location}
        onHubSelect={handleHubSelect}
      />
      <VerticalDividerLine />
      <DateRangeField
        className="hero-search-form__field-before hero-search-form__field-after flex-4/12"
        fieldStyle={formStyle}
        description={hf['Date range']}
        defaultStartDate={prefill.date}
      />
      <VerticalDividerLine />
      <GuestNumberField
        className="hero-search-form__field-before flex-4/12"
        clearDataButtonClassName={clsx(formStyle === 'small' && 'sm:end-18', formStyle === 'default' && 'sm:end-22')}
        fieldStyle={formStyle}
        guestDefaults={guestDefaults}
        askChildAges={false}
      />

      <ButtonSubmit fieldStyle={formStyle} className="z-10" />
    </Form>
  )
}

function ExperiencesSearchFormWithUrl(props: Props) {
  const urlSearchParams = useSearchParams()
  const fromUrl: ExperienceSearchPrefill = {
    location: urlSearchParams.get('location')?.trim() || undefined,
    date:
      urlSearchParams.get('date')?.trim() ||
      urlSearchParams.get('checkin')?.trim() ||
      undefined,
    guests: urlSearchParams.get('guests')?.trim() || undefined,
  }
  return <ExperiencesSearchFormFields {...props} urlSearch={fromUrl} />
}

export const ExperiencesSearchForm = (props: Props) => {
  return (
    <Suspense
      fallback={
        <ExperiencesSearchFormFields
          {...props}
          urlSearch={{
            location: props.searchPrefill?.location,
            date: props.searchPrefill?.date,
            guests: props.searchPrefill?.guests,
          }}
        />
      }
    >
      <ExperiencesSearchFormWithUrl {...props} />
    </Suspense>
  )
}
