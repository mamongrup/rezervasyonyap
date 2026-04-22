import { Divider } from '@/shared/divider'
import { getMessages } from '@/utils/getT'
import { interpolate } from '@/utils/interpolate'
import clsx from 'clsx'
import {
  BadgeCheck,
  BedDouble,
  Clock,
  Coffee,
  CreditCard,
  MapPin,
  Star,
} from 'lucide-react'
import { SectionHeading, SectionSubheading } from './components/SectionHeading'

/** Booking.com'un "Property info at a glance" / ETStur "Otel Bilgileri" kutusunun
 *  mevcut tasarım temasına uyarlanmış hali. Otel için bir bakışta görülmek istenen
 *  hızlı bilgileri (check-in/out, yıldız, oda tipi sayısı, kahvaltı, ön ödeme, konum)
 *  kompakt bir grid'de toplar. Mevcut üslup (listingSection__wrap, SectionHeading,
 *  Divider, rounded kartlar) bozulmadan kullanılır.
 *
 *  Sadece `vertical === 'hotel'` için çağrılır → yat ve tatil evi dokunulmaz.
 */
export type HotelPropertyInfoItem = {
  /** Doldurulan alanlar gösterilir; null/undefined olanlar otomatik gizlenir. */
  checkInLine?: string | null
  checkOutLine?: string | null
  starRating?: number | null
  roomTypeCount?: number | null
  hasBreakfast?: boolean | null
  /** "%25" gibi formatlanmış metin */
  prepaymentLine?: string | null
  city?: string | null
  regionLabel?: string | null
}

export default function HotelPropertyInfoGrid({
  locale,
  source,
  className,
}: {
  locale: string
  source: HotelPropertyInfoItem
  className?: string
}) {
  const messages = getMessages(locale)
  const pi = messages.listing.propertyInfo ?? {}

  const items: Array<{
    key: string
    icon: typeof Clock
    label: string
    value: string
  }> = []

  if (source.checkInLine?.trim()) {
    items.push({
      key: 'checkIn',
      icon: Clock,
      label: pi.checkInLabel ?? 'Giriş',
      value: source.checkInLine.trim(),
    })
  }
  if (source.checkOutLine?.trim()) {
    items.push({
      key: 'checkOut',
      icon: Clock,
      label: pi.checkOutLabel ?? 'Çıkış',
      value: source.checkOutLine.trim(),
    })
  }
  if (typeof source.starRating === 'number' && source.starRating > 0) {
    items.push({
      key: 'stars',
      icon: Star,
      label: pi.starsLabel ?? 'Sınıf',
      value: interpolate(pi.starsValue ?? '{count} yıldız', {
        count: String(source.starRating),
      }),
    })
  }
  if (
    typeof source.roomTypeCount === 'number' &&
    source.roomTypeCount > 0
  ) {
    items.push({
      key: 'rooms',
      icon: BedDouble,
      label: pi.roomTypesLabel ?? 'Oda tipi',
      value: interpolate(pi.roomTypesValue ?? '{count} farklı oda tipi', {
        count: String(source.roomTypeCount),
      }),
    })
  }
  if (source.hasBreakfast === true) {
    items.push({
      key: 'breakfast',
      icon: Coffee,
      label: pi.breakfastLabel ?? 'Kahvaltı',
      value: pi.breakfastYes ?? 'Kahvaltı seçenekleri mevcut',
    })
  }
  if (source.prepaymentLine?.trim()) {
    items.push({
      key: 'prepayment',
      icon: CreditCard,
      label: pi.prepaymentLabel ?? 'Ödeme',
      value: source.prepaymentLine.trim(),
    })
  }
  if (source.city?.trim() || source.regionLabel?.trim()) {
    items.push({
      key: 'location',
      icon: MapPin,
      label: pi.locationLabel ?? 'Konum',
      value: [source.regionLabel, source.city]
        .filter((s): s is string => Boolean(s?.trim()))
        .join(' · ') || '—',
    })
  }

  if (items.length === 0) return null

  return (
    <div className={clsx('listingSection__wrap', className)}>
      <div>
        <SectionHeading>{pi.title ?? 'Otel bilgileri'}</SectionHeading>
        <SectionSubheading>
          {pi.subtitle ?? 'Bir bakışta bu otel hakkında bilmeniz gerekenler.'}
        </SectionSubheading>
      </div>
      <Divider className="w-14!" />
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => {
          const Icon = it.icon
          return (
            <li
              key={it.key}
              className="flex items-start gap-3 rounded-2xl border border-neutral-100 bg-neutral-50/60 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-800/40"
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300">
                <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              </span>
              <div className="flex min-w-0 flex-col">
                <span className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  {it.label}
                  {it.key === 'breakfast' && source.hasBreakfast === true ? (
                    <BadgeCheck
                      className="h-3 w-3 text-green-500"
                      strokeWidth={2}
                      aria-hidden
                    />
                  ) : null}
                </span>
                <span className="truncate text-sm font-medium text-neutral-900 dark:text-white">
                  {it.value}
                </span>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
