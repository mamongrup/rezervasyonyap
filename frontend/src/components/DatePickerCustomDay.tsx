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

const STATUS_RING: Record<ListingDayVisualStatus, string> = {
  available: '',
  blocked: 'opacity-60',
  option: 'ring-2 ring-amber-400/90 bg-amber-50/80 dark:bg-amber-950/30',
  promo: 'ring-2 ring-emerald-500/80 bg-emerald-50/90 dark:bg-emerald-950/35',
}

/**
 * Şablon varsayılanı — sadece gün numarası.
 * AM/PM bilgisi geldiyse köşe üçgenleriyle yarım-gün doluluk işareti basar.
 */
const DatePickerCustomDay: FC<Props> = ({ dayOfMonth, am, pm, visualStatus = 'available' }) => {
  const showAm = am === false
  const showPm = pm === false
  const ringCls = STATUS_RING[visualStatus] ?? ''

  return (
    <span
      className={clsx(
        'react-datepicker__day_span relative inline-flex w-full items-center justify-center rounded-md',
        ringCls,
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
