import { Divider } from '@/shared/divider'
import {
  yachtCharterSpecsHasGridFields,
  type YachtCharterSpecs,
} from '@/lib/yacht-charter-specs'
import { getMessages } from '@/utils/getT'
import { interpolate } from '@/utils/interpolate'
import clsx from 'clsx'
import { Anchor, Fuel, Gauge, Ruler, Sailboat, Ship, Users } from 'lucide-react'
import { SectionHeading, SectionSubheading } from './components/SectionHeading'

export default function YachtCharterSpecsSection({
  locale,
  specs,
  className,
}: {
  locale: string
  specs: YachtCharterSpecs
  className?: string
}) {
  const ys = getMessages(locale).listing.yachtSpecs ?? {}
  const showGrid = yachtCharterSpecsHasGridFields(specs)
  const showLists = specs.includes.length > 0 || specs.excludes.length > 0
  if (!showGrid && !showLists) return null

  const captainLabel = (() => {
    switch (specs.captainIncluded) {
      case 'yes':
        return ys.captainYes ?? 'Kaptan dahil'
      case 'no':
        return ys.captainNo ?? 'Bareboat (kaptansız)'
      case 'optional':
        return ys.captainOptional ?? 'İsteğe bağlı (+ücret)'
      default:
        return null
    }
  })()

  const items: Array<{ key: string; icon: typeof Ship; label: string; value: string }> = []
  if (specs.yachtType?.trim()) {
    items.push({
      key: 'type',
      icon: Sailboat,
      label: ys.yachtType ?? 'Yat tipi',
      value: specs.yachtType.trim(),
    })
  }
  if (specs.lengthMeters?.trim()) {
    items.push({
      key: 'length',
      icon: Ruler,
      label: ys.length ?? 'Boy',
      value: interpolate(ys.lengthValue ?? '{m} m', { m: specs.lengthMeters.trim() }),
    })
  }
  if (specs.speedKnots?.trim()) {
    items.push({
      key: 'speed',
      icon: Gauge,
      label: ys.speed ?? 'Hız',
      value: interpolate(ys.speedValue ?? '{knots} knot', { knots: specs.speedKnots.trim() }),
    })
  }
  if (specs.cabinCount?.trim()) {
    items.push({
      key: 'cabins',
      icon: Ship,
      label: ys.cabins ?? 'Kabin',
      value: specs.cabinCount.trim(),
    })
  }
  if (specs.bathroomCount?.trim()) {
    items.push({
      key: 'bathrooms',
      icon: Ship,
      label: ys.bathrooms ?? 'Banyo',
      value: specs.bathroomCount.trim(),
    })
  }
  if (specs.passengerCount?.trim()) {
    items.push({
      key: 'passengers',
      icon: Users,
      label: ys.passengers ?? 'Maks. yolcu',
      value: specs.passengerCount.trim(),
    })
  }
  if (captainLabel) {
    items.push({
      key: 'captain',
      icon: Anchor,
      label: ys.captain ?? 'Kaptan',
      value: captainLabel,
    })
  }
  if (specs.fuelPolicy?.trim()) {
    items.push({
      key: 'fuel',
      icon: Fuel,
      label: ys.fuelPolicy ?? 'Yakıt politikası',
      value: specs.fuelPolicy.trim(),
    })
  }
  if (specs.portLat?.trim() && specs.portLng?.trim()) {
    items.push({
      key: 'port',
      icon: Anchor,
      label: ys.port ?? 'Kalkış noktası',
      value: `${specs.portLat.trim()}, ${specs.portLng.trim()}`,
    })
  }

  return (
    <div id="stay-section-yacht-specs" className={clsx('listingSection__wrap scroll-mt-28', className)}>
      <div>
        <SectionHeading>{ys.title ?? 'Teknik özellikler'}</SectionHeading>
        <SectionSubheading>
          {ys.subtitle ?? 'Yat tipi, kapasite ve charter koşulları'}
        </SectionSubheading>
      </div>
      <Divider className="w-14!" />
      {showGrid ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.key}
                className="flex items-start gap-3 rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800/40"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300">
                  <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    {item.label}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-neutral-900 dark:text-white">{item.value}</p>
                </div>
              </div>
            )
          })}
        </div>
      ) : null}
      {showLists ? (
        <div
          className={clsx(
            'grid gap-6 md:grid-cols-2',
            showGrid && 'mt-6 border-t border-neutral-100 pt-6 dark:border-neutral-800',
          )}
        >
          {specs.includes.length > 0 ? (
            <div>
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                {ys.includesTitle ?? 'Fiyata dahil'}
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
                {specs.includes.map((line, i) => (
                  <li key={`inc-${i}-${line}`} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {specs.excludes.length > 0 ? (
            <div>
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                {ys.excludesTitle ?? 'Dahil değil'}
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
                {specs.excludes.map((line, i) => (
                  <li key={`exc-${i}-${line}`} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
