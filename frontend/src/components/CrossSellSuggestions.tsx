'use client'

import { categoryLabelTr } from '@/lib/catalog-category-ui'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { pathForCrossSellOffer } from '@/lib/cross-sell-storefront-paths'
import { fetchPublicCrossSellSuggestions, type CrossSellRule } from '@/lib/travel-api'
import { Link } from '@/shared/link'
import clsx from 'clsx'
import {
  Building2,
  Bus,
  Car,
  ChevronRight,
  Compass,
  FileText,
  Home,
  Map,
  Plane,
  Ship,
  Sparkles,
  Ticket,
  type LucideIcon,
} from 'lucide-react'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

const OFFER_ICON: Record<string, LucideIcon> = {
  holiday_home: Home,
  hotel: Building2,
  flight: Plane,
  car_rental: Car,
  transfer: Bus,
  activity: Compass,
  tour: Map,
  yacht_charter: Ship,
  ferry: Ship,
  cruise: Ship,
  event: Ticket,
  visa: FileText,
}

/** İkon rozeti — hafif renk vurgusu */
const OFFER_ACCENT: Record<string, string> = {
  holiday_home:
    'bg-emerald-50 text-emerald-600 ring-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900/60',
  hotel:
    'bg-blue-50 text-blue-600 ring-blue-100 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-900/60',
  flight:
    'bg-sky-50 text-sky-600 ring-sky-100 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-900/60',
  car_rental:
    'bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-900/60',
  transfer:
    'bg-violet-50 text-violet-600 ring-violet-100 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-900/60',
  activity:
    'bg-rose-50 text-rose-600 ring-rose-100 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-900/60',
  tour:
    'bg-orange-50 text-orange-600 ring-orange-100 dark:bg-orange-950/50 dark:text-orange-300 dark:ring-orange-900/60',
  yacht_charter:
    'bg-cyan-50 text-cyan-600 ring-cyan-100 dark:bg-cyan-950/50 dark:text-cyan-300 dark:ring-cyan-900/60',
  ferry:
    'bg-teal-50 text-teal-600 ring-teal-100 dark:bg-teal-950/50 dark:text-teal-300 dark:ring-teal-900/60',
  cruise:
    'bg-indigo-50 text-indigo-600 ring-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300 dark:ring-indigo-900/60',
  event:
    'bg-fuchsia-50 text-fuchsia-600 ring-fuchsia-100 dark:bg-fuchsia-950/50 dark:text-fuchsia-300 dark:ring-fuchsia-900/60',
  visa:
    'bg-neutral-100 text-neutral-600 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:ring-neutral-700',
}

const DEFAULT_ACCENT =
  'bg-primary-50 text-primary-600 ring-primary-100 dark:bg-primary-950/50 dark:text-primary-300 dark:ring-primary-900/60'

/** `cross.msg.*` yoksa kısa TR varsayılan */
const FALLBACK_MSG: Record<string, string> = {
  'cross.from_stay.flight': 'Uçuş ekleyin',
  'cross.from_stay.car': 'Araç kiralayın',
  'cross.from_stay.transfer': 'Transfer ayarlayın',
  'cross.from_stay.activity': 'Yakındaki aktiviteler',
  'cross.from_stay.tour': 'Günübirlik turlar',
  'cross.from_hotel.flight': 'Uçuş ekleyin',
  'cross.from_hotel.car': 'Araç kiralayın',
  'cross.from_hotel.transfer': 'Transfer',
  'cross.from_hotel.activity': 'Aktiviteler',
  'cross.from_flight.stay': 'Konaklama seçin',
  'cross.from_flight.hotel': 'Otel rezervasyonu',
  'cross.from_flight.car': 'Araç kiralayın',
  'cross.from_flight.transfer': 'Havaalanı transferi',
  'cross.from_flight.activity': 'Aktiviteler',
  'cross.from_car.stay': 'Konaklama',
  'cross.from_car.hotel': 'Otel',
  'cross.from_car.flight': 'Uçuş',
  'cross.from_car.transfer': 'Transfer',
  'cross.from_car.activity': 'Aktiviteler',
  'cross.from_transfer.stay': 'Konaklama',
  'cross.from_transfer.hotel': 'Otel',
  'cross.from_transfer.flight': 'Uçuş',
  'cross.from_transfer.car': 'Araç',
  'cross.from_transfer.activity': 'Aktiviteler',
  'cross.from_activity.stay': 'Konaklama',
  'cross.from_activity.hotel': 'Otel',
  'cross.from_activity.flight': 'Uçuş',
  'cross.from_activity.transfer': 'Transfer',
  'cross.from_activity.car': 'Araç',
  'cross.from_tour.stay': 'Konaklama',
  'cross.from_tour.flight': 'Uçuş',
  'cross.from_tour.transfer': 'Transfer',
  'cross.from_tour.car': 'Araç',
  'cross.from_yacht.flight': 'Uçuş',
  'cross.from_yacht.transfer': 'Transfer',
  'cross.from_yacht.car': 'Araç',
  'cross.from_yacht.activity': 'Aktiviteler',
  'cross.from_yacht.stay': 'Konaklama',
  'cross.from_ferry.stay': 'Konaklama',
  'cross.from_ferry.car': 'Araç',
  'cross.from_ferry.transfer': 'Transfer',
  'cross.from_cruise.flight': 'Uçuş',
  'cross.from_cruise.hotel': 'Otel',
  'cross.from_cruise.transfer': 'Transfer',
}

const OFFER_EN: Record<string, string> = {
  holiday_home: 'Holiday rental',
  hotel: 'Hotel',
  flight: 'Flights',
  car_rental: 'Car rental',
  transfer: 'Transfer',
  activity: 'Activities',
  tour: 'Tours',
  yacht_charter: 'Yacht charter',
  ferry: 'Ferry',
  cruise: 'Cruise',
  event: 'Events',
  visa: 'Visa',
}

function labelForRule(r: CrossSellRule, locale: string): string {
  const key = r.message_key?.trim()
  const tr = locale.toLowerCase().startsWith('tr')
  if (key && FALLBACK_MSG[key] && tr) return FALLBACK_MSG[key]
  if (key && tr) return key
  const en = OFFER_EN[r.offer_category_code] ?? r.offer_category_code
  return tr ? categoryLabelTr(r.offer_category_code) : en
}

type Props = {
  /** `product_categories.code` — örn. holiday_home, flight */
  triggerCategory: string
  className?: string
  title?: string
}

/**
 * Tetikleyen ürün tipine göre çok yönlü öneri şeridi.
 * Kurallar `cross_sell_rules` tablosunda; yön tamamen satırlarla tanımlanır (A→B ve B→A ayrı kayıt).
 */
export function CrossSellSuggestions({ triggerCategory, className, title }: Props) {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const vitrinPath = useVitrinHref()
  const [rules, setRules] = useState<CrossSellRule[]>([])
  const [err, setErr] = useState<string | null>(null)

  const tc = useMemo(() => triggerCategory.trim(), [triggerCategory])

  useEffect(() => {
    if (!tc) {
      setRules([])
      return
    }
    let cancelled = false
    void fetchPublicCrossSellSuggestions(tc)
      .then((r) => {
        if (!cancelled) {
          setRules(Array.isArray(r.rules) ? r.rules : [])
          setErr(null)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRules([])
          setErr('load_failed')
        }
      })
    return () => {
      cancelled = true
    }
  }, [tc])

  if (!tc || rules.length === 0) return null

  const heading =
    title ??
    (locale.toLowerCase().startsWith('tr')
      ? 'Birlikte düşünülebilecekler'
      : 'You may also need')

  return (
    <section
      className={clsx(
        'rounded-2xl border border-neutral-200 bg-neutral-50/80 p-4 dark:border-neutral-700 dark:bg-neutral-900/50',
        className,
      )}
      aria-label={heading}
    >
      <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{heading}</h3>
      {err ? (
        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">{err}</p>
      ) : (
        <ul className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {rules.map((r) => {
            const href = vitrinPath(pathForCrossSellOffer(r.offer_category_code))
            const label = labelForRule(r, locale)
            const code = r.offer_category_code
            const Icon = OFFER_ICON[code] ?? Sparkles
            const accent = OFFER_ACCENT[code] ?? DEFAULT_ACCENT
            const discount =
              r.discount_percent != null && r.discount_percent !== ''
                ? r.discount_percent
                : null
            return (
              <li key={r.id}>
                <Link
                  href={href}
                  className="group flex items-center gap-3 rounded-xl border border-neutral-200/90 bg-white px-3 py-2.5 shadow-sm transition hover:border-primary-300 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-950 dark:hover:border-primary-700"
                >
                  <span
                    className={clsx(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1',
                      accent,
                    )}
                  >
                    <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold leading-tight text-neutral-900 dark:text-neutral-100">
                      {label}
                    </span>
                    {discount ? (
                      <span className="mt-0.5 block text-[11px] font-bold text-rose-600 dark:text-rose-400">
                        {locale.toLowerCase().startsWith('tr')
                          ? `%${discount} indirim`
                          : `Save ${discount}%`}
                      </span>
                    ) : null}
                  </span>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-neutral-300 transition group-hover:translate-x-0.5 group-hover:text-primary-500 dark:text-neutral-600"
                    aria-hidden
                  />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
