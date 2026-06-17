import { Divider } from '@/shared/divider'
import {
  yachtCharterSpecsHasGridFields,
  type YachtCharterSpecs,
} from '@/lib/yacht-charter-specs'
import { formatAirConditioningLabel } from '@/lib/yacht-technical-specs-normalize'
import { getMessages } from '@/utils/getT'
import { interpolate } from '@/utils/interpolate'
import clsx from 'clsx'
import {
  Anchor,
  Calendar,
  Fuel,
  Gauge,
  Hash,
  MapPin,
  MoveHorizontal,
  Ruler,
  Sailboat,
  Ship,
  Users,
  Wind,
  Zap,
} from 'lucide-react'
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

  const airLabel = formatAirConditioningLabel(specs.airConditioning, {
    yes: ys.airYes ?? 'Var',
    no: ys.airNo ?? 'Yok',
  })

  const items: Array<{ key: string; icon: typeof Ship; label: string; value: string }> = []
  const push = (key: string, icon: typeof Ship, label: string, value: string | null | undefined) => {
    const v = value?.trim()
    if (!v) return
    items.push({ key, icon, label, value: v })
  }

  push('boatCode', Hash, ys.boatCode ?? 'Tekne kodu', specs.boatCode)
  push('type', Sailboat, ys.yachtType ?? 'Tekne sınıfı', specs.yachtType)
  push('buildYear', Calendar, ys.buildYear ?? 'Yapım yılı', specs.buildYear)
  push('portName', MapPin, ys.portName ?? 'Liman', specs.portName)
  if (specs.lengthMeters?.trim()) {
    items.push({
      key: 'length',
      icon: Ruler,
      label: ys.length ?? 'Boy',
      value: interpolate(ys.lengthValue ?? '{m} m', { m: specs.lengthMeters.trim() }),
    })
  }
  if (specs.beamMeters?.trim()) {
    items.push({
      key: 'beam',
      icon: MoveHorizontal,
      label: ys.beam ?? 'En',
      value: interpolate(ys.beamValue ?? '{m} m', { m: specs.beamMeters.trim() }),
    })
  }
  push('cabins', Ship, ys.cabins ?? 'Kabin', specs.cabinCount)
  push('bathrooms', Ship, ys.bathrooms ?? 'Banyo', specs.bathroomCount)
  push('air', Wind, ys.airConditioning ?? 'Klima', airLabel)
  push('crew', Users, ys.crew ?? 'Personel', specs.crewCount)
  push('passengers', Users, ys.guestCapacity ?? ys.passengers ?? 'Misafir kapasitesi', specs.passengerCount)
  push('generator', Zap, ys.generator ?? 'Jeneratör', specs.generator)
  if (specs.speedKnots?.trim()) {
    items.push({
      key: 'speed',
      icon: Gauge,
      label: ys.speed ?? 'Hız',
      value: interpolate(ys.speedValue ?? '{knots} knot', { knots: specs.speedKnots.trim() }),
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
  push('fuel', Fuel, ys.fuelPolicy ?? 'Yakıt politikası', specs.fuelPolicy)
  if (!specs.portName?.trim() && specs.portLat?.trim() && specs.portLng?.trim()) {
    items.push({
      key: 'portCoords',
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
        <div className="grid gap-4 sm:grid-cols-2">
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
