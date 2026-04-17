'use client'

import { ButtonCircle } from '@/shared/Button'
import ButtonPrimary from '@/shared/ButtonPrimary'
import ButtonThird from '@/shared/ButtonThird'
import { Dialog, DialogPanel, CloseButton } from '@headlessui/react'
import { Cancel01Icon, FilterVerticalIcon, Search01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { stripLocalePrefix } from '@/lib/i18n-config'
import { getMessages } from '@/utils/getT'
import clsx from 'clsx'
import { useParams, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useTimeoutFn } from 'react-use'
import StaySearchFormMobile from './stay-search-form/StaySearchFormMobile'
import { HeroMenuCategoryBar } from '@/components/HeroSearchForm/HeroMenuCategoryBar'

interface HeroSearchFormMobileProps {
  className?: string
  locale?: string
  /** Controlled mode: pass open + onClose to skip the trigger button */
  open?: boolean
  onClose?: () => void
}

const HeroSearchFormMobile = ({ className, locale: localeProp, open: openProp, onClose: onCloseProp }: HeroSearchFormMobileProps) => {
  const isControlled = openProp !== undefined && onCloseProp !== undefined

  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (isControlled) setShowModal(openProp)
  }, [isControlled, openProp])

  const [showDialog, setShowDialog] = useState(false)
  const [, , resetIsShowingDialog] = useTimeoutFn(() => setShowDialog(true), 1)

  const pathname = usePathname() ?? ''
  const params = useParams()
  const locale = localeProp ?? (typeof params?.locale === 'string' ? params.locale : 'tr')
  const { restPath } = stripLocalePrefix(pathname)

  const msg = getMessages(locale)
  const hb = msg.mobile.heroBar
  // Trigger buton için özet metin (locale öneki sonrası yol — /en/hotels ile uyumlu)
  let locationText = hb.defaultLocation
  let weekText = hb.defaultWeek
  let guestsText = hb.defaultGuests

  if (restPath.startsWith('/turlar') || restPath.startsWith('/aktiviteler') || restPath.startsWith('/kruvaziyer') || restPath.startsWith('/hac-umre')) {
    locationText = hb.toursLocation
    weekText = hb.toursWeek
    guestsText = hb.toursGuests
  } else if (restPath.startsWith('/arac-kiralama') || restPath.startsWith('/feribot') || restPath.startsWith('/transfer')) {
    locationText = hb.carLocation
    weekText = hb.carWeek
    guestsText = hb.carGuests
  } else if (restPath.startsWith('/ucak-bileti')) {
    locationText = hb.flightLocation
    weekText = hb.flightWeek
    guestsText = hb.flightGuests
  } else if (restPath.startsWith('/oteller') || restPath.startsWith('/tatil-evleri') || restPath.startsWith('/yat-kiralama')) {
    locationText = hb.stayLocation
    weekText = hb.stayWeek
    guestsText = hb.stayGuests
  }

  function closeModal() {
    setShowModal(false)
    onCloseProp?.()
  }

  function openModal() {
    setShowModal(true)
  }

  const renderButtonOpenModal = () => (
    <button
      onClick={openModal}
      className="relative flex w-full items-center rounded-full border border-neutral-200 bg-white px-4 py-2.5 pe-12 shadow-md transition hover:shadow-lg dark:border-neutral-600 dark:bg-neutral-900"
    >
      <HugeiconsIcon icon={Search01Icon} size={20} color="currentColor" strokeWidth={1.5} className="shrink-0 text-primary-600 dark:text-primary-400" />
      <div className="ms-3 flex-1 overflow-hidden text-start">
        <span className="block text-sm font-semibold text-neutral-800 dark:text-neutral-100">{locationText}</span>
        <span className="mt-0.5 flex gap-1.5 text-xs font-normal text-neutral-400 dark:text-neutral-500">
          <span>{weekText}</span>
          {guestsText && <><span>·</span><span>{guestsText}</span></>}
        </span>
      </div>
      <span className="absolute end-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200 dark:border-neutral-600 dark:text-neutral-300">
        <HugeiconsIcon icon={FilterVerticalIcon} size={18} color="currentColor" strokeWidth={1.5} />
      </span>
    </button>
  )

  return (
    <div className={clsx(className, isControlled ? '' : 'relative z-10 w-full max-w-lg')}>
      {!isControlled && renderButtonOpenModal()}

      <Dialog as="div" className="relative z-max" onClose={closeModal} open={showModal}>
        <div className="fixed inset-0 bg-neutral-100 dark:bg-neutral-900">
          <div className="flex h-full">
            <DialogPanel
              transition
              className="relative flex-1 flex flex-col transition data-closed:translate-y-28 data-closed:opacity-0"
            >
              {showDialog && (
                <>
                  {/* Kapat butonu */}
                  <div className="absolute end-3 top-3 z-10">
                    <CloseButton color="light" as={ButtonCircle} className="size-7!">
                      <HugeiconsIcon icon={Cancel01Icon} className="size-4!" strokeWidth={1.75} />
                    </CloseButton>
                  </div>

                  {/* Kategori ikonları */}
                  <div className="border-b border-neutral-100 px-4 pt-10 pb-4 dark:border-neutral-800">
                    <HeroMenuCategoryBar
                      locale={locale}
                      className="justify-start gap-x-4 gap-y-3 sm:gap-x-6 mb-0"
                    />
                  </div>

                  {/* Arama formu */}
                  <div className="hidden-scrollbar flex-1 overflow-y-auto px-4 pt-4 pb-4">
                    <StaySearchFormMobile />
                  </div>

                  {/* Alt butonlar */}
                  <div className="flex justify-between border-t border-neutral-200 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900">
                    <ButtonThird
                      onClick={() => {
                        setShowDialog(false)
                        resetIsShowingDialog()
                      }}
                    >
                      {msg.mobile.modal.clear}
                    </ButtonThird>
                    <ButtonPrimary type="submit" form="form-hero-search-form-mobile" onClick={closeModal}>
                      <HugeiconsIcon icon={Search01Icon} size={16} />
                      <span>{msg.mobile.modal.search}</span>
                    </ButtonPrimary>
                  </div>
                </>
              )}
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </div>
  )
}

export default HeroSearchFormMobile
