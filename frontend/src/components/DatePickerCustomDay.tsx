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
  /** Müsait / dolu / turnover / opsiyon / fırsat */
  visualStatus?: ListingDayVisualStatus
}

const STATUS_CLASS: Record<ListingDayVisualStatus, string> = {
  available: 'font-normal text-neutral-900 dark:text-neutral-100',
  /** Tam gün kapalı (panelden her iki yarım da kapatılmış) */
  blocked:
    'font-normal text-neutral-300 line-through decoration-neutral-300 decoration-1 dark:text-neutral-500 dark:decoration-neutral-500',
  /** Sabah çıkış + öğleden sonra giriş — çapraz bölünmüş gün */
  turnover: 'font-normal text-neutral-900 dark:text-neutral-100',
  option: 'font-normal ring-2 ring-amber-400/90 bg-amber-50/80 dark:bg-amber-950/30',
  promo: 'font-normal ring-2 ring-emerald-500/80 bg-emerald-50/90 dark:bg-emerald-950/35',
}

/**
 * Şablon varsayılanı — sadece gün numarası.
 * Yarım günlerde köşe üçgeni; turnover günlerde çapraz çizgi.
 */
const DatePickerCustomDay: FC<Props> = ({ dayOfMonth, am, pm, visualStatus = 'available' }) => {
  const fullyBlocked = visualStatus === 'blocked'
  const isTurnover = visualStatus === 'turnover'
  const showAm = !fullyBlocked && !isTurnover && am === false
  const showPm = !fullyBlocked && !isTurnover && pm === false
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
      {isTurnover ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-md"
        >
          <span className="absolute top-[7px] left-[-2px] block h-0.5 w-[140%] rotate-45 bg-neutral-300 dark:bg-neutral-500" />
        </span>
      ) : null}
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
