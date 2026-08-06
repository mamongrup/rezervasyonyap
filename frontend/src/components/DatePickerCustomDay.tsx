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

/** Tam dolu / yarım dolu kapalı taraf — aynı nötr gri (kafa karışıklığı olmasın) */
const BOOKED_FILL_CLASS = 'bg-neutral-200 dark:bg-neutral-700'

const STATUS_CLASS: Record<ListingDayVisualStatus, string> = {
  available: 'font-medium text-neutral-900 dark:text-neutral-100',
  blocked: clsx(
    'font-medium text-neutral-400 line-through decoration-neutral-400 decoration-1',
    'dark:text-neutral-500 dark:decoration-neutral-500',
    BOOKED_FILL_CLASS,
  ),
  turnover: 'font-medium text-neutral-900 dark:text-neutral-100',
  // Açık yarım = müsait günle aynı metin rengi; kapalı yarım fill ile gösterilir
  checkout: 'font-medium text-neutral-900 dark:text-neutral-100',
  checkin: 'font-medium text-neutral-900 dark:text-neutral-100',
  option: 'font-medium ring-2 ring-amber-400/90 bg-amber-50/80 dark:bg-amber-950/30',
  promo: 'font-medium ring-2 ring-emerald-500/80 bg-emerald-50/90 dark:bg-emerald-950/35',
}

/**
 * Dolu yarım — tam dolu günlerle aynı gri, çapraz üçgen.
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
        className={clsx('absolute inset-0', BOOKED_FILL_CLASS)}
        style={{
          clipPath:
            kind === 'checkout'
              ? 'polygon(0 0, 100% 0, 0 100%)'
              : 'polygon(100% 0, 100% 100%, 0 100%)',
        }}
      />
      {/* Çapraz ayırıcı — açık (beyaz) / kapalı (gri) sınırı */}
      <span
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom right, transparent calc(50% - 1px), rgb(163 163 163 / 0.85) 50%, transparent calc(50% + 1px))',
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
        'react-datepicker__day_span relative inline-flex w-full items-center justify-center overflow-hidden rounded-md',
        statusCls,
        fullyBlocked && 'pointer-events-none',
        // Açık yarım = tam müsait günle aynı zemin
        halfKind && 'bg-white dark:bg-neutral-900',
        // Turnover: iki yarım da kapalı → tam dolu ile aynı zemin + çapraz çizgi
        visualStatus === 'turnover' && BOOKED_FILL_CLASS,
      )}
    >
      {halfKind ? <HalfDayBookedFill kind={halfKind} className="rounded-md" /> : null}
      <span className="relative z-[1]">{dayOfMonth}</span>
      {visualStatus === 'turnover' ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-md"
        >
          <span
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to bottom right, transparent calc(50% - 1px), rgb(115 115 115 / 0.9) 50%, transparent calc(50% + 1px))',
            }}
          />
        </span>
      ) : null}
    </span>
  )
}

export default DatePickerCustomDay
