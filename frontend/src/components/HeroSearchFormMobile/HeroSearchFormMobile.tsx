'use client'

import { FilterVerticalIcon, Search01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { stripLocalePrefix } from '@/lib/i18n-config'
import { getMessages } from '@/utils/getT'
import clsx from 'clsx'
import dynamic from 'next/dynamic'
import { useParams, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

/**
 * İlk ekranda sadece hafif tetik butonu yüklenir; modal, Headless UI ve form zinciri
 * kullanıcı aramayı açınca ayrı chunk olarak gelir. PSI mobile'da ilk hydration maliyeti düşer.
 */
const HeroSearchFormMobileDialog = dynamic(() => import('./HeroSearchFormMobileDialog'), {
  ssr: false,
})

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
      className="relative flex w-full items-center rounded-full border border-neutral-200 px-4 py-2 pe-11 shadow-lg dark:border-neutral-600 dark:bg-neutral-900"
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
        /** Chisfis: `relative z-10 w-full max-w-lg` */
        'relative z-10 w-full min-w-0 max-w-lg',
        className,
      )}
    >
      {!isControlled && renderButtonOpenModal()}

      {showModal ? (
        <HeroSearchFormMobileDialog open={showModal} onClose={closeModal} locale={locale} />
      ) : null}
    </div>
  )
}

export default HeroSearchFormMobile
