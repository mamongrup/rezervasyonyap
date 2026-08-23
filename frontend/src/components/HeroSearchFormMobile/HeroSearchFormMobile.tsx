'use client'

import { FilterVerticalIcon, Search01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { stripLocalePrefix } from '@/lib/i18n-config'
import { heroSearchVerticalFromRestPath } from '@/lib/hero-search-target'
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
  loading: () => null,
})

/** iOS Safari: `click` bazen fixed header içinde kaybolur — `touchend` ile yedekle. */
function openModalFromTouch(e: React.TouchEvent, open: () => void) {
  e.preventDefault()
  open()
}

type HeroBarMessages = {
  defaultLocation: string
  defaultWeek: string
  defaultGuests: string
  toursLocation: string
  toursWeek: string
  toursGuests: string
  carLocation: string
  carWeek: string
  carGuests: string
  flightLocation: string
  flightWeek: string
  flightGuests: string
  stayLocation: string
  stayWeek: string
  stayGuests: string
}

const HERO_BAR_MESSAGES: Record<string, HeroBarMessages> = {
  tr: {
    defaultLocation: 'Nereye?',
    defaultWeek: 'Tarih, kişi',
    defaultGuests: '',
    toursLocation: 'Nereye?',
    toursWeek: 'Tarih, kişi',
    toursGuests: '',
    carLocation: 'Alış noktası',
    carWeek: 'Tarih, araç',
    carGuests: '',
    flightLocation: 'Nereden?',
    flightWeek: 'Tarih, yolcu',
    flightGuests: '',
    stayLocation: 'Nereye?',
    stayWeek: 'Tarih, kişi',
    stayGuests: '',
  },
  en: {
    defaultLocation: 'Where to?',
    defaultWeek: 'Dates, guests',
    defaultGuests: '',
    toursLocation: 'Where to?',
    toursWeek: 'Dates, guests',
    toursGuests: '',
    carLocation: 'Pick-up location',
    carWeek: 'Dates, car',
    carGuests: '',
    flightLocation: 'From where?',
    flightWeek: 'Dates, passengers',
    flightGuests: '',
    stayLocation: 'Where to?',
    stayWeek: 'Dates, guests',
    stayGuests: '',
  },
  de: {
    defaultLocation: 'Wohin?',
    defaultWeek: 'Daten, Gäste',
    defaultGuests: '',
    toursLocation: 'Wohin?',
    toursWeek: 'Daten, Gäste',
    toursGuests: '',
    carLocation: 'Abholort',
    carWeek: 'Daten, Fahrzeug',
    carGuests: '',
    flightLocation: 'Von wo?',
    flightWeek: 'Daten, Passagiere',
    flightGuests: '',
    stayLocation: 'Wohin?',
    stayWeek: 'Daten, Gäste',
    stayGuests: '',
  },
  ru: {
    defaultLocation: 'Куда?',
    defaultWeek: 'Даты, гости',
    defaultGuests: '',
    toursLocation: 'Куда?',
    toursWeek: 'Даты, гости',
    toursGuests: '',
    carLocation: 'Место получения',
    carWeek: 'Даты, авто',
    carGuests: '',
    flightLocation: 'Откуда?',
    flightWeek: 'Даты, пассажиры',
    flightGuests: '',
    stayLocation: 'Куда?',
    stayWeek: 'Даты, гости',
    stayGuests: '',
  },
  zh: {
    defaultLocation: '去哪里？',
    defaultWeek: '日期、人数',
    defaultGuests: '',
    toursLocation: '去哪里？',
    toursWeek: '日期、人数',
    toursGuests: '',
    carLocation: '取车地点',
    carWeek: '日期、车型',
    carGuests: '',
    flightLocation: '从哪里出发？',
    flightWeek: '日期、乘客',
    flightGuests: '',
    stayLocation: '去哪里？',
    stayWeek: '日期、人数',
    stayGuests: '',
  },
  fr: {
    defaultLocation: 'Où ?',
    defaultWeek: 'Dates, voyageurs',
    defaultGuests: '',
    toursLocation: 'Où ?',
    toursWeek: 'Dates, voyageurs',
    toursGuests: '',
    carLocation: 'Lieu de prise en charge',
    carWeek: 'Dates, véhicule',
    carGuests: '',
    flightLocation: 'D’où ?',
    flightWeek: 'Dates, passagers',
    flightGuests: '',
    stayLocation: 'Où ?',
    stayWeek: 'Dates, voyageurs',
    stayGuests: '',
  },
}

function getHeroBarMessages(locale: string): HeroBarMessages {
  const key = locale.trim().toLowerCase()
  return HERO_BAR_MESSAGES[key] ?? HERO_BAR_MESSAGES.en
}

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

  const hb = getHeroBarMessages(locale)
  // Trigger buton için özet metin (locale öneki sonrası yol — /en/hotels ile uyumlu)
  let locationText = hb.defaultLocation
  let weekText = hb.defaultWeek
  let guestsText = hb.defaultGuests

  const vertical = heroSearchVerticalFromRestPath(restPath)
  if (vertical === 'experience') {
    locationText = hb.toursLocation
    weekText = hb.toursWeek
    guestsText = hb.toursGuests
  } else if (vertical === 'car') {
    locationText = hb.carLocation
    weekText = hb.carWeek
    guestsText = hb.carGuests
  } else if (vertical === 'flight') {
    locationText = hb.flightLocation
    weekText = hb.flightWeek
    guestsText = hb.flightGuests
  } else if (
    restPath.startsWith('/oteller') ||
    restPath.startsWith('/tatil-evleri') ||
    restPath.startsWith('/yat-kiralama')
  ) {
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
      onTouchEnd={(e) => openModalFromTouch(e, openModal)}
      className="relative flex w-full cursor-pointer touch-manipulation items-center rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 pe-4 shadow-sm hover:border-neutral-300 dark:border-neutral-600 dark:bg-neutral-900 dark:hover:border-neutral-500 sm:px-4 sm:py-2 sm:pe-11"
    >
      <HugeiconsIcon icon={Search01Icon} size={18} color="currentColor" strokeWidth={1.75} className="shrink-0 text-primary-600 dark:text-primary-400" />
      <div className="ms-2.5 min-w-0 flex-1 overflow-hidden text-start sm:ms-3">
        <span className="block truncate text-xs/4 font-semibold text-neutral-800 dark:text-neutral-100 sm:text-sm/5">{locationText}</span>
        <span className="mt-0.5 block truncate text-[11px]/3.5 font-normal text-neutral-500 dark:text-neutral-400 sm:text-xs/4">
          {weekText}
          {guestsText ? ` • ${guestsText}` : ''}
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
