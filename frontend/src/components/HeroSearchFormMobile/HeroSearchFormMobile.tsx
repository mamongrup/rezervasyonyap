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
import dynamic from 'next/dynamic'
import { useParams, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

/**
 * Modal içeriği — `react-datepicker` zinciri ve kategori barı yalnızca kullanıcı
 * arama çubuğuna dokununca yüklenir. Mobil PSI: ana JS bundle'ından `react-datepicker`
 * + locale-data + ilgili CSS çıkar → TBT ve "Unused JavaScript" düşer.
 */
const StaySearchFormMobile = dynamic(
  () => import('./stay-search-form/StaySearchFormMobile'),
  { ssr: false, loading: () => null },
)
const HeroMenuCategoryBar = dynamic(
  () =>
    import('@/components/HeroSearchForm/HeroMenuCategoryBar').then(
      (m) => m.HeroMenuCategoryBar,
    ),
  { ssr: false, loading: () => null },
)

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

  /** Clear sonrası form state sıfırlansın diye içeriği remount (Chisfis’teki showDialog + timeout ile aynı amaç) */
  const [contentKey, setContentKey] = useState(0)

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
      type="button"
      onClick={openModal}
      className="relative box-border flex w-full max-w-full min-w-0 items-center rounded-full border border-neutral-200 px-4 py-2 pe-11 shadow-lg transition hover:shadow-lg dark:border-neutral-600 dark:bg-neutral-900"
    >
      <HugeiconsIcon icon={Search01Icon} size={20} color="currentColor" strokeWidth={1.5} className="shrink-0 text-primary-600 dark:text-primary-400" />
      <div className="ms-4 min-w-0 flex-1 overflow-hidden text-start">
        <span className="block truncate text-sm/5 font-medium text-neutral-800 dark:text-neutral-100">{locationText}</span>
        <span className="mt-px flex flex-wrap gap-x-2 gap-y-0 text-sm/5 font-normal text-neutral-500 dark:text-neutral-400">
          <span className="truncate">{weekText}</span>
          {guestsText ? (
            <>
              <span aria-hidden>•</span>
              <span className="truncate">{guestsText}</span>
            </>
          ) : null}
        </span>
      </div>
      <span className="absolute end-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200 sm:flex dark:border-neutral-600 dark:text-neutral-300">
        <HugeiconsIcon icon={FilterVerticalIcon} size={20} color="currentColor" strokeWidth={1.5} />
      </span>
    </button>
  )

  return (
    <div
      className={clsx(
        'min-w-0',
        !isControlled && 'relative z-10 w-full max-w-full',
        className,
      )}
    >
      {!isControlled && renderButtonOpenModal()}

      <Dialog as="div" className="relative z-max" onClose={closeModal} open={showModal}>
        {/* Chisfis: fixed shell → flex h-full → DialogPanel flex-1; yatay taşma yok */}
        <div className="fixed inset-0 z-max overflow-x-hidden overflow-y-hidden bg-neutral-100 dark:bg-neutral-900">
          <div className="flex h-full w-full min-w-0 max-w-[100dvw]">
            <DialogPanel
              transition
              className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden transition data-closed:translate-y-6 data-closed:opacity-0 motion-reduce:data-closed:translate-y-0"
            >
              {showModal ? (
                <div
                  key={contentKey}
                  className="relative flex h-full min-h-0 w-full min-w-0 flex-col justify-between pt-[env(safe-area-inset-top,0px)]"
                >
                  <div className="absolute end-3 top-[max(0.5rem,env(safe-area-inset-top))] z-10">
                    <CloseButton color="light" as={ButtonCircle} className="size-7!">
                      <HugeiconsIcon icon={Cancel01Icon} className="size-4!" strokeWidth={1.75} />
                    </CloseButton>
                  </div>

                  <div className="shrink-0 overflow-x-hidden border-b border-neutral-100 px-3 pt-10 pb-3 dark:border-neutral-800 sm:px-4 sm:pb-4">
                    <HeroMenuCategoryBar
                      locale={locale}
                      layout="default"
                      className="mb-0 justify-center gap-x-2 gap-y-2 sm:gap-x-6 sm:gap-y-3"
                    />
                  </div>

                  {/* Chisfis TabPanels: dış overflow-hidden, iç scroll */}
                  <div className="flex min-h-0 flex-1 overflow-hidden px-1.5 sm:px-4">
                    <div className="hidden-scrollbar min-h-0 w-full min-w-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain py-2 pb-4">
                      <StaySearchFormMobile />
                    </div>
                  </div>

                  <div className="flex w-full min-w-0 shrink-0 justify-between gap-2 border-t border-neutral-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-neutral-700 dark:bg-neutral-900">
                    <ButtonThird type="button" onClick={() => setContentKey((k) => k + 1)}>
                      {msg.mobile.modal.clear}
                    </ButtonThird>
                    <ButtonPrimary type="submit" form="form-hero-search-form-mobile" onClick={closeModal}>
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
    </div>
  )
}

export default HeroSearchFormMobile
