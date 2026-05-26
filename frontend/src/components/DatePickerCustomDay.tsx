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
  /** Müsait / dolu / opsiyon / fırsat — Villacınız tarzı renkler */
  visualStatus?: ListingDayVisualStatus
}

const STATUS_CLASS: Record<ListingDayVisualStatus, string> = {
  available: 'font-normal text-neutral-900 dark:text-neutral-100',
  /** Airbnb vitrin: soluk gri + üstü çizili, seçilemez */
  blocked:
    'font-normal text-neutral-300 line-through decoration-neutral-300 decoration-1 dark:text-neutral-500 dark:decoration-neutral-500',
  option: 'font-normal ring-2 ring-amber-400/90 bg-amber-50/80 dark:bg-amber-950/30',
  promo: 'font-normal ring-2 ring-emerald-500/80 bg-emerald-50/90 dark:bg-emerald-950/35',
}

/**
 * Şablon varsayılanı — sadece gün numarası.
 * Tam dolu günler Airbnb tarzı (gri + çizgi); yarım günlerde köşe üçgeni.
 */
const DatePickerCustomDay: FC<Props> = ({ dayOfMonth, am, pm, visualStatus = 'available' }) => {
  const fullyBlocked = visualStatus === 'blocked'
  const showAm = !fullyBlocked && am === false
  const showPm = !fullyBlocked && pm === false
  const statusCls = STATUS_CLASS[visualStatus] ?? STATUS_CLASS.available

  return (
    <span
      className={clsx(
        'react-datepicker__day_span relative inline-flex w-full items-center justify-center rounded-md',
        statusCls,
        fullyBlocked && 'pointer-events-none',
      )}
    >
      {dayOfMonth}
      {showAm ? (
        <span
          aria-hidden
          className="pointer-events-none absolute top-0 left-0 h-1.5 w-1.5"
          style={{
            background: 'transparent',
            borderTop: '6px solid rgba(220,38,38,0.85)',
            borderRight: '6px solid transparent',
          }}
        />
      ) : null}
      {showPm ? (
        <span
          aria-hidden
          className="pointer-events-none absolute right-0 bottom-0 h-1.5 w-1.5"
          style={{
            background: 'transparent',
            borderBottom: '6px solid rgba(220,38,38,0.85)',
            borderLeft: '6px solid transparent',
          }}
        />
      ) : null}
    </span>
  )
}

export default DatePickerCustomDay
