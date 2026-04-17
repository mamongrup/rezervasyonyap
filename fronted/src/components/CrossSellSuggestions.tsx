'use client'

import { categoryLabelTr } from '@/lib/catalog-category-ui'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { pathForCrossSellOffer } from '@/lib/cross-sell-storefront-paths'
import { fetchPublicCrossSellSuggestions, type CrossSellRule } from '@/lib/travel-api'
import { Link } from '@/shared/link'
import clsx from 'clsx'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

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
        <ul className="mt-3 flex flex-wrap gap-2">
          {rules.map((r) => {
            const href = vitrinPath(pathForCrossSellOffer(r.offer_category_code))
            const label = labelForRule(r, locale)
            const discount =
              r.discount_percent != null && r.discount_percent !== ''
                ? ` −%${r.discount_percent}`
                : ''
            return (
              <li key={r.id}>
                <Link
                  href={href}
                  className="inline-flex items-center rounded-full border border-primary-200 bg-white px-3 py-1.5 text-xs font-medium text-primary-800 hover:bg-primary-50 dark:border-primary-800 dark:bg-neutral-950 dark:text-primary-200 dark:hover:bg-primary-950/60"
                >
                  {label}
                  {discount}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
