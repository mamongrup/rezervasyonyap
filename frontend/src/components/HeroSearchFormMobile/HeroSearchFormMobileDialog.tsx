'use client'

import { HeroMenuCategoryBar } from '@/components/HeroSearchForm/HeroMenuCategoryBar'
import ButtonPrimary from '@/shared/ButtonPrimary'
import ButtonThird from '@/shared/ButtonThird'
import { getMessages } from '@/utils/getT'
import { Cancel01Icon, Search01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Dialog, DialogPanel } from '@headlessui/react'
import { useState } from 'react'
import StaySearchFormMobile from './stay-search-form/StaySearchFormMobile'

type Props = {
  open: boolean
  onClose: () => void
  locale: string
}

export default function HeroSearchFormMobileDialog({ open, onClose, locale }: Props) {
  const [contentKey, setContentKey] = useState(0)
  const msg = getMessages(locale)

  return (
    <Dialog as="div" className="relative z-max" onClose={onClose} open={open}>
      {/* Chisfis: fixed shell -> flex h-full -> DialogPanel flex-1; yatay taşma yok */}
      <div className="fixed inset-0 z-max overflow-x-hidden overflow-y-hidden bg-neutral-100 dark:bg-neutral-900">
        <div className="flex h-full w-full min-w-0 max-w-[100dvw]">
          <DialogPanel className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            {open ? (
              <div
                key={contentKey}
                className="relative flex h-full min-h-0 w-full min-w-0 flex-col justify-between pt-[env(safe-area-inset-top,0px)]"
              >
                <div className="absolute end-3 top-[max(0.5rem,env(safe-area-inset-top))] z-30">
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

                {/* Chisfis TabPanels: dış overflow-hidden, iç scroll */}
                <div className="relative z-0 flex min-h-0 flex-1 overflow-hidden px-1.5 sm:px-4">
                  <div className="hidden-scrollbar min-h-0 w-full min-w-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain py-2 pb-4">
                    <StaySearchFormMobile />
                  </div>
                </div>

                <div className="flex w-full min-w-0 shrink-0 justify-between gap-2 border-t border-neutral-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-neutral-700 dark:bg-neutral-900">
                  <ButtonThird type="button" onClick={() => setContentKey((k) => k + 1)}>
                    {msg.mobile.modal.clear}
                  </ButtonThird>
                  <ButtonPrimary type="submit" form="form-hero-search-form-mobile" onClick={onClose}>
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
