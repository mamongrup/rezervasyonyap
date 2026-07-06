import { type ListingDayVisualStatus } from '@/lib/listing-availability-day'
import clsx from 'clsx'
import { FC } from 'react'

interface Props {
  dayOfMonth: number
  date?: Date | undefined
  /** Sabah müsait mi (öğleden önce) */
  am?: boolean
  /** Öğleden sonra müsait mi */
  pm?: boolean
  /** Müsait / dolu / turnover / giriş / çıkış / opsiyon / fırsat */
  visualStatus?: ListingDayVisualStatus
}

const STATUS_CLASS: Record<ListingDayVisualStatus, string> = {
  available: 'font-normal text-neutral-900 dark:text-neutral-100',
  blocked:
    'font-normal text-neutral-300 line-through decoration-neutral-300 decoration-1 dark:text-neutral-500 dark:decoration-neutral-500',
  turnover: 'font-normal text-neutral-900 dark:text-neutral-100',
  checkout: 'font-normal text-neutral-900 dark:text-neutral-100',
  checkin: 'font-normal text-neutral-900 dark:text-neutral-100',
  option: 'font-normal ring-2 ring-amber-400/90 bg-amber-50/80 dark:bg-amber-950/30',
  promo: 'font-normal ring-2 ring-emerald-500/80 bg-emerald-50/90 dark:bg-emerald-950/35',
}

const HALF_BG: Record<'checkout' | 'checkin', string> = {
  /** Çıkış — sol alt dolu (sabah dolu) */
  checkout:
    'bg-[linear-gradient(45deg,rgba(148,163,184,0.42)_50%,transparent_50%)] dark:bg-[linear-gradient(45deg,rgba(100,116,139,0.55)_50%,transparent_50%)]',
  /** Giriş — sağ üst dolu (öğleden sonra dolu) */
  checkin:
    'bg-[linear-gradient(225deg,rgba(148,163,184,0.42)_50%,transparent_50%)] dark:bg-[linear-gradient(225deg,rgba(100,116,139,0.55)_50%,transparent_50%)]',
}

const DatePickerCustomDay: FC<Props> = ({ dayOfMonth, visualStatus = 'available' }) => {
  const fullyBlocked = visualStatus === 'blocked'
  const statusCls = STATUS_CLASS[visualStatus] ?? STATUS_CLASS.available
  const halfBg =
    visualStatus === 'checkout' || visualStatus === 'checkin' ? HALF_BG[visualStatus] : undefined

  return (
    <span
      className={clsx(
        'react-datepicker__day_span relative inline-flex w-full items-center justify-center rounded-md',
        statusCls,
        halfBg,
        fullyBlocked && 'pointer-events-none',
      )}
    >
      <span className="relative z-[1]">{dayOfMonth}</span>
      {visualStatus === 'turnover' ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-md"
        >
          <span className="absolute top-[7px] left-[-2px] block h-0.5 w-[140%] rotate-45 bg-neutral-300 dark:bg-neutral-500" />
        </span>
      ) : null}
    </span>
  )
}

export default DatePickerCustomDay
