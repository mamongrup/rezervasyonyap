'use client'

import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { defaultLocale, stripLocalePrefix } from '@/lib/i18n-config'
import { getMessages } from '@/utils/getT'
import ButtonPrimary from '@/shared/ButtonPrimary'
import ButtonSecondary from '@/shared/ButtonSecondary'
import { ArrowRight02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { MANAGE_FORM_CONTAINER_CLASS } from '@/components/manage/ManageFormShell'
import clsx from 'clsx'
import { useParams, usePathname } from 'next/navigation'
import React, { useMemo } from 'react'

const TOTAL_STEPS = 10

function addListingStepFromPathname(pathname: string): number {
  const { restPath } = stripLocalePrefix(pathname)
  const m = restPath.match(/\/add-listing\/(\d+)\/?$/)
  return m ? parseInt(m[1], 10) : 1
}

const Layout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname() ?? ''
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : defaultLocale
  const step = addListingStepFromPathname(pathname)
  const addListings = useMemo(() => getMessages(locale).addListings, [locale])

  React.useEffect(() => {
    document.documentElement.scrollTo({
      top: 0,
      behavior: 'instant',
    })
  }, [pathname])

  return (
    <div className={clsx(MANAGE_FORM_CONTAINER_CLASS, 'pt-10 pb-24 sm:pt-16 lg:pb-32')}>
      {/* Bölge / yönetim formları ile aynı: kart + listingSection gövdesi */}
      <div className="overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
        <div className="border-b border-neutral-100 px-6 py-4 dark:border-neutral-800">
          <PageHeading step={step} total={TOTAL_STEPS} />
          <StepProgress
            current={step}
            total={TOTAL_STEPS}
            ariaLabel={addListings.pagination.progressAriaLabel}
          />
        </div>
        <div className="flex flex-col gap-y-6 px-4 py-6 leading-relaxed sm:gap-y-8 sm:px-6 xl:px-8">
          {children}
        </div>
      </div>
      <Pagination step={step} locale={locale} pagination={addListings.pagination} />
    </div>
  )
}

const PageHeading = ({ step, total }: { step: number; total: number }) => {
  return (
    <div>
      <span className="text-5xl font-semibold tabular-nums">{step}</span>
      <span className="text-lg text-neutral-500 dark:text-neutral-400"> /{total}</span>
    </div>
  )
}

const StepProgress = ({
  current,
  total,
  ariaLabel,
}: {
  current: number
  total: number
  ariaLabel: string
}) => {
  return (
    <div className="mt-6 flex gap-1.5" role="list" aria-label={ariaLabel}>
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1
        const isDone = n < current
        const isCurrent = n === current
        return (
          <div
            key={n}
            role="listitem"
            className={clsx(
              'h-1.5 min-w-0 flex-1 rounded-full transition-colors',
              isCurrent && 'bg-primary-600 dark:bg-primary-500',
              isDone && !isCurrent && 'bg-primary-600/45 dark:bg-primary-400/35',
              !isDone && !isCurrent && 'bg-neutral-200 dark:bg-neutral-700'
            )}
          />
        )
      })}
    </div>
  )
}

const Pagination = ({
  step,
  locale,
  pagination,
}: {
  step: number
  locale: string
  pagination: ReturnType<typeof getMessages>['addListings']['pagination']
}) => {
  const vitrinPath = useVitrinHref()
  const previewHref = vitrinPath('/otel/preview-stay-84763232')
  const nextHref = step < TOTAL_STEPS ? undefined : previewHref
  const backHref = step > 1 ? vitrinPath(`/add-listing/${step - 1}`) : vitrinPath('/')

  const nextBtnText =
    step > TOTAL_STEPS - 1
      ? pagination['Publish listing']
      : pagination.nextStep.replace('{step}', String(step + 1))
  const backBtnText = step > 1 ? pagination['Go back'] : pagination['Back to home']

  return (
    <div className="mt-10 flex flex-wrap justify-end gap-3">
      <ButtonSecondary type="button" href={backHref}>
        {backBtnText}
      </ButtonSecondary>
      <ButtonPrimary type="submit" form="add-listing-form" {...(nextHref ? { href: nextHref } : {})}>
        {nextBtnText}
        <HugeiconsIcon icon={ArrowRight02Icon} className="h-5 w-5 rtl:rotate-180" strokeWidth={1.75} />
      </ButtonPrimary>
    </div>
  )
}

export default Layout
