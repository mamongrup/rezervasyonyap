'use client'

import { HeroMenuCategoryBar } from '@/components/HeroSearchForm/HeroMenuCategoryBar'
import ButtonPrimary from '@/shared/ButtonPrimary'
import ButtonThird from '@/shared/ButtonThird'
import { stripLocalePrefix } from '@/lib/i18n-config'
import {
  heroSearchResultsPathFromRestPath,
  heroSearchVerticalFromRestPath,
} from '@/lib/hero-search-target'
import { getMessages } from '@/utils/getT'
import { Cancel01Icon, Search01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useRegisterVitrinOverlay } from '@/components/aside/aside'
import { Dialog, DialogPanel } from '@headlessui/react'
import { usePathname } from 'next/navigation'
import { useMemo, useState } from 'react'
import StaySearchFormMobile from './stay-search-form/StaySearchFormMobile'
import CarSearchFormMobile from './car-search-form/CarSearchFormMobile'
import ExperienceSearchFormMobile from './experience-search-form/ExperienceSearchFormMobile'
import FlightSearchFormMobile from './flight-search-form/FlightSearchFormMobile'

type Props = {
  open: boolean
  onClose: () => void
  locale: string
}

export default function HeroSearchFormMobileDialog({ open, onClose, locale }: Props) {
  useRegisterVitrinOverlay(open)
  const [contentKey, setContentKey] = useState(0)
  const msg = getMessages(locale)
  const pathname = usePathname()

  const { vertical, searchTargetPath } = useMemo(() => {
    const { restPath } = stripLocalePrefix(pathname ?? '/')
    return {
      vertical: heroSearchVerticalFromRestPath(restPath),
      searchTargetPath: heroSearchResultsPathFromRestPath(restPath),
    }
  }, [pathname])

  const formNode = (() => {
    switch (vertical) {
      case 'car':
        return <CarSearchFormMobile searchTargetPath={searchTargetPath} />
      case 'experience':
        return <ExperienceSearchFormMobile searchTargetPath={searchTargetPath} />
      case 'flight':
        return <FlightSearchFormMobile searchTargetPath={searchTargetPath} />
      default:
        return <StaySearchFormMobile />
    }
  })()

  return (
    <Dialog as="div" className="relative z-max" onClose={onClose} open={open}>
      <div className="fixed inset-0 z-max overflow-x-hidden overflow-y-hidden bg-neutral-100 dark:bg-neutral-900">
        <div className="flex h-full w-full min-w-0 max-w-[100dvw]">
          <DialogPanel className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            {open ? (
              <div
                key={contentKey}
                className="relative flex h-full min-h-0 w-full min-w-0 flex-col justify-between pt-safe"
              >
                <div className="absolute end-3 top-safe-min-2 z-30">
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Kapat"
                    className="flex size-7 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 shadow-sm hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} className="size-4!" strokeWidth={1.75} />
                  </button>
                </div>

                <div className="relative z-20 shrink-0 overflow-visible border-b border-neutral-100 px-3 pt-10 pb-3 dark:border-neutral-800 sm:px-4 sm:pb-4">
                  <HeroMenuCategoryBar
                    locale={locale}
                    layout="default"
                    mobileMoreMenu
                    className="mb-0 justify-center gap-x-2 gap-y-2 sm:gap-x-6 sm:gap-y-3"
                  />
                </div>

                <div className="relative z-0 flex min-h-0 flex-1 overflow-hidden px-1.5 sm:px-4">
                  <div className="hidden-scrollbar min-h-0 w-full min-w-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain py-2 pb-4">
                    {formNode}
                  </div>
                </div>

                <div className="flex w-full min-w-0 shrink-0 justify-between gap-2 border-t border-neutral-200 bg-white px-4 py-3 pb-safe-min-3 dark:border-neutral-700 dark:bg-neutral-900">
                  <ButtonThird type="button" onClick={() => setContentKey((k) => k + 1)}>
                    {msg.mobile.modal.clear}
                  </ButtonThird>
                  <ButtonPrimary
                    type="button"
                    onClick={() => {
                      const form = document.getElementById(
                        'form-hero-search-form-mobile',
                      ) as HTMLFormElement | null
                      // Submit while form is still mounted; close after action can read FormData.
                      if (form) {
                        if (typeof form.requestSubmit === 'function') form.requestSubmit()
                        else form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
                      }
                      window.setTimeout(() => onClose(), 80)
                    }}
                  >
                    <HugeiconsIcon icon={Search01Icon} size={16} />
                    <span>{msg.mobile.modal.search}</span>
                  </ButtonPrimary>
                </div>
              </div>
            ) : null}
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  )
}
