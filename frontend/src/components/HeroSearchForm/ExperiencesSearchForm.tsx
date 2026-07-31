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
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo } from 'react'
import { ButtonSubmit, DateRangeField, GuestNumberField, VerticalDividerLine } from './ui'

interface Props {
  className?: string
  formStyle: 'default' | 'small'
  /** Örn. `/aktiviteler/all` — verilmezse pathname’den çıkarılır */
  searchTargetPath?: string
}

export const ExperiencesSearchForm = ({
  className,
  formStyle = 'default',
  searchTargetPath: searchTargetPathProp,
}: Props) => {
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
        onHubSelect={handleHubSelect}
      />
      <VerticalDividerLine />
      <DateRangeField
        className="hero-search-form__field-before hero-search-form__field-after flex-4/12"
        fieldStyle={formStyle}
        description={hf['Date range']}
      />
      <VerticalDividerLine />
      <GuestNumberField
        className="hero-search-form__field-before flex-4/12"
        clearDataButtonClassName={clsx(formStyle === 'small' && 'sm:end-18', formStyle === 'default' && 'sm:end-22')}
        fieldStyle={formStyle}
        guestDefaults={DEFAULT_GUESTS_EXPERIENCE}
        askChildAges={false}
      />

      <ButtonSubmit fieldStyle={formStyle} className="z-10" />
    </Form>
  )
}
