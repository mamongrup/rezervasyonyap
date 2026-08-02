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
  available: 'font-medium text-neutral-900 dark:text-neutral-100',
  blocked:
    'font-medium text-neutral-300 line-through decoration-neutral-300 decoration-1 dark:text-neutral-500 dark:decoration-neutral-500',
  turnover: 'font-medium text-neutral-900 dark:text-neutral-100',
  checkout: 'font-semibold text-neutral-900 dark:text-white',
  checkin: 'font-semibold text-neutral-900 dark:text-white',
  option: 'font-medium ring-2 ring-amber-400/90 bg-amber-50/80 dark:bg-amber-950/30',
  promo: 'font-medium ring-2 ring-emerald-500/80 bg-emerald-50/90 dark:bg-emerald-950/35',
}

/**
 * Temaya uygun dolu yarım — rose (rezerve), çapraz üçgen.
 * checkout: sabah dolu (sol-üst üçgen) → öğleden sonra giriş açık
 * checkin: öğleden sonra dolu (sağ-alt üçgen) → öğlene kadar çıkış açık
 */
export function HalfDayBookedFill({
  kind,
  className,
}: {
  kind: 'checkout' | 'checkin'
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={clsx('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      <span
        className="absolute inset-0 bg-rose-500 dark:bg-rose-600"
        style={{
          clipPath:
            kind === 'checkout'
              ? 'polygon(0 0, 100% 0, 0 100%)'
              : 'polygon(100% 0, 100% 100%, 0 100%)',
        }}
      />
      {/* Çapraz ayırıcı çizgi — öğleden önce / sonra sınırı */}
      <span
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom right, transparent calc(50% - 1.25px), rgb(255 255 255 / 0.95) calc(50% - 0.5px), rgb(255 255 255 / 0.95) calc(50% + 0.5px), transparent calc(50% + 1.25px))',
        }}
      />
      <span
        className="absolute inset-0 opacity-40 dark:opacity-50"
        style={{
          background:
            'linear-gradient(to bottom right, transparent calc(50% - 2px), rgb(127 29 29 / 0.35) 50%, transparent calc(50% + 2px))',
        }}
      />
    </span>
  )
}

/** Legend / örnek kutu — kare çapraz yarım gün */
export function HalfDayLegendSwatch({ kind }: { kind: 'checkout' | 'checkin' }) {
  return (
    <span
      aria-hidden
      className="relative inline-block size-4 shrink-0 overflow-hidden rounded-sm border border-neutral-200 bg-white shadow-sm dark:border-neutral-600 dark:bg-neutral-900"
    >
      <HalfDayBookedFill kind={kind} />
    </span>
  )
}

const DatePickerCustomDay: FC<Props> = ({ dayOfMonth, visualStatus = 'available' }) => {
  const fullyBlocked = visualStatus === 'blocked'
  const statusCls = STATUS_CLASS[visualStatus] ?? STATUS_CLASS.available
  const halfKind =
    visualStatus === 'checkout' || visualStatus === 'checkin' ? visualStatus : null

  return (
    <span
      className={clsx(
        'react-datepicker__day_span relative inline-flex w-full items-center justify-center overflow-hidden',
        halfKind ? 'rounded-md' : 'rounded-md',
        statusCls,
        fullyBlocked && 'pointer-events-none',
        halfKind && 'bg-white dark:bg-neutral-900',
      )}
    >
      {halfKind ? <HalfDayBookedFill kind={halfKind} className="rounded-md" /> : null}
      <span
        className={clsx(
          'relative z-[1]',
          halfKind && 'drop-shadow-[0_0_1px_rgba(255,255,255,0.9)]',
        )}
      >
        {dayOfMonth}
      </span>
      {visualStatus === 'turnover' ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-md"
        >
          <span
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to bottom right, transparent calc(50% - 1px), rgb(148 163 184) 50%, transparent calc(50% + 1px))',
            }}
          />
        </span>
      ) : null}
    </span>
  )
}

export default DatePickerCustomDay
